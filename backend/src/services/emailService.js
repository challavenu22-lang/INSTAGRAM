import { logger } from '../utils/logger.js';

export const emailService = {
  sendVerificationEmail: async (email, rawToken) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

    // Development fallback logger so project runs zero-config out of the box
    logger.info('================ EMAIL NOTIFICATION ================');
    logger.info(`To: ${email}`);
    logger.info(`Subject: Verify Your Email - Video Downloader`);
    logger.info(`Verification Link: ${verifyLink}`);
    logger.info('====================================================');

    return true;
  },

  sendPasswordResetEmail: async (email, rawToken) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    logger.info('================ EMAIL NOTIFICATION ================');
    logger.info(`To: ${email}`);
    logger.info(`Subject: Password Reset Request - Video Downloader`);
    logger.info(`Reset Password Link: ${resetLink}`);
    logger.info('====================================================');

    return true;
  }
};
