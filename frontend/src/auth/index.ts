/**
 * Auth facade — selects the auth provider from VITE_AUTH_PROVIDER and exposes a
 * single interface the rest of the app imports (App, Navigation, api/client,
 * Login). `local` (default) uses the DB-backed backend endpoints; `cognito`
 * uses Amazon Cognito. Both modules expose the same function shapes.
 */

import type { AuthUser } from '../types/domain';
import * as cognito from './cognito';
import * as local from './local';

export type AuthProviderName = 'local' | 'cognito';

export const authProvider: AuthProviderName =
  import.meta.env.VITE_AUTH_PROVIDER === 'cognito' ? 'cognito' : 'local';

const impl = authProvider === 'cognito' ? cognito : local;

/** Whether sign-up needs a second confirmation step (Cognito emails a code).
 * The local provider signs the user in immediately after registration. */
export const requiresConfirmation = authProvider === 'cognito';

export function signIn(usernameOrEmail: string, password: string): Promise<AuthUser> {
  return impl.signIn(usernameOrEmail, password);
}

export function signUp(usernameOrEmail: string, password: string): Promise<void> {
  return impl.signUp(usernameOrEmail, password);
}

/** Only meaningful for Cognito; a no-op for the local provider. */
export function confirmSignUp(usernameOrEmail: string, code: string): Promise<void> {
  return impl.confirmSignUp(usernameOrEmail, code);
}

export function signOut(): void {
  impl.signOut();
}

export function getCurrentSession(): Promise<AuthUser | null> {
  return impl.getCurrentSession();
}

export function getAccessToken(): Promise<string | null> {
  return impl.getAccessToken();
}
