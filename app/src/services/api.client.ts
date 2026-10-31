import axios from 'axios';

import { API_BASE_URL } from '../config/apiConstants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
});

localStorage.removeItem('current_realm_id');

export function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const { httpStatus, response } = error as {
    httpStatus?: number;
    response?: { status?: number };
  };
  return httpStatus ?? response?.status;
}

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const error = err && err.response ? err.response.data || err.response : err;
    const status = err?.response?.status;

    if (status && error && typeof error === 'object') {
      Object.defineProperty(error, 'httpStatus', { value: status, configurable: true });
    }

    if (status === 401) {
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        localStorage.setItem('auth_redirect', window.location.pathname + window.location.search);
      }
    }

    return Promise.reject(error);
  },
);
