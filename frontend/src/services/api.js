import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;
let onAuthFailure = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthFailure(fn) {
  onAuthFailure = fn;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const REFRESH_URL = '/users/refresh';
const LOGIN_URL = '/users/login';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.url?.endsWith(REFRESH_URL) ||
      original.url?.endsWith(LOGIN_URL)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post(REFRESH_URL).finally(() => {
          refreshPromise = null;
        });
      }
      const { data } = await refreshPromise;
      accessToken = data.accessToken;
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      accessToken = null;
      if (onAuthFailure) onAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

export default api;