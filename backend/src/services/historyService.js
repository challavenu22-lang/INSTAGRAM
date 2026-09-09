import prisma from '../config/db.js';
import { persistentAccountService } from './persistentAccountService.js';
import { normalizeVideoUrl } from '../utils/urlNormalizer.js';

export const historyService = {
  getUserHistory: async (userId, page = 1, limit = 20) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    // Sync cloud history first
    await persistentAccountService.syncLocalWithCloud();

    const allItems = await prisma.downloadHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Deduplicate records by (userId + normalizedUrl)
    const grouped = new Map();
    const duplicateIdsToDelete = [];

    for (const item of allItems) {
      const normKey = item.normalizedUrl || normalizeVideoUrl(item.sourceUrl || '');
      if (!normKey) continue;

      if (!grouped.has(normKey)) {
        grouped.set(normKey, item);
      } else {
        const existing = grouped.get(normKey);
        // Compare to keep the best item:
        // Priority 1: Has valid thumbnailUrl
        // Priority 2: Has valid fileSize
        // Priority 3: Newest createdAt
        const itemHasThumb = Boolean(item.thumbnailUrl && item.thumbnailUrl.trim());
        const existingHasThumb = Boolean(existing.thumbnailUrl && existing.thumbnailUrl.trim());

        let keepItem = false;
        if (itemHasThumb && !existingHasThumb) {
          keepItem = true;
        } else if (itemHasThumb === existingHasThumb) {
          if (item.fileSize && !existing.fileSize) {
            keepItem = true;
          } else if (Boolean(item.fileSize) === Boolean(existing.fileSize)) {
            if (new Date(item.createdAt) > new Date(existing.createdAt)) {
              keepItem = true;
            }
          }
        }

        if (keepItem) {
          duplicateIdsToDelete.push(existing.id);
          grouped.set(normKey, item);
        } else {
          duplicateIdsToDelete.push(item.id);
        }
      }
    }

    // Clean up duplicate records from database in background
    if (duplicateIdsToDelete.length > 0) {
      try {
        await prisma.downloadHistory.deleteMany({
          where: { id: { in: duplicateIdsToDelete } }
        });
      } catch (e) {}
    }

    const uniqueItems = Array.from(grouped.values());
    uniqueItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = uniqueItems.length;
    const paginatedItems = uniqueItems.slice(skip, skip + take);
    const totalPages = Math.ceil(total / take) || 1;

    return {
      items: paginatedItems,
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
    const rawUrl = data.sourceUrl || data.url || '';
    const normalizedUrl = normalizeVideoUrl(rawUrl);
    const sourceDomain = data.sourceDomain || 'instagram.com';
    const title = data.title || 'Instagram Video';
    const thumbnailUrl = data.thumbnailUrl || null;
    const status = data.status || 'COMPLETED';
    const fileSize = data.fileSize ? parseInt(data.fileSize, 10) : null;

    // Check if record already exists for this (userId + normalizedUrl)
    const allUserItems = await prisma.downloadHistory.findMany({
      where: { userId }
    });

    const existing = allUserItems.find(item => {
      const itemNorm = item.normalizedUrl || normalizeVideoUrl(item.sourceUrl || '');
      return itemNorm && normalizedUrl && itemNorm === normalizedUrl;
    });

    let item;
    if (existing) {
      // Upsert: Update existing history record instead of creating duplicate
      item = await prisma.downloadHistory.update({
        where: { id: existing.id },
        data: {
          normalizedUrl,
          sourceUrl: rawUrl || existing.sourceUrl,
          title: title || existing.title,
          thumbnailUrl: thumbnailUrl || existing.thumbnailUrl,
          status,
          fileSize: fileSize || existing.fileSize,
          createdAt: new Date()
        }
      });

      // Delete any secondary duplicates if present
      const otherDupes = allUserItems.filter(i => i.id !== existing.id && (i.normalizedUrl === normalizedUrl || normalizeVideoUrl(i.sourceUrl) === normalizedUrl));
      if (otherDupes.length > 0) {
        try {
          await prisma.downloadHistory.deleteMany({
            where: { id: { in: otherDupes.map(d => d.id) } }
          });
        } catch (e) {}
      }
    } else {
      // Insert single new record
      item = await prisma.downloadHistory.create({
        data: {
          userId,
          normalizedUrl,
          sourceUrl: rawUrl,
          sourceDomain,
          title,
          thumbnailUrl,
          status,
          fileSize,
          createdAt: new Date()
        }
      });
    }

    await persistentAccountService.addHistoryItem({
      id: item.id,
      userId: item.userId,
      normalizedUrl: item.normalizedUrl,
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
