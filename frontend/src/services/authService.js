import api from './api.js';

export async function register(data) {
  const response = await api.post('/users/register', data);
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