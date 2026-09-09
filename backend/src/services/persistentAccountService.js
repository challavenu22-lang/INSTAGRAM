import https from 'https';
import http from 'http';
import prisma from '../config/db.js';
import { logger } from '../utils/logger.js';

// Dedicated persistent cloud storage object ID for Video Downloader accounts
const CLOUD_STORE_ID = 'ff808181a067127101a08473aa465204';
const CLOUD_STORE_URL = `https://api.restful-api.dev/objects/${CLOUD_STORE_ID}`;

// In-memory cache for ultra-fast response within the same lambda lifetime
let accountsCache = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 seconds cache

function httpRequest(urlStr, options = {}, postData = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(urlStr);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(urlStr, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000
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

export const persistentAccountService = {
  // Fetch all persistent accounts from cloud storage
  fetchAccountsFromCloud: async () => {
    if (Date.now() - lastFetchTime < CACHE_TTL_MS && Object.keys(accountsCache).length > 0) {
      return accountsCache;
    }

    const res = await httpRequest(CLOUD_STORE_URL);
    if (res.status === 200 && res.data && res.data.data) {
      accountsCache = res.data.data;
      lastFetchTime = Date.now();
      return accountsCache;
    }
    return accountsCache;
  },

  // Save current accounts object to cloud storage
  saveAccountsToCloud: async (accountsObj) => {
    accountsCache = accountsObj;
    lastFetchTime = Date.now();

    const payload = {
      name: 'Instagram Downloader Accounts Store',
      data: accountsObj
    };

    await httpRequest(CLOUD_STORE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    }, payload);
  },

  // Synchronize local Prisma database with cloud persistent accounts
  syncLocalWithCloud: async () => {
    try {
      const cloudAccounts = await persistentAccountService.fetchAccountsFromCloud();
      if (!cloudAccounts || Object.keys(cloudAccounts).length === 0) return;

      for (const accountId of Object.keys(cloudAccounts)) {
        const u = cloudAccounts[accountId];
        if (!u || !u.id || (!u.email && !u.username)) continue;

        const cleanEmail = (u.email || '').toLowerCase().trim();
        const cleanUsername = (u.username || '').toLowerCase().trim();
        const cleanName = u.name || cleanUsername || cleanEmail;

        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { id: u.id },
              ...(cleanUsername ? [{ username: cleanUsername }] : [])
            ]
          }
        });

        if (!existing) {
          await prisma.user.create({
            data: {
              id: u.id,
              username: cleanUsername || null,
              email: cleanEmail,
              passwordHash: u.passwordHash || null,
              name: cleanName,
              picture: u.picture || null,
              emailVerified: u.emailVerified !== undefined ? u.emailVerified : true,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date()
            }
          });
        }
      }
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT SYNC ERROR]', { error: err.message });
    }
  },

  // Save or update a user account in persistent store
  upsertUser: async (userRecord) => {
    if (!userRecord || !userRecord.id) return;
    try {
      const cloudAccounts = await persistentAccountService.fetchAccountsFromCloud();
      const cleanEmail = (userRecord.email || '').toLowerCase().trim();
      const cleanUsername = (userRecord.username || '').toLowerCase().trim();

      cloudAccounts[userRecord.id] = {
        id: userRecord.id,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: userRecord.passwordHash,
        name: userRecord.name || cleanUsername || cleanEmail,
        picture: userRecord.picture || null,
        emailVerified: userRecord.emailVerified !== undefined ? userRecord.emailVerified : true,
        createdAt: userRecord.createdAt || new Date().toISOString()
      };

      await persistentAccountService.saveAccountsToCloud(cloudAccounts);
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT UPSERT ERROR]', { error: err.message });
    }
  },

  // Remove a user account permanently from persistent store (for Delete Account action)
  deleteUser: async (userId) => {
    if (!userId) return;
    try {
      const cloudAccounts = await persistentAccountService.fetchAccountsFromCloud();
      if (cloudAccounts[userId]) {
        delete cloudAccounts[userId];
        await persistentAccountService.saveAccountsToCloud(cloudAccounts);
      }
    } catch (err) {
      logger.warn('[PERSISTENT ACCOUNT DELETE ERROR]', { error: err.message });
    }
  }
};
