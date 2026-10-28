import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  const response: Record<string, any> = {
    error: status >= 500 ? 'Internal Server Error' : (err.name || 'Request Failed'),
    message: status >= 500 && env.NODE_ENV === 'production' ? 'An unexpected error occurred' : message,
  };

  if (err.details) {
    response.details = err.details;
  }

  if (env.NODE_ENV !== 'production' && err.stack && status >= 500) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}
