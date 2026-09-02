import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  req.id = uuidv4();
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request Handled', {
      requestId: req.id,
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      executionTimeMs: duration
    });
  });

  next();
};
