import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './error-handler.js';

function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new AppError(400, formatZodErrors(result.error));
    }

    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      throw new AppError(400, formatZodErrors(result.error));
    }

    // Express 5: req.query is a read-only getter, override with validated data
    Object.defineProperty(req, 'query', { value: result.data, writable: true });
    next();
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      throw new AppError(400, formatZodErrors(result.error));
    }

    // Express 5: req.params is a read-only getter, override with validated data
    Object.defineProperty(req, 'params', { value: result.data, writable: true });
    next();
  };
}
