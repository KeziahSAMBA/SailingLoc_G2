import api from './api.js';

export async function register(data) {
  const response = await api.post('/users/register', data);
  return response.data;
}

export async function login(data) {
  const response = await api.post('/users/login', data);
  return response.data;
}

export async function adminLogin(data) {
  const response = await api.post('/users/admin/login', data);
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

export async function verifyEmail(token) {
  const response = await api.get(`/users/verify-email/${token}`);
  return response.data;
}

export async function resendVerification(data) {
  const response = await api.post('/users/resend-verification', data);
  return response.data;
}