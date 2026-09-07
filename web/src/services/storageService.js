const SETTINGS_KEY = 'app_settings';

// Remove legacy un-scoped global history key if present to prevent leakage
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('download_history');
  }
} catch (e) {
  // Ignore
}

export const DEFAULT_SETTINGS = {
  downloadLocation: 'default', // 'default' or 'custom'
  folderPath: 'Downloads',
  autoSaveHistory: true,
  theme: 'system', // 'light' | 'dark' | 'system'
  notifyComplete: true,
  notifyFailed: true,
  notifySound: true,
};

export const storageService = {
  // --- SETTINGS ---
  getSettings: () => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (newSettings) => {
    try {
      const current = storageService.getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return newSettings;
    }
  },

  resetSettings: () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  // --- USER SCOPED HISTORY ---
  getHistory: (userId = null) => {
    try {
      if (!userId) return []; // Guests HAVE NO HISTORY!
      const userKey = `download_history_${userId}`;
      const stored = localStorage.getItem(userKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addHistoryItem: (item, userId = null) => {
    try {
      if (!userId) return []; // Guests MUST NOT save history records!
      
      const userKey = `download_history_${userId}`;
      const history = storageService.getHistory(userId);
      
      const newItem = {
        id: item.id || Date.now().toString(),
        title: item.title || 'Instagram Video',
        sourceUrl: item.sourceUrl || item.url || '',
        thumbnailUrl: item.thumbnailUrl || item.thumbnail || '',
        status: item.status || 'Completed',
        downloadedAt: item.downloadedAt || item.createdAt || new Date().toISOString(),
        fileSize: item.fileSize || null,
        sourceDomain: item.sourceDomain || 'instagram.com'
      };

      // Prevent duplicate history entries for the same download
      const filtered = history.filter(h => 
        String(h.id) !== String(newItem.id) &&
        !(h.sourceUrl === newItem.sourceUrl && h.title === newItem.title)
      );

      const updated = [newItem, ...filtered];
      localStorage.setItem(userKey, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  deleteHistoryItem: (id, userId = null) => {
    try {
      if (!userId) return [];
      const userKey = `download_history_${userId}`;
      const history = storageService.getHistory(userId);
      const updated = history.filter(item => String(item.id) !== String(id));
      localStorage.setItem(userKey, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  clearHistory: (userId = null) => {
    try {
      if (!userId) return [];
      const userKey = `download_history_${userId}`;
      localStorage.setItem(userKey, JSON.stringify([]));
      return [];
    } catch {
      return [];
    }
  },

  // --- DOWNLOADED URL TRACKING ---
  normalizeUrl: (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return '';
    const trimmed = urlStr.trim();
    if (!trimmed) return '';
    const igMatch = trimmed.match(/\/(reel|p|tv)\/([^\/]+)/i);
    if (igMatch && igMatch[2]) {
      return `ig_${igMatch[2]}`;
    }
    try {
      const u = new URL(trimmed);
      return (u.origin + u.pathname).replace(/\/$/, '');
    } catch {
      return trimmed.split('?')[0].replace(/\/$/, '');
    }
  },

  isAlreadyDownloaded: (sourceUrl, userId = null) => {
    if (!sourceUrl) return false;
    const cleanUrl = sourceUrl.trim();
    if (!cleanUrl) return false;
    const cleanId = storageService.normalizeUrl(cleanUrl);

    // Check user history if user is logged in
    if (userId) {
      const history = storageService.getHistory(userId);
      if (history.some(item => {
        const itemUrl = item.sourceUrl || item.url || '';
        return itemUrl.trim() === cleanUrl || (cleanId && storageService.normalizeUrl(itemUrl) === cleanId);
      })) {
        return true;
      }
    }

    // Also check global/guest downloaded URLs cache
    try {
      const cache = JSON.parse(localStorage.getItem('downloaded_urls_cache') || '[]');
      if (Array.isArray(cache)) {
        return cache.some(cachedItem => cachedItem === cleanUrl || (cleanId && storageService.normalizeUrl(cachedItem) === cleanId));
      }
      return false;
    } catch {
      return false;
    }
  },

  markAsDownloaded: (sourceUrl) => {
    if (!sourceUrl) return;
    const cleanUrl = sourceUrl.trim();
    if (!cleanUrl) return;
    const cleanId = storageService.normalizeUrl(cleanUrl);
    try {
      const cache = JSON.parse(localStorage.getItem('downloaded_urls_cache') || '[]');
      if (Array.isArray(cache)) {
        let updated = false;
        if (!cache.includes(cleanUrl)) {
          cache.push(cleanUrl);
          updated = true;
        }
        if (cleanId && !cache.includes(cleanId)) {
          cache.push(cleanId);
          updated = true;
        }
        if (updated) {
          localStorage.setItem('downloaded_urls_cache', JSON.stringify(cache));
        }
      }
    } catch (e) {
      // Ignore
    }
  }
};
