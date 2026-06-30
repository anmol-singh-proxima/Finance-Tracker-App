import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess, loginError } from '../redux/slices/authSlice';
import { authAPI } from '../services/api';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = isRegister
        ? await authAPI.register(email, password)
        : await authAPI.login(email, password);

      dispatch(loginSuccess({
        user: response.data.user,
        token: response.data.token,
      }));

      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred. Please try again.';
      setError(errorMsg);
      dispatch(loginError(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Finance Tracker</h1>
          <p>{isRegister ? 'Create Account' : 'Welcome Back'}</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
