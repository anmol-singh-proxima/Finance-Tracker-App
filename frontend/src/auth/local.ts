/**
 * Local DB-backed auth provider (IMPL-FE-01) — used in local development
 * (VITE_AUTH_PROVIDER=local). Talks to the backend's `/api/auth/*` endpoints:
 * register/login return an opaque session token, which we store and send as a
 * Bearer token on subsequent requests. No AWS involved.
 *
 * Uses `fetch` directly rather than the shared axios client so this module has
 * no dependency on `../api/client` (which imports this one via the auth facade)
 * — avoiding an import cycle. The stored token is read by getAccessToken so the
 * api client can attach it to every request.
 */

import type { AuthUser } from '../types/domain';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TOKEN_KEY = 'ft_local_auth_token';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Extract a user-safe message from a `{detail}` error body. */
async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') {
      return body.detail;
    }
  } catch {
    // non-JSON body — fall through
  }
  return fallback;
}

async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  const user = (await response.json()) as { id: string; username: string };
  return { sub: user.id, email: user.username };
}

export async function signIn(username: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Invalid username or password'));
  }
  const { access_token: token } = (await response.json()) as { access_token: string };
  setStoredToken(token);
  const user = await fetchCurrentUser(token);
  return user ?? { sub: '', email: username };
}

export async function signUp(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Could not create the account'));
  }
}

/** Not used by the local provider (no email confirmation); present so the
 * provider interface matches Cognito's. */
export function confirmSignUp(_username: string, _code: string): Promise<void> {
  return Promise.resolve();
}

export function signOut(): void {
  const token = getStoredToken();
  if (token) {
    // Best-effort server-side invalidation; the client is signed out regardless.
    void fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
  clearStoredToken();
}

export async function getCurrentSession(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) {
    return null;
  }
  const user = await fetchCurrentUser(token);
  if (!user) {
    clearStoredToken();
  }
  return user;
}

export function getAccessToken(): Promise<string | null> {
  return Promise.resolve(getStoredToken());
}
