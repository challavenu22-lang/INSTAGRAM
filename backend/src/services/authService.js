import crypto from 'crypto';
import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateToken, hashToken } from '../utils/jwt.js';
import { emailService } from './emailService.js';
import { TOKEN_EXPIRATION } from '../config/constants.js';

export const authService = {
  register: async (email, password) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw { status: 400, message: 'An account with this email address already exists.' };
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerified: false,
      }
    });

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await emailService.sendVerificationEmail(email, rawToken);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id
    };
  },

  verifyEmail: async (rawToken) => {
    const tokenHash = hashToken(rawToken);
    const verification = await prisma.emailVerification.findUnique({
      where: { tokenHash }
    });

    if (!verification || new Date() > verification.expiresAt) {
      throw { status: 400, message: 'Invalid or expired email verification token.' };
    }

    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true }
    });

    await prisma.emailVerification.delete({ where: { id: verification.id } });

    return { message: 'Email verified successfully! You can now log in.' };
  },

  login: async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw { status: 401, message: 'Invalid email or password.' };
    }

    // Create session token
    const token = generateToken({ userId: user.id, email: user.email });
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.SESSION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      token
    };
  },

  logout: async (token) => {
    if (!token) return;
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  },

  logoutAll: async (userId) => {
    await prisma.session.deleteMany({ where: { userId } });
  },

  forgotPassword: async (email) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return generic message for security
      return { message: 'If an account exists with that email, a reset link has been sent.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.PASSWORD_RESET_HOURS * 60 * 60 * 1000);

    // Delete existing reset tokens for user
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await emailService.sendPasswordResetEmail(email, rawToken);

    return { message: 'If an account exists with that email, a reset link has been sent.' };
  },

  resetPassword: async (rawToken, newPassword) => {
    const tokenHash = hashToken(rawToken);
    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash }
    });

    if (!reset || new Date() > reset.expiresAt) {
      throw { status: 400, message: 'Invalid or expired password reset token.' };
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash }
    });

    // Invalidate all active user sessions for security
    await prisma.session.deleteMany({ where: { userId: reset.userId } });
    await prisma.passwordReset.delete({ where: { id: reset.id } });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
};
