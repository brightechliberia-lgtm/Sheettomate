import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';
import { isProduction } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(err.message, { statusCode: err.statusCode, code: err.code });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 50MB)' : err.message;
    return res.status(400).json({ success: false, message });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }

  logger.error('Unhandled error', { err });
  void prisma.errorEvent
    .create({
      data: {
        source: 'api',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
      },
    })
    .catch(() => undefined);
  return res.status(500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err instanceof Error ? err.message : 'Unknown error',
  });
}
