const SETTINGS_KEY = 'app_settings';
const HISTORY_KEY = 'download_history';

const DEFAULT_SETTINGS = {
  downloadLocation: 'default', // 'default' or 'custom'
  folderPath: 'Downloads',
  autoSaveHistory: true,
  theme: 'dark', // 'light' | 'dark' | 'system'
  notifyComplete: true,
  notifyFailed: true,
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

  // --- HISTORY ---
  getHistory: () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addHistoryItem: (item) => {
    try {
      const history = storageService.getHistory();
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

      const filtered = history.filter(h => String(h.id) !== String(newItem.id));
      const updated = [newItem, ...filtered];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  deleteHistoryItem: (id) => {
    try {
      const history = storageService.getHistory();
      const updated = history.filter(item => String(item.id) !== String(id));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  clearHistory: () => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
      return [];
    } catch {
      return [];
    }
  }
};
