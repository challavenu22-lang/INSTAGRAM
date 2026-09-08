import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Application Error', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle Prisma unique constraint violations (P2002)
  if (err.code === 'P2002') {
    const targetStr = JSON.stringify(err.meta?.target || '');
    let message = 'An account with these credentials already exists.';
    if (targetStr.includes('username')) {
      message = 'An account with this User ID already exists.';
    } else if (targetStr.includes('email')) {
      message = 'An account with this email address already exists.';
    }
    return res.status(400).json({
      success: false,
      error: message
    });
  }

  const statusCode = err.statusCode || err.status || (typeof err.status === 'number' ? err.status : 500);
  const publicMessage = (statusCode >= 400 && statusCode < 500 && err.message)
    ? err.message
    : 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: publicMessage
  });
};
