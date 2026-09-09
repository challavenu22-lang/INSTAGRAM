import prisma from '../config/db.js';
import { persistentAccountService } from './persistentAccountService.js';

export const historyService = {
  getUserHistory: async (userId, page = 1, limit = 20) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    // Sync cloud history first
    await persistentAccountService.syncLocalWithCloud();

    const [items, total] = await Promise.all([
      prisma.downloadHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.downloadHistory.count({
        where: { userId }
      })
    ]);

    // Fallback: If local database has 0 items but cloud store has history, use cloud store
    if (items.length === 0) {
      const cloudItems = await persistentAccountService.getHistoryByUserId(userId);
      if (cloudItems.length > 0) {
        const paginatedCloud = cloudItems.slice(skip, skip + take);
        return {
          items: paginatedCloud,
          pagination: {
            total: cloudItems.length,
            page: pageNum,
            limit: take,
            totalPages: Math.ceil(cloudItems.length / take) || 1,
            hasNext: pageNum < Math.ceil(cloudItems.length / take),
            hasPrev: pageNum > 1
          }
        };
      }
    }

    const totalPages = Math.ceil(total / take) || 1;

    return {
      items,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };
  },

  getHistoryById: async (userId, historyId) => {
    await persistentAccountService.syncLocalWithCloud();
    const item = await prisma.downloadHistory.findFirst({
      where: {
        id: historyId,
        userId
      }
    });

    if (!item) {
      throw { status: 404, message: 'History record not found or access denied.' };
    }

    return item;
  },

  deleteHistoryItem: async (userId, historyId) => {
    try {
      await prisma.downloadHistory.deleteMany({
        where: {
          id: historyId,
          userId
        }
      });
    } catch (e) {}

    await persistentAccountService.deleteHistoryItem(historyId, userId);

    return { message: 'History record deleted successfully.' };
  },

  clearUserHistory: async (userId) => {
    let resultCount = 0;
    try {
      const res = await prisma.downloadHistory.deleteMany({
        where: { userId }
      });
      resultCount = res.count;
    } catch (e) {}

    await persistentAccountService.clearUserHistory(userId);

    return { 
      message: 'All download history records cleared successfully.',
      count: resultCount 
    };
  },

  createHistoryItem: async (userId, data) => {
    const sourceUrl = data.sourceUrl || data.url || '';
    const sourceDomain = data.sourceDomain || 'instagram.com';
    const title = data.title || 'Instagram Video';
    const thumbnailUrl = data.thumbnailUrl || null;
    const status = data.status || 'COMPLETED';
    const fileSize = data.fileSize ? parseInt(data.fileSize, 10) : null;

    const item = await prisma.downloadHistory.create({
      data: {
        userId,
        sourceUrl,
        sourceDomain,
        title,
        thumbnailUrl,
        status,
        fileSize
      }
    });

    await persistentAccountService.addHistoryItem({
      id: item.id,
      userId: item.userId,
      sourceUrl: item.sourceUrl,
      sourceDomain: item.sourceDomain,
      title: item.title,
      thumbnailUrl: item.thumbnailUrl,
      status: item.status,
      fileSize: item.fileSize,
      createdAt: item.createdAt
    });

    return item;
  }
};
