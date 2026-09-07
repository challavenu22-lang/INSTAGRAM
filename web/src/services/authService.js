import api from './api';

export const authService = {
  register: (name, username, email, password) => api.post('/auth/register', { name, username, email, password }),
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  getCurrentUser: () => api.get('/auth/me'),
};
