const SETTINGS_KEY = 'app_settings';

// Purge any legacy unauthenticated guest download history keys
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('download_history');
    localStorage.removeItem('app_download_history');
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

  // --- USER & LOCAL SCOPED HISTORY ---
  // STRICT GUEST MODE: If userId is null or unauthenticated, NEVER save or return download history.
  getHistory: (userId = null) => {
    if (!userId) {
      return [];
    }
    try {
      const userKey = `download_history_${userId}`;
      const stored = localStorage.getItem(userKey);

      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Deduplicate on read
      const grouped = new Map();
      for (const item of parsed) {
        const normKey = storageService.normalizeUrl(item.sourceUrl || item.url || '');
        if (!normKey) continue;

        const match = (item.sourceUrl || item.url || '').match(/\/(reel|p|tv)\/([^\/?#]+)/i);
        const shortcode = match ? match[2] : null;
        if (shortcode && (!item.thumbnailUrl || item.thumbnailUrl.includes('cdninstagram.com'))) {
          item.thumbnailUrl = `/api/video/thumbnail/${shortcode}.jpg`;
        }

        if (!grouped.has(normKey)) {
          grouped.set(normKey, item);
        } else {
          const existing = grouped.get(normKey);
          const itemHasThumb = Boolean(item.thumbnailUrl && item.thumbnailUrl.trim());
          const existingHasThumb = Boolean(existing.thumbnailUrl && existing.thumbnailUrl.trim());
          if (itemHasThumb && !existingHasThumb) {
            grouped.set(normKey, item);
          } else if (itemHasThumb === existingHasThumb && new Date(item.downloadedAt || item.createdAt) > new Date(existing.downloadedAt || existing.createdAt)) {
            grouped.set(normKey, item);
          }
        }
      }
      const uniqueItems = Array.from(grouped.values());
      uniqueItems.sort((a, b) => new Date(b.downloadedAt || b.createdAt) - new Date(a.downloadedAt || a.createdAt));
      return uniqueItems;
    } catch {
      return [];
    }
  },

  addHistoryItem: (item, userId = null) => {
    // Guest Mode: Do NOT save download history to localStorage or anywhere
    if (!userId) {
      return [];
    }
    try {
      const userKey = `download_history_${userId}`;
      const history = storageService.getHistory(userId);
      const rawUrl = item.sourceUrl || item.url || '';
      const normKey = storageService.normalizeUrl(rawUrl);
      
      const existing = history.find(h => storageService.normalizeUrl(h.sourceUrl || h.url || '') === normKey);

      const match = rawUrl.match(/\/(reel|p|tv)\/([^\/?#]+)/i);
      const shortcode = match ? match[2] : null;
      const reliableThumb = (shortcode && (!item.thumbnailUrl || item.thumbnailUrl.includes('cdninstagram.com')))
        ? `/api/video/thumbnail/${shortcode}.jpg`
        : (item.thumbnailUrl || (existing ? existing.thumbnailUrl : ''));

      const cleanTitle = (shortcode && (!item.title || item.title.includes('http://') || item.title.includes('https://')))
        ? `Instagram Video (${shortcode})`
        : (item.title || (existing ? existing.title : 'Instagram Video'));

      const newItem = {
        id: existing ? existing.id : (item.id || Date.now().toString()),
        title: cleanTitle,
        sourceUrl: rawUrl || (existing ? existing.sourceUrl : ''),
        thumbnailUrl: reliableThumb,
        status: item.status || 'Completed',
        downloadedAt: new Date().toISOString(),
        fileSize: item.fileSize || (existing ? existing.fileSize : null),
        sourceDomain: item.sourceDomain || 'instagram.com'
      };

      // Filter out previous record with same normKey
      const filtered = history.filter(h => storageService.normalizeUrl(h.sourceUrl || h.url || '') !== normKey);

      const updated = [newItem, ...filtered];
      localStorage.setItem(userKey, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  saveAllHistory: (items, userId = null) => {
    if (!userId) return;
    try {
      const userKey = `download_history_${userId}`;
      localStorage.setItem(userKey, JSON.stringify(items || []));
    } catch (e) {}
  },

  deleteHistoryItem: (id, userId = null) => {
    if (!userId) return [];
    try {
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
    if (!userId) return [];
    try {
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
    const igMatch = trimmed.match(/https?:\/\/(?:www\.)?instagram\.com\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (igMatch && igMatch[1] && igMatch[2]) {
      return `https://www.instagram.com/${igMatch[1].toLowerCase()}/${igMatch[2]}/`;
    }
    try {
      const u = new URL(trimmed);
      return (u.origin + u.pathname).replace(/\/+$/, '') + '/';
    } catch {
      return trimmed.split('?')[0].split('#')[0].replace(/\/+$/, '') + '/';
    }
  },

  isAlreadyDownloaded: (sourceUrl, userId = null) => {
    if (!sourceUrl) return false;
    const cleanUrl = sourceUrl.trim();
    if (!cleanUrl) return false;
    const cleanId = storageService.normalizeUrl(cleanUrl);

    // Check history
    const history = storageService.getHistory(userId);
    if (history.some(item => {
      const itemUrl = item.sourceUrl || item.url || '';
      return itemUrl.trim() === cleanUrl || (cleanId && storageService.normalizeUrl(itemUrl) === cleanId);
    })) {
      return true;
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
