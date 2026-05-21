import api from './api.js';

export function getAdminStats() {
  return api.get('/admin/stats');
}

export function listUsers(params) {
  return api.get('/admin/users', { params });
}

export function updateUser(id, data) {
  return api.patch(`/admin/users/${id}`, data);
}

export function deleteUser(id) {
  return api.delete(`/admin/users/${id}`);
}

export function listDocuments(params) {
  return api.get('/admin/documents', { params });
}

export function setDocumentStatus(id, status) {
  return api.patch(`/admin/documents/${id}`, { status });
}
