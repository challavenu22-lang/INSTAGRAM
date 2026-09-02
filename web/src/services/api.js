import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

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
    const message = responseErr?.error || responseErr?.message || 'Something went wrong. Please try again.';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
    }
    
    return Promise.reject(new Error(message));
  }
);

export default api;
