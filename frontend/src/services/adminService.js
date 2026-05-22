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

export function listBoats(params) {
  return api.get('/admin/boats', { params });
}

export function setBoatPublished(id, is_published) {
  return api.patch(`/admin/boats/${id}`, { is_published });
}

export function listReports(status) {
  return api.get('/admin/reports', { params: status ? { status } : {} });
}

export function setReportStatus(id, status) {
  return api.patch(`/admin/reports/${id}`, { status });
}
