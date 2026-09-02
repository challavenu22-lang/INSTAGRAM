import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled Application Error', {
    message: err.message,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || err.status || 500;
  const publicMessage = statusCode === 500 
    ? 'An unexpected error occurred. Please try again later.' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: publicMessage
  });
};
