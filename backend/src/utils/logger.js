// Structured Non-Sensitive Logger

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'secret', 'smtp_password'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
};

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? sanitizeData(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? sanitizeData(meta) : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? sanitizeData(meta) : '');
  }
};
