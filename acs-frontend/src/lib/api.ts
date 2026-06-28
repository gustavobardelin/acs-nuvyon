// acs-frontend/src/lib/api.ts

import axios from 'axios';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storageToken = window.localStorage.getItem('acs_token');

  if (storageToken) return storageToken;

  const cookieToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('acs_token='))
    ?.split('=')[1];

  return cookieToken || null;
}

function clearAuthToken() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem('acs_token');
  document.cookie = 'acs_token=; path=/; max-age=0; SameSite=Lax';
}

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error?.config?.url?.includes('/auth/login');

    if (error?.response?.status === 401 && !isLoginRequest) {
      clearAuthToken();

      if (typeof window !== 'undefined') {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);