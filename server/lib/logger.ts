import pino from "pino";
import type { Request, Response, NextFunction } from "express";

// PII redaction function
function redactPII(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const sensitiveFields = [
    "email",
    "password",
    "hashedPassword",
    "phone",
    "passport",
    "passportNumber",
    "ssn",
    "creditCard",
    "token",
    "accessToken",
    "refreshToken",
  ];

  const redacted = { ...obj };

  for (const key in redacted) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactPII(redacted[key]);
    }
  }

  return redacted;
}

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  serializers: {
    req: (req) => {
      const redacted = redactPII({
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        params: req.params,
      });
      return redacted;
    },
    res: (res) => {
      return {
        statusCode: res.statusCode,
      };
    },
    err: (err) => {
      return {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      };
    },
  },
});

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, "Request completed with error");
    } else {
      logger.info(logData, "Request completed");
    }
  });

  next();
}

// Audit log helper
export async function auditLog(
  userId: string | null,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  metadata: Record<string, any> = {},
  req?: Request
) {
  const { db } = await import("../db");
  const { auditLogs } = await import("@shared/schema");

  const logData = {
    userId: userId || null,
    action,
    resourceType,
    resourceId,
    metadata: redactPII(metadata),
    ipAddress: req?.ip || null,
    userAgent: req?.get("user-agent") || null,
  };

  try {
    await db.insert(auditLogs).values(logData);
    logger.info({ action, userId, resourceType, resourceId }, "Audit log created");
  } catch (error) {
    logger.error({ error, logData }, "Failed to create audit log");
  }
}

