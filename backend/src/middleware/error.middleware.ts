import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.slice(-1)[0]}: ${e.message}`).join('; ');
    res.status(400).json({ success: false, message: messages });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException & { code?: number }).code === 11000) {
    res.status(409).json({ success: false, message: 'A record with this value already exists' });
    return;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  // Unknown — log and hide details
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
