import api from './api';
import { storageService } from './storageService';
import { folderStorageService } from './folderStorageService';

export const videoService = {
  search: (url) => api.post('/video/search', { url }),
  
  downloadStream: async (url, filenameHint = 'video.mp4') => {
    const userSettings = storageService.getSettings();
    let saveFileHandle = null;

    // Prompt native Save As dialog upfront if supported and using default location
    if (userSettings.downloadLocation !== 'custom' && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        saveFileHandle = await window.showSaveFilePicker({
          suggestedName: filenameHint,
          types: [
            {
              description: 'Video File',
              accept: {
                'video/mp4': ['.mp4'],
                'video/webm': ['.webm'],
                'application/octet-stream': ['.mp4']
              }
            }
          ]
        });
      } catch (err) {
        if (err.name === 'AbortError') {
          // User cancelled the native Save As dialog modal
          return { success: false, cancelled: true };
        }
        console.warn('Native save picker prompt fallback:', err);
      }
    }

    const token = localStorage.getItem('auth_token');
    const getApiUrl = () => {
      if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
      if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        return `http://${window.location.hostname}:5005/api`;
      }
      return 'http://localhost:5005/api';
    };
    const API_URL = getApiUrl();
    
    const response = await fetch(`${API_URL}/video/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      let errText = 'Download failed.';
      try {
        const errJson = await response.json();
        errText = errJson.error || errJson.message || errText;
      } catch (e) {
        errText = `HTTP Error ${response.status}`;
      }
      throw new Error(errText);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Video stream unavailable or empty file received.');
    }

    // Write blob to user-selected file handle
    if (saveFileHandle) {
      try {
        const writable = await saveFileHandle.createWritable();
        await writable.write(blob);
        await writable.close(); // File is 100% saved to disk when writable.close() finishes!
        return { success: true, customFolder: false, fallback: false };
      } catch (writeErr) {
        console.error('Failed writing video to selected file handle:', writeErr);
        throw new Error('Unable to save video file to disk.');
      }
    }

    // Check if user selected a custom folder location and File System Access API is supported
    if (userSettings.downloadLocation === 'custom') {
      const dirHandle = await folderStorageService.getDirectoryHandle();
      if (dirHandle) {
        const hasPermission = await folderStorageService.verifyPermission(dirHandle, true);
        if (hasPermission) {
          try {
            const fileHandle = await dirHandle.getFileHandle(filenameHint, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            return { success: true, customFolder: true, fallback: false };
          } catch (writeErr) {
            console.error('Failed writing file into selected folder:', writeErr);
            throw new Error('Unable to save video into the selected folder. Please check folder permissions.');
          }
        }
      }
    }

    // Fallback: standard <a> tag click download (e.g. non-secure IP address or unsupported browser)
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filenameHint;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);

    return { success: true, fallback: true };
  }
};
