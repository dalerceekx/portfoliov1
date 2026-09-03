import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/http';

type Source = 'body' | 'query' | 'params';

/** Server-side schema validation. Client-side checks are UX only. */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === 'body') req.body = parsed;
      else Object.defineProperty(req, source, { value: parsed, writable: true });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of error.issues) {
          const key = issue.path.join('.') || '_';
          if (!fields[key]) fields[key] = issue.message;
        }
        next(AppError.badRequest('Check the highlighted fields.', fields));
        return;
      }
      next(error);
    }
  };
