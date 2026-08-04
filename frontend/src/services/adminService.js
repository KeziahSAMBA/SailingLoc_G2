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

export function listBookings(params) {
  return api.get('/admin/bookings', { params });
}

export function cancelBooking(id, reason) {
  return api.patch(`/admin/bookings/${id}/cancel`, { reason });
}

export function listDisputes(status) {
  return api.get('/admin/disputes', { params: status ? { status } : {} });
}

export function setDisputeStatus(id, status, resolution, refund) {
  // `refund` est optionnel : { percent: 25|50|75|100|number, commission: boolean }.
  // Le backend ne déclenche un remboursement que si status === 'resolved'
  // ET percent > 0. La commission est conservée par défaut (politique standard).
  const payload = { status, resolution };
  if (refund && Number(refund.percent) > 0) {
    payload.refund_percent = Number(refund.percent);
    payload.refund_commission = !!refund.commission;
  }
  return api.patch(`/admin/disputes/${id}`, payload);
}

export function listReviews(params) {
  return api.get('/admin/reviews', { params });
}

export function updateReview(id, data) {
  return api.patch(`/admin/reviews/${id}`, data);
}

export function deleteReview(id) {
  return api.delete(`/admin/reviews/${id}`);
}

export function listPorts(params) {
  return api.get('/admin/ports', { params });
}

export function createPort(data) {
  return api.post('/admin/ports', data);
}

export function deletePort(id) {
  return api.delete(`/admin/ports/${id}`);
}

export function listPayments(params) {
  return api.get('/admin/payments', { params });
}

export function getPaymentStats() {
  return api.get('/admin/payments/stats');
}

// Demandes du formulaire de contact public.
export function listContactRequests(params) {
  return api.get('/admin/contact-requests', { params });
}

export function setContactRequestStatus(id, status) {
  return api.patch(`/admin/contact-requests/${id}`, { status });
}

// Journal d'activité : pagination assurée par le backend (params page / pageSize).
export function listLogs(params) {
  return api.get('/admin/logs', { params });
}

export function listLogFilters() {
  return api.get('/admin/logs/filters');
}

// Tâches planifiées.
export function listCronJobs() {
  return api.get('/admin/cron/jobs');
}

export function updateCronJob(key, payload) {
  return api.patch(`/admin/cron/jobs/${key}`, payload);
}

// Répond 202 : l'exécution est lancée, son résultat arrive via listCronRuns.
export function runCronJob(key) {
  return api.post(`/admin/cron/jobs/${key}/run`);
}

export function listCronRuns(params) {
  return api.get('/admin/cron/runs', { params });
}
