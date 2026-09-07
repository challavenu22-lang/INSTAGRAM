import api from './api';

export const settingsService = {
  getSettings: () => api.get('/settings'),
  updatePreferences: (preferences) => api.patch('/settings', preferences),
  updateProfile: (profileData) => api.patch('/settings/profile', profileData),
  verifyPassword: (currentPassword) => api.post('/settings/verify-password', { currentPassword }),
  changePassword: (currentPassword, newPassword) => api.patch('/settings/password', { currentPassword, newPassword }),
  deleteAccount: (password) => api.delete('/settings/account', { data: { password } }),
};
