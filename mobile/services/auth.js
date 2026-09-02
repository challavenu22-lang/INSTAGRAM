import api from './api';
import { storage } from './storage';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.token) {
      await storage.setToken(res.token);
    }
    return res;
  },

  register: async (email, password) => {
    return await api.post('/auth/register', { email, password });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore if token already invalid
    } finally {
      await storage.removeToken();
    }
  },

  getCurrentUser: async () => {
    return await api.get('/auth/me');
  }
};
