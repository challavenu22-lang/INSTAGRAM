import api from './api';

export const videoService = {
  search: (url) => api.post('/video/search', { url }),
  
  downloadStream: async (url, filenameHint = 'video.mp4') => {
    const token = localStorage.getItem('auth_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
    
    const response = await fetch(`${API_URL}/video/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      let errText = 'Download failed.';
      try {
        const errJson = await response.json();
        errText = errJson.error || errText;
      } catch (e) {
        errText = `HTTP Error ${response.status}`;
      }
      throw new Error(errText);
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Video stream unavailable or empty file received.');
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filenameHint;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  }
};
