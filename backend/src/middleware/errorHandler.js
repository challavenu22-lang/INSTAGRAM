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

  let publicMessage = 'Something went wrong. Please try again.';

  if (statusCode >= 400 && statusCode < 500 && err.message) {
    publicMessage = err.message;
  }

  // Never leak raw Prisma, SQL, or internal database engine errors to client UI
  if (
    publicMessage.includes('prisma.') ||
    publicMessage.includes('PrismaClient') ||
    publicMessage.includes('datasource') ||
    publicMessage.includes('database file') ||
    publicMessage.includes('Validation Error') ||
    publicMessage.includes('invocation:')
  ) {
    publicMessage = (statusCode >= 400 && statusCode < 500)
      ? 'An account with this User ID or email address already exists.'
      : 'Something went wrong. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    error: publicMessage,
    debugInfo: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      name: err.name,
      code: err.code
    } : undefined
  });
};
