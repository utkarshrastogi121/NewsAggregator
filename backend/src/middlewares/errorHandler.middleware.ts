import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../config/logger';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  logger.error({
    message: err.message || 'Unhandled Internal Exception',
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 && !isDevelopment
      ? 'An unexpected error occurred on the server.'
      : err.message,
    ...(isDevelopment && { stack: err.stack }),
  });
};