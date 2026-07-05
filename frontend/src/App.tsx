import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import Navigation from './components/Common/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Investments from './pages/Investments';
import Login from './pages/Login';
import { getCurrentSession } from './auth/cognito';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { authenticated, unauthenticated } from './store/slices/authSlice';

export default function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, initializing } = useAppSelector((state) => state.auth);

  // Restore auth state from any persisted Cognito session on load, so a hard
  // reload doesn't log the user out.
  useEffect(() => {
    let cancelled = false;
    getCurrentSession().then((user) => {
      if (cancelled) return;
      dispatch(user ? authenticated(user) : unauthenticated());
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <div className="app">
        {isAuthenticated && <Navigation />}
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated && !initializing ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investments"
            element={
              <ProtectedRoute>
                <Investments />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
