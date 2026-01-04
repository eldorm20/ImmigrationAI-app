import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { randomUUID } from "crypto";

// Extend Express Request type to include correlation ID and user
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Error codes for i18n-friendly error messages
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
  UPLOAD_ERROR = "UPLOAD_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Correlation ID middleware - adds unique ID to each request
export function correlationId(req: Request, res: Response, next: NextFunction) {
  req.correlationId = randomUUID();
  res.setHeader("X-Correlation-ID", req.correlationId);
  next();
}

// Enhanced error handler with correlation ID and error codes
export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = req.correlationId || randomUUID();

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    logger.warn({
      correlationId,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      errors
    }, "Validation error");

    return res.status(400).json({
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: "Validation error",
      errors,
      correlationId,
    });
  }

  // Application errors
  if (err instanceof AppError) {
    logger.warn(
      {
        correlationId,
        userId: req.user?.id,
        statusCode: err.statusCode,
        errorCode: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
      },
      "Application error"
    );

    return res.status(err.statusCode).json({
      errorCode: err.code,
      message: process.env.NODE_ENV === "production" ? undefined : err.message,
      correlationId,
    });
  }

  // Unknown errors - log full details but return safe message
  logger.error(
    {
      correlationId,
      userId: req.user?.id,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      errorType: err.constructor.name,
      query: req.query,
      body: process.env.NODE_ENV !== "production" ? req.body : undefined,
    },
    `Unhandled ${err.constructor.name}: ${err.message}`
  );

  // Return i18n-friendly error code instead of raw message in production
  return res.status(500).json({
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
    correlationId,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

// Async error wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}



