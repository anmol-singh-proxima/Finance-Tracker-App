import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { dashboardAPI } from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getSummary();
        setSummary(response.data);
        setError('');
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return <div className="dashboard"><div className="loading">Loading dashboard...</div></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.email}</h1>
        <p>Your Financial Overview</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Total Expenses</h3>
            <span className="card-icon">💰</span>
          </div>
          <div className="card-value">
            ${summary?.totalExpenses?.toFixed(2) || '0.00'}
          </div>
          <p className="card-subtitle">This month</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Total Investments</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">
            ${summary?.totalInvested?.toFixed(2) || '0.00'}
          </div>
          <p className="card-subtitle">All time</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Investment Returns</h3>
            <span className="card-icon">✨</span>
          </div>
          <div className="card-value" style={{ color: summary?.totalReturns > 0 ? '#16a34a' : '#dc2626' }}>
            ${summary?.totalReturns?.toFixed(2) || '0.00'}
          </div>
          <p className="card-subtitle">{summary?.totalReturns > 0 ? 'Profit' : 'Loss'}</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Net Worth</h3>
            <span className="card-icon">💎</span>
          </div>
          <div className="card-value">
            ${summary?.netWorth?.toFixed(2) || '0.00'}
          </div>
          <p className="card-subtitle">Total assets</p>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <a href="/expenses" className="btn btn-primary">
            + Add Expense
          </a>
          <a href="/investments" className="btn btn-primary">
            + Add Investment
          </a>
          <a href="/expenses" className="btn btn-secondary">
            View All Expenses
          </a>
          <a href="/investments" className="btn btn-secondary">
            View All Investments
          </a>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
