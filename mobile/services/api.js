import axios from 'axios';
import { storage } from './storage';

// Default to local machine IP / localhost for development
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const responseErr = error.response?.data;
    const message = responseErr?.error || responseErr?.message || 'Network error occurred.';
    
    if (error.response?.status === 401) {
      await storage.removeToken();
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;
