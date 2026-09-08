import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Application Error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || err.status || (typeof err.status === 'number' ? err.status : 500);
  const publicMessage = (statusCode >= 400 && statusCode < 500 && err.message)
    ? err.message
    : 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: publicMessage
  });
};
