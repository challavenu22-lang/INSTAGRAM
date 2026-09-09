import { verifyToken, hashToken } from '../utils/jwt.js';
import prisma from '../config/db.js';
import { persistentAccountService } from '../services/persistentAccountService.js';

export const authenticateUser = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token.'
      });
    }

    // Verify token exists in active sessions database
    const tokenHash = hashToken(token);
    let session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            picture: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    });

    if (!session || !session.user) {
      await persistentAccountService.syncLocalWithCloud();
      if (decoded && decoded.userId) {
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          session = await prisma.session.upsert({
            where: { tokenHash },
            create: { userId: user.id, tokenHash, expiresAt },
            update: { expiresAt },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  name: true,
                  picture: true,
                  emailVerified: true,
                  createdAt: true
                }
              }
            }
          });
        }
      }
    }

    if (!session || !session.user || new Date() > session.expiresAt) {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.'
      });
    }

    req.user = session.user;
    req.sessionId = session.id;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      req.user = null;
      return next();
    }

    const tokenHash = hashToken(token);
    let session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            picture: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    });

    if (!session || !session.user) {
      await persistentAccountService.syncLocalWithCloud();
      if (decoded && decoded.userId) {
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          session = await prisma.session.upsert({
            where: { tokenHash },
            create: { userId: user.id, tokenHash, expiresAt },
            update: { expiresAt },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  name: true,
                  picture: true,
                  emailVerified: true,
                  createdAt: true
                }
              }
            }
          });
        }
      }
    }

    if (session && session.user && new Date() <= session.expiresAt) {
      req.user = session.user;
      req.sessionId = session.id;
      req.token = token;
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

