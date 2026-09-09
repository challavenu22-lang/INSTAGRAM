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

    const tokenHash = hashToken(token);

    // 1. Check local Prisma session
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

    // 2. If not found locally, sync with cloud store and retry
    if (!session || !session.user) {
      await persistentAccountService.syncLocalWithCloud();

      session = await prisma.session.findUnique({
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
    }

    // 3. Fallback: Check persistent cloud store directly
    if (!session || !session.user) {
      const store = await persistentAccountService.fetchCloudStore(true);
      const cloudSession = store.sessions?.[tokenHash];
      const cloudUser = cloudSession ? store.users?.[cloudSession.userId] : null;

      if (cloudUser && cloudSession && new Date() <= new Date(cloudSession.expiresAt)) {
        // Restore user & session to local Prisma
        const cleanEmail = (cloudUser.email || '').toLowerCase().trim();
        const cleanUsername = (cloudUser.username || '').toLowerCase().trim();
        const cleanName = cloudUser.name || cleanUsername || cleanEmail;

        const dbUser = await prisma.user.upsert({
          where: { id: cloudUser.id },
          create: {
            id: cloudUser.id,
            username: cleanUsername || null,
            email: cleanEmail,
            passwordHash: cloudUser.passwordHash || null,
            name: cleanName,
            picture: cloudUser.picture || null,
            emailVerified: cloudUser.emailVerified !== undefined ? cloudUser.emailVerified : true,
            createdAt: cloudUser.createdAt ? new Date(cloudUser.createdAt) : new Date()
          },
          update: {
            username: cleanUsername || undefined,
            email: cleanEmail || undefined,
            name: cleanName || undefined
          }
        });

        const expiresAt = new Date(cloudSession.expiresAt);
        session = await prisma.session.upsert({
          where: { tokenHash },
          create: {
            id: cloudSession.id || tokenHash.substring(0, 32),
            userId: dbUser.id,
            tokenHash,
            expiresAt
          },
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

    if (!session || !session.user || new Date() > new Date(session.expiresAt)) {
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

      session = await prisma.session.findUnique({
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
    }

    if (session && session.user && new Date() <= new Date(session.expiresAt)) {
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
