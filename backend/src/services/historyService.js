import prisma from '../config/db.js';

export const historyService = {
  getUserHistory: async (userId, page = 1, limit = 20) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

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
    const item = await prisma.downloadHistory.findFirst({
      where: {
        id: historyId,
        userId // Enforce authorization scope
      }
    });

    if (!item) {
      throw { status: 404, message: 'History record not found or access denied.' };
    }

    return item;
  },

  deleteHistoryItem: async (userId, historyId) => {
    const item = await prisma.downloadHistory.findFirst({
      where: {
        id: historyId,
        userId
      }
    });

    if (!item) {
      throw { status: 404, message: 'History record not found or access denied.' };
    }

    await prisma.downloadHistory.delete({
      where: { id: historyId }
    });

    return { message: 'History record deleted successfully.' };
  },

  clearUserHistory: async (userId) => {
    const result = await prisma.downloadHistory.deleteMany({
      where: { userId }
    });

    return { 
      message: 'All download history records cleared successfully.',
      count: result.count 
    };
  },

  createHistoryItem: async (userId, data) => {
    const item = await prisma.downloadHistory.create({
      data: {
        userId,
        sourceUrl: data.sourceUrl || data.url || '',
        sourceDomain: data.sourceDomain || 'instagram.com',
        title: data.title || 'Instagram Video',
        thumbnailUrl: data.thumbnailUrl || '',
        status: data.status || 'COMPLETED',
        fileSize: data.fileSize ? parseInt(data.fileSize, 10) : null
      }
    });
    return item;
  }
};
