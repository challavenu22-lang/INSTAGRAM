import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const getJwtSecret = () => process.env.JWT_SECRET || 'default-fallback-secret-for-dev-mode-only';

export const generateToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
