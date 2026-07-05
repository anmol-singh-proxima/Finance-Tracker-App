import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';

/**
 * Gates a route on authentication (BR-13). While the initial Cognito session
 * check is in flight, render nothing rather than flashing the login page for a
 * user who is actually signed in.
 */
export default function ProtectedRoute({
  children,
}: {
  children: ReactElement;
}): ReactElement | null {
  const { isAuthenticated, initializing } = useAppSelector((state) => state.auth);

  if (initializing) {
    return null;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
