// acs-frontend/src/lib/api.ts

import axios from 'axios';
import Cookies from 'js-cookie';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || '/api';

function getAuthToken(): string | null {
  const cookieToken = Cookies.get('acs_token');

  if (cookieToken) {
    return cookieToken;
  }

  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('acs_token');
  }

  return null;
}

function clearAuthToken() {
  Cookies.remove('acs_token', { path: '/' });

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('acs_token');
  }
}

export const api = axios.create({
  baseURL: apiBaseUrl,
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
        const isLoginPage = window.location.pathname === '/login';

        if (!isLoginPage) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);