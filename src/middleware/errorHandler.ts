import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, type ApiErrorBody } from '../shared/errors';
import { logger } from '../shared/logger';

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ApiErrorBody = {
    success: false,
    code: 'NOT_FOUND',
    message: 'Route not found',
  };
  res.status(404).json(body);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: err.flatten(),
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    };
    res.status(err.status).json(body);
    return;
  }

  logger.error({ err }, 'unhandled error');
  const body: ApiErrorBody = {
    success: false,
    code: 'INTERNAL',
    message: 'Something went wrong',
  };
  res.status(500).json(body);
}
