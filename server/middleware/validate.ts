import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      parsedBody?: any;
      parsedQuery?: any;
    }
  }
}

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body || {});
      req.parsedBody = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn({ issues: err.errors, body: req.body }, 'Validation failed for request body');
        console.error('[Validation Error]', JSON.stringify(err.errors, null, 2));
        return res.status(400).json({ message: 'Invalid request', issues: err.errors });
      }
      next(err as any);
    }
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query || {});
      req.parsedQuery = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn({ issues: err.errors }, 'Validation failed for query');
        return res.status(400).json({ message: 'Invalid query', issues: err.errors });
      }
      next(err as any);
    }
  };
}
