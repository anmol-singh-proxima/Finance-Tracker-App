import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../redux/slices/authSlice';
import { authAPI } from '../../services/api';
import './Navigation.css';

function Navigation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>💰 Finance Tracker</h1>
        </div>

        <ul className="nav-links">
          <li>
            <a href="/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/expenses">Expenses</a>
          </li>
          <li>
            <a href="/investments">Investments</a>
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

export default Navigation;
