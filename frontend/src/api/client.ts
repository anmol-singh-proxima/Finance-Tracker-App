/**
 * Single HTTP client (IMPL-FE-02). One place that:
 *  - attaches a fresh Cognito access token to every request (TR-SEC-14),
 *  - centralises timeouts and error shaping (TR-REL-02),
 *  - signs the user out and redirects to /login on a 401 (expired/invalid).
 *
 * No business logic lives here — the per-domain modules (expenses.ts etc.)
 * own request shapes and DTO→domain mapping.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';

import { getAccessToken, signOut } from '../auth/cognito';

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Bearer token is issued by Cognito, not stored by us — fetch a valid (auto-
// refreshed) one per request. Never log the token (TR-SEC-10).
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token rejected by the backend — drop the local session and bounce to
      // login rather than leaving the UI in a half-authenticated state.
      signOut();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extract a human-readable message from an API error without leaking internals
 * to the UI. The backend returns `{ detail: string }` on handled errors.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return fallback;
}

export default apiClient;
