import api, { UPLOAD_TIMEOUT_MS } from './api.js';

export async function register(data) {
  const response = await api.post('/users/register', data);
  return response.data;
}

export async function login(data) {
  const response = await api.post('/users/login', data);
  return response.data;
}

export async function adminLogin(data) {
  const response = await api.post('/admin/login', data);
  return response.data;
}

export async function adminCreateUser(data) {
  const response = await api.post('/admin/users', data);
  return response.data;
}

export async function refreshToken() {
  const response = await api.post('/users/refresh');
  return response.data;
}

export async function logout() {
  await api.post('/users/logout');
}

export async function getMe() {
  const response = await api.get('/users/me');
  return response.data;
}

export async function updateMe(data) {
  const response = await api.patch('/users/me', data);
  return response.data;
}

export async function changePassword(data) {
  const response = await api.patch('/users/me/password', data);
  return response.data;
}

export async function verifyEmail(token) {
  const response = await api.get(`/users/verify-email/${token}`);
  return response.data;
}

export async function resendVerification(data) {
  const response = await api.post('/users/resend-verification', data);
  return response.data;
}

export async function requestPasswordReset(data) {
  const response = await api.post('/users/forgot-password', data);
  return response.data;
}

export async function resetPassword(data) {
  const response = await api.post('/users/reset-password', data);
  return response.data;
}

export async function verifyResetToken(token) {
  const response = await api.get(`/users/reset-password/${token}`);
  return response.data;
}

export async function getClosureStatus() {
  const response = await api.get('/users/me/closure');
  return response.data;
}

export async function deactivateAccount(data) {
  const response = await api.post('/users/me/deactivate', data);
  return response.data;
}

export async function deleteAccount(data) {
  const response = await api.delete('/users/me', { data });
  return response.data;
}

// Remplace la photo de profil (multipart, champ 'avatar').
export function updateAvatar(file) {
  const form = new FormData();
  form.append('avatar', file);
  return api.patch('/users/me/avatar', form, {
    headers: { 'Content-Type': undefined },
    timeout: UPLOAD_TIMEOUT_MS,
  });
}

// Supprime la photo de profil (retour à l'avatar généré).
export function deleteAvatar() {
  return api.delete('/users/me/avatar');
}
