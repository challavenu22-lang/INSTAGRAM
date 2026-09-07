import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export const settingsService = {
  updateProfile: async (userId, data) => {
    const { name, userName, username, userId: customUserId, email, picture } = data;
    let targetUserId = userId;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    const inputName = name !== undefined ? name : userName;
    const inputUsername = username !== undefined ? username : customUserId;

    const cleanName = (inputName !== undefined ? inputName : user.name || '').trim();
    const cleanUsername = (inputUsername !== undefined ? inputUsername : user.username || '').trim().toLowerCase();
    const cleanEmail = email ? email.toLowerCase().trim() : user.email;

    if (!cleanName) {
      throw { status: 400, message: 'User Name cannot be empty.' };
    }

    if (!cleanUsername) {
      throw { status: 400, message: 'User ID cannot be empty.' };
    }

    // Check if new username is already taken by another account
    if (cleanUsername !== user.username) {
      const existingUser = await prisma.user.findFirst({
        where: { username: cleanUsername }
      });
      if (existingUser && existingUser.id !== targetUserId) {
        throw { status: 400, message: 'This User ID is already taken. Please choose a different User ID.' };
      }
    }

    const updateData = {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail
    };
    if (picture !== undefined) updateData.picture = picture;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData
    });

    const displayName = updatedUser.name || updatedUser.username || '';
    const displayUsername = updatedUser.username || '';

    return {
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser.id,
        name: displayName,
        fullName: displayName,
        userName: displayName,
        username: displayUsername,
        email: updatedUser.email,
        picture: updatedUser.picture,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt
      }
    };
  },

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

  verifyPassword: async (userId, currentPassword) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    if (!user.passwordHash) {
      throw { status: 400, message: 'Current password is incorrect.' };
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { status: 400, message: 'Current password is incorrect.' };
    }

    return { message: 'Current password verified successfully.' };
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, message: 'User account not found.' };
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { status: 400, message: 'Current password is incorrect.' };
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

    if (user.passwordHash) {
      if (!password || !password.trim()) {
        throw { status: 400, message: 'Incorrect password. Please try again.' };
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw { status: 400, message: 'Incorrect password. Please try again.' };
      }
    }

    // Cascade deletion of sessions, history, verification tokens, user
    await prisma.user.delete({
      where: { id: userId }
    });

    return { message: 'Account and associated data deleted permanently.' };
  }
};
