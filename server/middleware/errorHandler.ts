import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    logger.warn({ errors, path: req.path }, "Validation error");
    return res.status(400).json({
      message: "Validation error",
      errors,
    });
  }

  // Application errors
  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, message: err.message, path: req.path },
      "Application error"
    );
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // Unknown errors
  logger.error(
    {
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method,
    },
    "Unhandled error"
  );

  // Don't leak internal error details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  return res.status(500).json({
    message,
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







