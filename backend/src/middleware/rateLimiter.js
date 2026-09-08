import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 download requests per minute
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    error: 'Download rate limit exceeded. Please wait a minute before requesting another download.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
