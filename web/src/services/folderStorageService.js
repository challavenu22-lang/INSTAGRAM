const DB_NAME = 'VideoDownloaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'folder_handles';
const HANDLE_KEY = 'custom_directory_handle';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const folderStorageService = {
  // Store directory handle in IndexedDB
  saveDirectoryHandle: async (handle) => {
    try {
      const db = await openDB();
      if (!db) return false;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const req = store.put(handle, HANDLE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return true;
    } catch (err) {
      console.warn('Failed to store FileSystemDirectoryHandle in IndexedDB:', err);
      return false;
    }
  },

  // Retrieve directory handle from IndexedDB
  getDirectoryHandle: async () => {
    try {
      const db = await openDB();
      if (!db) return null;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const handle = await new Promise((resolve, reject) => {
        const req = store.get(HANDLE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return handle || null;
    } catch (err) {
      console.warn('Failed to retrieve FileSystemDirectoryHandle from IndexedDB:', err);
      return null;
    }
  },

  // Remove directory handle from IndexedDB
  clearDirectoryHandle: async () => {
    try {
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const req = store.delete(HANDLE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to clear FileSystemDirectoryHandle from IndexedDB:', err);
    }
  },

  // Verify or request readwrite permission on directory handle
  verifyPermission: async (handle, readWrite = true) => {
    if (!handle || typeof handle.queryPermission !== 'function') return false;
    const options = { mode: readWrite ? 'readwrite' : 'read' };
    try {
      let state = await handle.queryPermission(options);
      if (state === 'granted') {
        return true;
      }
      if (state === 'prompt' && typeof handle.requestPermission === 'function') {
        state = await handle.requestPermission(options);
        if (state === 'granted') {
          return true;
        }
      }
    } catch (e) {
      console.warn('Error checking directory handle permission:', e);
    }
    return false;
  }
};
