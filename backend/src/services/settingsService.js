import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export const settingsService = {
  getUserSettings: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    return {
      account: user,
      preferences: {
        defaultQuality: '1080p',
        autoDownload: false,
        downloadNotifications: true
      }
    };
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { status: 400, message: 'Current password provided is incorrect.' };
    }

    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { message: 'Password updated successfully!' };
  },

  deleteAccount: async (userId, password) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw { status: 400, message: 'Password provided is incorrect. Account deletion cancelled.' };
    }

    // Cascade deletion of sessions, history, verification tokens, user
    await prisma.user.delete({
      where: { id: userId }
    });

    return { message: 'Account and associated data deleted permanently.' };
  }
};
