import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirmSignUp, requiresConfirmation, signIn, signUp } from '../auth';
import { useAppDispatch } from '../store/hooks';
import { authenticated } from '../store/slices/authSlice';
import './Login.css';

type Mode = 'signIn' | 'signUp' | 'confirm';

// The identity field is an email for the Cognito provider and a username for the
// local provider.
const identityLabel = requiresConfirmation ? 'Email Address' : 'Username';
const identityType = requiresConfirmation ? 'email' : 'text';

function messageFor(err: unknown, fallback: string): string {
  // Both providers surface a user-safe `message` on their errors.
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const completeSignIn = async () => {
    const user = await signIn(email, password);
    dispatch(authenticated(user));
    navigate('/dashboard');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'signIn') {
        await completeSignIn();
      } else if (mode === 'signUp') {
        await signUp(email, password);
        if (requiresConfirmation) {
          setMode('confirm');
          setInfo('We emailed you a confirmation code. Enter it below to finish signing up.');
        } else {
          // Local provider: no email confirmation — sign in immediately.
          await completeSignIn();
        }
      } else {
        await confirmSignUp(email, code);
        await completeSignIn();
      }
    } catch (err) {
      setError(messageFor(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const titleByMode: Record<Mode, string> = {
    signIn: 'Welcome Back',
    signUp: 'Create Account',
    confirm: 'Confirm Your Email',
  };

  const submitLabel: Record<Mode, string> = {
    signIn: 'Login',
    signUp: 'Register',
    confirm: 'Confirm',
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Finance Tracker</h1>
          <p>{titleByMode[mode]}</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {info && <div className="alert">{info}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="identity">{identityLabel}</label>
            <input
              id="identity"
              type={identityType}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`Enter your ${identityLabel.toLowerCase()}`}
              required
              disabled={loading || mode === 'confirm'}
            />
          </div>

          {mode !== 'confirm' && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
          )}

          {mode === 'confirm' && (
            <div className="form-group">
              <label htmlFor="code">Confirmation Code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code from your email"
                required
                disabled={loading}
              />
            </div>
          )}

          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Loading...' : submitLabel[mode]}
          </button>
        </form>

        {mode !== 'confirm' && (
          <div className="login-footer">
            <p>
              {mode === 'signUp' ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                className="toggle-btn"
                onClick={() => {
                  setError('');
                  setInfo('');
                  setMode(mode === 'signUp' ? 'signIn' : 'signUp');
                }}
              >
                {mode === 'signUp' ? 'Login' : 'Register'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
