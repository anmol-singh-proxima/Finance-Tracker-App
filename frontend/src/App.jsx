import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Investments from './pages/Investments';
import Navigation from './components/Common/Navigation';

function PrivateRoute({ component: Component }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Component /> : <Navigate to="/login" />;
}

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Router>
      <div className="app">
        {isAuthenticated && <Navigation />}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute component={Dashboard} />} />
          <Route path="/expenses" element={<PrivateRoute component={Expenses} />} />
          <Route path="/investments" element={<PrivateRoute component={Investments} />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
