import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `http://${window.location.hostname}:5005/api`;
    }
  }
  return 'http://localhost:5005/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT Auth Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for global error formatting
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const responseErr = error.response?.data;
    const isNetworkErr = error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response;
    const message = responseErr?.error || responseErr?.message || (isNetworkErr ? 'Unable to connect to the server. Please ensure the backend server is running.' : 'Something went wrong. Please try again.');
    
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;
