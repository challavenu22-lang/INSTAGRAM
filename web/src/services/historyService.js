import api from './api';

export const historyService = {
  getHistory: (page = 1, limit = 20) => api.get(`/history?page=${page}&limit=${limit}`),
  addHistoryItem: (data) => api.post('/history', data),
  deleteItem: (id) => api.delete(`/history/${id}`),
  clearAll: () => api.delete('/history'),
};
