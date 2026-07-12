import { NavLink, useNavigate } from 'react-router-dom';

import { signOut } from '../../auth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { unauthenticated } from '../../store/slices/authSlice';
import { CURRENCY_STORAGE_KEY, currencyChanged } from '../../store/slices/settingsSlice';
import { SUPPORTED_CURRENCIES } from '../../utils/currencies';
import './Navigation.css';

/** Person glyph shown before the signed-in user's name (BR-17 header area). */
function UserIcon() {
  return (
    <svg
      className="user-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

export default function Navigation() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const currency = useAppSelector((state) => state.settings.currency);

  const handleLogout = () => {
    signOut();
    dispatch(unauthenticated());
    navigate('/login');
  };

  const handleCurrencyChange = (code: string) => {
    dispatch(currencyChanged(code));
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    } catch {
      // localStorage unavailable — the choice still applies for this session.
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>💰 Finance Tracker</h1>
        </div>

        {/* NavLink (not <a>) so navigation stays client-side and doesn't drop
            in-memory app state on every click. */}
        <ul className="nav-links">
          <li>
            <NavLink to="/dashboard">Dashboard</NavLink>
          </li>
          <li>
            <NavLink to="/expenses">Expenses</NavLink>
          </li>
          <li>
            <NavLink to="/investments">Investments</NavLink>
          </li>
          <li>
            <NavLink to="/categories">Categories</NavLink>
          </li>
        </ul>

        <div className="nav-user">
          <label className="visually-hidden" htmlFor="currency-select">
            Display currency
          </label>
          <select
            id="currency-select"
            className="currency-select"
            value={currency}
            title="Display currency"
            onChange={(e) => handleCurrencyChange(e.target.value)}
          >
            {SUPPORTED_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code}
              </option>
            ))}
          </select>
          <span className="nav-user-identity">
            <UserIcon />
            <span className="user-email">{user?.email}</span>
          </span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
