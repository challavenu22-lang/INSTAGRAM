import https from 'https';
import http from 'http';
import prisma from '../config/db.js';
import { logger } from '../utils/logger.js';
import { normalizeVideoUrl } from '../utils/urlNormalizer.js';

// Dedicated persistent cloud storage object ID for Video Downloader accounts, sessions & history
const CLOUD_STORE_ID = 'ff808181a067127101a08473aa465204';
const CLOUD_STORE_URL = `https://api.restful-api.dev/objects/${CLOUD_STORE_ID}`;

// Short in-memory cache for fast response within the same lambda lifetime
let cloudStoreCache = { users: {}, sessions: {}, history: {} };
let lastFetchTime = 0;
const CACHE_TTL_MS = 1500; // 1.5 seconds cache to minimize external network overhead

function httpRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(urlStr);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(urlStr, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });

    req.on('error', (err) => {
      logger.warn('[PERSISTENT ACCOUNT STORE ERROR]', { error: err.message });
      resolve({ status: 500, data: null });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 504, data: null });
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function normalizeStoreData(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return { users: {}, sessions: {}, history: {} };
  }

  let users = rawData.users && typeof rawData.users === 'object' ? rawData.users : {};
  let sessions = rawData.sessions && typeof rawData.sessions === 'object' ? rawData.sessions : {};
  let history = rawData.history && typeof rawData.history === 'object' ? rawData.history : {};

  for (const key of Object.keys(rawData)) {
    if (key !== 'users' && key !== 'sessions' && key !== 'history') {
      const val = rawData[key];
      if (val && typeof val === 'object' && val.id) {
        users[val.id] = val;
      }
    }
  }

  return { users, sessions, history };
}

export const persistentAccountService = {
  fetchCloudStore: async (forceRefresh = false) => {
    if (!forceRefresh && Date.now() - lastFetchTime < CACHE_TTL_MS && Object.keys(cloudStoreCache.users).length > 0) {
      return cloudStoreCache;
    }

    const res = await httpRequest(CLOUD_STORE_URL);
    if (res.status === 200 && res.data && res.data.data) {
      cloudStoreCache = normalizeStoreData(res.data.data);
      lastFetchTime = Date.now();
      return cloudStoreCache;
    }
    return cloudStoreCache;
  },

  saveCloudStore: async (storeObj) => {
    cloudStoreCache = normalizeStoreData(storeObj);
    lastFetchTime = Date.now();

    const payload = {
      name: 'Instagram Downloader Accounts Store',
      data: cloudStoreCache
    };

    await httpRequest(CLOUD_STORE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }, payload);
  },

  syncLocalWithCloud: async () => {
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      
      // 1. Sync Users
      if (store.users) {
        for (const userId of Object.keys(store.users)) {
          const u = store.users[userId];
          if (!u || !u.id || (!u.email && !u.username)) continue;

          const cleanEmail = (u.email || '').toLowerCase().trim();
          const cleanUsername = (u.username || '').toLowerCase().trim();
          const cleanName = u.name || cleanUsername || cleanEmail;

          // Remove any stale local user record holding this username under a different ID
          if (cleanUsername) {
            await prisma.user.deleteMany({
              where: {
                username: cleanUsername,
                id: { not: u.id }
              }
            });
          }

          const passwordHashToSet = u.passwordHash || undefined;

          await prisma.user.upsert({
            where: { id: u.id },
            create: {
              id: u.id,
              username: cleanUsername || null,
              email: cleanEmail,
              passwordHash: u.passwordHash || null,
              name: cleanName,
              picture: u.picture || null,
              emailVerified: u.emailVerified !== undefined ? u.emailVerified : true,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
            },
            update: {
              username: cleanUsername || null,
              email: cleanEmail,
              name: cleanName,
              ...(passwordHashToSet ? { passwordHash: passwordHashToSet } : {}),
              picture: u.picture !== undefined ? u.picture : undefined
            }
          });
        }
      }

      // 2. Sync Active Sessions
      if (store.sessions) {
        for (const tokenHash of Object.keys(store.sessions)) {
          const s = store.sessions[tokenHash];
          if (!s || !s.userId || !s.tokenHash) continue;
          
          const expiresAt = s.expiresAt ? new Date(s.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          if (new Date() > expiresAt) continue;

          const localUser = await prisma.user.findUnique({ where: { id: s.userId } });
          if (localUser) {
            const existingSession = await prisma.session.findUnique({ where: { tokenHash: s.tokenHash } });
            if (!existingSession) {
              await prisma.session.create({
                data: {
                  id: s.id || s.tokenHash.substring(0, 32),
                  userId: s.userId,
                  tokenHash: s.tokenHash,
                  expiresAt
                }
              });
            }
          }
        }
      }

      // 3. Sync Download History
      if (store.history) {
        for (const historyId of Object.keys(store.history)) {
          const h = store.history[historyId];
          if (!h || !h.id || !h.userId) continue;

          const localUser = await prisma.user.findUnique({ where: { id: h.userId } });
          if (localUser) {
            const existingHist = await prisma.downloadHistory.findUnique({ where: { id: h.id } });
            if (!existingHist) {
              await prisma.downloadHistory.create({
                data: {
                  id: h.id,
                  userId: h.userId,
                  sourceUrl: h.sourceUrl || h.url || '',
                  sourceDomain: h.sourceDomain || 'instagram.com',
                  title: h.title || 'Instagram Video',
                  thumbnailUrl: h.thumbnailUrl || null,
                  status: h.status || 'COMPLETED',
                  fileSize: h.fileSize ? parseInt(h.fileSize, 10) : null,
                  createdAt: h.createdAt ? new Date(h.createdAt) : new Date()
                }
              });
            }
          }
        }
      }
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT SYNC ERROR]', { error: err.message });
    }
  },

  upsertUser: async (userRecord) => {
    if (!userRecord || !userRecord.id) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      const cleanEmail = (userRecord.email || '').toLowerCase().trim();
      const cleanUsername = (userRecord.username || '').toLowerCase().trim();

      const existingCloudUser = store.users[userRecord.id] || {};
      const passwordHash = userRecord.passwordHash || existingCloudUser.passwordHash || null;

      store.users[userRecord.id] = {
        id: userRecord.id,
        username: cleanUsername || existingCloudUser.username || '',
        email: cleanEmail || existingCloudUser.email || '',
        passwordHash: passwordHash,
        name: userRecord.name || existingCloudUser.name || cleanUsername || cleanEmail,
        picture: userRecord.picture !== undefined ? userRecord.picture : (existingCloudUser.picture || null),
        emailVerified: userRecord.emailVerified !== undefined ? userRecord.emailVerified : (existingCloudUser.emailVerified !== undefined ? existingCloudUser.emailVerified : true),
        createdAt: userRecord.createdAt ? new Date(userRecord.createdAt).toISOString() : (existingCloudUser.createdAt || new Date().toISOString())
      };

      await persistentAccountService.saveCloudStore(store);
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT UPSERT ERROR]', { error: err.message });
    }
  },

  deleteUser: async (userId) => {
    if (!userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      if (store.users[userId]) {
        delete store.users[userId];
      }

      if (store.sessions) {
        for (const th of Object.keys(store.sessions)) {
          if (store.sessions[th]?.userId === userId) {
            delete store.sessions[th];
          }
        }
      }

      if (store.history) {
        for (const hid of Object.keys(store.history)) {
          if (store.history[hid]?.userId === userId) {
            delete store.history[hid];
          }
        }
      }

      await persistentAccountService.saveCloudStore(store);
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT DELETE ERROR]', { error: err.message });
    }
  },

  saveSession: async (sessionRecord) => {
    if (!sessionRecord || !sessionRecord.tokenHash || !sessionRecord.userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      store.sessions[sessionRecord.tokenHash] = {
        id: sessionRecord.id,
        userId: sessionRecord.userId,
        tokenHash: sessionRecord.tokenHash,
        expiresAt: sessionRecord.expiresAt ? new Date(sessionRecord.expiresAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      };
      await persistentAccountService.saveCloudStore(store);
    } catch (err) {
      logger.warn('[PERSISTENT SESSION SAVE ERROR]', { error: err.message });
    }
  },

  deleteSession: async (tokenHash) => {
    if (!tokenHash) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      if (store.sessions && store.sessions[tokenHash]) {
        delete store.sessions[tokenHash];
        await persistentAccountService.saveCloudStore(store);
      }
    } catch (err) {
      logger.warn('[PERSISTENT SESSION DELETE ERROR]', { error: err.message });
    }
  },

  deleteSessionsByUserId: async (userId) => {
    if (!userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      if (store.sessions) {
        let changed = false;
        for (const th of Object.keys(store.sessions)) {
          if (store.sessions[th]?.userId === userId) {
            delete store.sessions[th];
            changed = true;
          }
        }
        if (changed) {
          await persistentAccountService.saveCloudStore(store);
        }
      }
    } catch (err) {
      logger.warn('[PERSISTENT USER SESSIONS DELETE ERROR]', { error: err.message });
    }
  },

  addHistoryItem: async (historyRecord) => {
    if (!historyRecord || !historyRecord.userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      const rawUrl = historyRecord.sourceUrl || historyRecord.url || '';
      const normalizedUrl = historyRecord.normalizedUrl || normalizeVideoUrl(rawUrl);

      // Check if item already exists for this (userId + normalizedUrl)
      let existingKey = null;
      if (store.history) {
        for (const key of Object.keys(store.history)) {
          const item = store.history[key];
          if (item && item.userId === historyRecord.userId) {
            const itemNorm = item.normalizedUrl || normalizeVideoUrl(item.sourceUrl || '');
            if (itemNorm && normalizedUrl && itemNorm === normalizedUrl) {
              existingKey = key;
              break;
            }
          }
        }
      }

      const targetId = existingKey || historyRecord.id || Date.now().toString();

      store.history[targetId] = {
        id: targetId,
        userId: historyRecord.userId,
        normalizedUrl,
        sourceUrl: rawUrl,
        sourceDomain: historyRecord.sourceDomain || 'instagram.com',
        title: historyRecord.title || 'Instagram Video',
        thumbnailUrl: historyRecord.thumbnailUrl || (existingKey ? store.history[existingKey].thumbnailUrl : null),
        status: historyRecord.status || 'COMPLETED',
        fileSize: historyRecord.fileSize || (existingKey ? store.history[existingKey].fileSize : null),
        createdAt: historyRecord.createdAt ? new Date(historyRecord.createdAt).toISOString() : new Date().toISOString()
      };

      await persistentAccountService.saveCloudStore(store);
    } catch (err) {
      logger.warn('[PERSISTENT HISTORY ADD ERROR]', { error: err.message });
    }
  },

  getHistoryByUserId: async (userId) => {
    if (!userId) return [];
    try {
      const store = await persistentAccountService.fetchCloudStore(false);
      const userItems = [];
      const grouped = new Map();

      if (store.history) {
        for (const hid of Object.keys(store.history)) {
          const item = store.history[hid];
          if (item && item.userId === userId) {
            const normKey = item.normalizedUrl || normalizeVideoUrl(item.sourceUrl || '');
            if (!normKey) continue;
            if (!grouped.has(normKey)) {
              grouped.set(normKey, item);
            } else {
              const existing = grouped.get(normKey);
              const itemHasThumb = Boolean(item.thumbnailUrl && item.thumbnailUrl.trim());
              const existingHasThumb = Boolean(existing.thumbnailUrl && existing.thumbnailUrl.trim());
              if (itemHasThumb && !existingHasThumb) {
                grouped.set(normKey, item);
              } else if (itemHasThumb === existingHasThumb && new Date(item.createdAt) > new Date(existing.createdAt)) {
                grouped.set(normKey, item);
              }
            }
          }
        }
      }

      const uniqueList = Array.from(grouped.values());
      uniqueList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return uniqueList;
    } catch (err) {
      logger.warn('[PERSISTENT HISTORY GET ERROR]', { error: err.message });
      return [];
    }
  },

  deleteHistoryItem: async (historyId, userId) => {
    if (!historyId || !userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      if (store.history && store.history[historyId] && store.history[historyId].userId === userId) {
        delete store.history[historyId];
        await persistentAccountService.saveCloudStore(store);
      }
    } catch (err) {
      logger.warn('[PERSISTENT HISTORY DELETE ERROR]', { error: err.message });
    }
  },

  clearUserHistory: async (userId) => {
    if (!userId) return;
    try {
      const store = await persistentAccountService.fetchCloudStore(true);
      if (store.history) {
        let changed = false;
        for (const hid of Object.keys(store.history)) {
          if (store.history[hid]?.userId === userId) {
            delete store.history[hid];
            changed = true;
          }
        }
        if (changed) {
          await persistentAccountService.saveCloudStore(store);
        }
      }
    } catch (err) {
      logger.warn('[PERSISTENT HISTORY CLEAR ERROR]', { error: err.message });
    }
  }
};
