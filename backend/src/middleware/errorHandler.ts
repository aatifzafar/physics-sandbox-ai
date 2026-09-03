import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HTTP_STATUS } from '../utils/constants.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((i) => i.message).join(', '),
        details: err.issues,
      },
    });
    return;
  }

  const statusCode = err.statusCode || HTTP_STATUS.BAD_REQUEST;
  const message = err.message || 'An unexpected error occurred during simulation processing.';
  const code = err.code || 'SIMULATION_ERROR';

  // Log server-side diagnostic details without leaking secrets
  console.error(`[Error] [${code}] ${message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: err.details }),
    },
  });
}
