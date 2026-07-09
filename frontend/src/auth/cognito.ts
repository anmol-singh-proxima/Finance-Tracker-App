/**
 * Cognito auth provider (IMPL-FE-01) — used in the staging/production profile
 * (VITE_AUTH_PROVIDER=cognito). Cognito owns sign-up, sign-in, token issuance,
 * and refresh; the backend verifies the resulting access tokens
 * (backend/app/core/security.py). For local development the DB-backed provider
 * in ./local.ts is used instead; ./index.ts selects between them.
 *
 * The Cognito user pool is built lazily (not at module load), so this module
 * can be imported safely even when the VITE_COGNITO_* vars are absent (the
 * local profile) — the pool is only constructed when a Cognito function is
 * actually called.
 *
 * Token storage: amazon-cognito-identity-js persists tokens in localStorage and
 * refreshes them via the refresh token — needed for session persistence across
 * reloads. The XSS exposure is mitigated by React's auto-escaping and the
 * CloudFront CSP (TR-SEC-06); access tokens are never logged (TR-SEC-10).
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

import type { AuthUser } from '../types/domain';

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    // Fail closed (TR-SEC-03 spirit): a misconfigured pool must surface loudly
    // the first time Cognito is used, not silently.
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let _userPool: CognitoUserPool | undefined;

function getUserPool(): CognitoUserPool {
  if (!_userPool) {
    _userPool = new CognitoUserPool({
      UserPoolId: requireEnv('VITE_COGNITO_USER_POOL_ID'),
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID'),
    });
  }
  return _userPool;
}

function cognitoUser(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: getUserPool() });
}

function userFromSession(session: CognitoUserSession): AuthUser {
  const claims = session.getIdToken().decodePayload();
  return {
    sub: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
  };
}

/** Sign in with email + password (SRP). Resolves to the authenticated user. */
export function signIn(email: string, password: string): Promise<AuthUser> {
  const authDetails = new AuthenticationDetails({ Username: email, Password: password });
  const user = cognitoUser(email);
  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => resolve(userFromSession(session)),
      onFailure: (err) => reject(err),
    });
  });
}

/**
 * Register a new account. Cognito emails a confirmation code; the caller must
 * then call `confirmSignUp` before the user can sign in (BR-01).
 */
export function signUp(email: string, password: string): Promise<void> {
  const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
  return new Promise((resolve, reject) => {
    getUserPool().signUp(email, password, attributes, [], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/** Confirm a new account with the code Cognito emailed (BR-01). */
export function confirmSignUp(email: string, code: string): Promise<void> {
  const user = cognitoUser(email);
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/** Sign out the current user and clear stored tokens. */
export function signOut(): void {
  getUserPool().getCurrentUser()?.signOut();
}

/**
 * Return the current valid session, refreshing tokens if needed, or null if
 * nobody is signed in / the session can't be restored. Used on app load to
 * restore auth state after a page reload.
 */
export function getCurrentSession(): Promise<AuthUser | null> {
  const user = getUserPool().getCurrentUser();
  if (!user) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(userFromSession(session));
    });
  });
}

/**
 * Return a valid access token for API calls, refreshing if necessary, or null
 * if the user is not authenticated. The API client (src/api/client.ts) calls
 * this to attach `Authorization: Bearer <token>` to every request.
 */
export function getAccessToken(): Promise<string | null> {
  const user = getUserPool().getCurrentUser();
  if (!user) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getAccessToken().getJwtToken());
    });
  });
}
