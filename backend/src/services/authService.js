import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateToken, hashToken } from '../utils/jwt.js';
import { emailService } from './emailService.js';
import { TOKEN_EXPIRATION } from '../config/constants.js';

export const authService = {
  register: async (name, usernameInput, emailInput, password) => {
    const cleanEmail = emailInput ? emailInput.toLowerCase().trim() : '';
    const cleanUsername = usernameInput ? usernameInput.toLowerCase().trim() : '';
    const cleanName = name ? name.trim() : cleanUsername;

    const existingUsername = await prisma.user.findFirst({
      where: { username: cleanUsername }
    });
    if (existingUsername) {
      throw { status: 400, message: 'An account with this User ID already exists.' };
    }

    const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    const emailVerified = !requireVerification;

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        name: cleanName,
        emailVerified,
      }
    });

    if (requireVerification) {
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

      await emailService.sendVerificationEmail(cleanEmail, rawToken);

      return {
        message: 'Account created successfully! Please check your email for the verification link.',
        userId: user.id,
        verificationToken: rawToken,
        emailVerified: false
      };
    }

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

    const displayName = user.name || user.username || '';
    const displayUsername = user.username || '';

    return {
      message: 'Account created successfully!',
      user: {
        id: user.id,
        name: displayName,
        fullName: displayName,
        userName: displayName,
        username: displayUsername,
        email: user.email,
        picture: user.picture,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      token,
      emailVerified: true
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

  login: async (identifierInput, password) => {
    const cleanIdentifier = identifierInput ? identifierInput.toLowerCase().trim() : '';

    const candidateUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: cleanIdentifier },
          { email: cleanIdentifier }
        ]
      }
    });

    if (!candidateUsers || candidateUsers.length === 0) {
      throw { status: 401, message: 'Account not found with this User Name or email.' };
    }

    let matchingUser = null;
    for (const candidate of candidateUsers) {
      if (candidate.passwordHash) {
        const valid = await verifyPassword(password, candidate.passwordHash);
        if (valid) {
          matchingUser = candidate;
          break;
        }
      }
    }

    if (!matchingUser) {
      throw { status: 401, message: 'Incorrect password. Please try again.' };
    }

    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !matchingUser.emailVerified) {
      throw { status: 400, message: 'Please verify your email address before logging in. Check your email for the verification link.' };
    }

    const user = matchingUser;

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

    const displayName = user.name || user.username || '';
    const displayUsername = user.username || '';

    return {
      user: {
        id: user.id,
        name: displayName,
        fullName: displayName,
        userName: displayName,
        username: displayUsername,
        email: user.email,
        picture: user.picture,
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
    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const users = await prisma.user.findMany({ where: { email: cleanEmail } });
    if (!users || users.length === 0) {
      // Return generic message for security
      return { message: 'If an account exists with that email, a reset link has been sent.' };
    }

    for (const user of users) {
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

      await emailService.sendPasswordResetEmail(cleanEmail, rawToken);
    }

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
