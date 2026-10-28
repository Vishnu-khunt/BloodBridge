import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => {
          const field = e.path.join('.');
          return {
            field,
            message: e.message,
          };
        });

        let primaryMessage = 'Validation failed';
        if (details.length > 0) {
          const first = details[0];
          if (first.message && first.message !== 'Required') {
            primaryMessage = first.message;
          } else if (first.field) {
            primaryMessage = `Please provide a valid ${first.field.replace(/_/g, ' ')}.`;
          }
        }

        res.status(400).json({
          error: 'Validation Error',
          message: primaryMessage,
          details,
        });
        return;
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          error: 'Validation Error',
          message: details.length > 0 ? details[0].message : 'Invalid query parameters',
          details,
        });
        return;
      }
      next(err);
    }
  };
}
