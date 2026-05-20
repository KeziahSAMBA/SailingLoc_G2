import api from './api.js';

export function getAdminStats() {
  return api.get('/admin/stats');
}
