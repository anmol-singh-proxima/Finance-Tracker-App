import { NavLink, useNavigate } from 'react-router-dom';

import { signOut } from '../../auth';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { unauthenticated } from '../../store/slices/authSlice';
import './Navigation.css';

export default function Navigation() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    signOut();
    dispatch(unauthenticated());
    navigate('/login');
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
        </ul>

        <div className="nav-user">
          <span className="user-email">{user?.email}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
