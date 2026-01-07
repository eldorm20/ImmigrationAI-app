import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type JWTPayload } from "../lib/auth";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { isTokenBlacklisted } from "../lib/redis";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        userId: string;
      };
    }
  }
}

// Extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Authentication middleware
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractToken(req);

    if (!token) {
      logger.warn({ path: req.path, method: req.method }, "Authentication failed: No token provided");
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if token has been blacklisted (user logged out)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      logger.warn({ path: req.path, method: req.method }, "Authentication failed: Token has been revoked");
      return res.status(401).json({ message: "Token has been revoked" });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      logger.warn({ path: req.path, method: req.method }, "Authentication failed: Invalid or expired token");
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Verify user still exists and is active
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      ...payload,
      userId: payload.userId,
    };

    next();
  } catch (error) {
    logger.error({ error }, "Authentication error");
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Role-based access control middleware
export function requireRole(...allowedRoles: ("admin" | "lawyer" | "applicant" | "employer")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const formattedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

    if (!formattedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.userId),
        });
        if (user) {
          req.user = {
            ...payload,
            userId: payload.userId,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
}







