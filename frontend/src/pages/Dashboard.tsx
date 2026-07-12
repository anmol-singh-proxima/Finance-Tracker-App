import { useEffect, useState } from 'react';

import { getBreakdown, getSummary, getTrends } from '../api/dashboard';
import { apiErrorMessage } from '../api/client';
import CategoryBreakdownChart from '../charts/CategoryBreakdownChart';
import SpendingTrendChart from '../charts/SpendingTrendChart';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useAppSelector } from '../store/hooks';
import type { CategoryBreakdownItem, DashboardSummary, TrendPoint } from '../types/domain';
import './Dashboard.css';

export default function Dashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const formatMoney = useCurrencyFormatter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch the three views in parallel; each is an independent server-side
        // aggregate.
        const [summaryData, trendData, breakdownData] = await Promise.all([
          getSummary('month'),
          getTrends(6),
          getBreakdown(),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setTrends(trendData);
        setBreakdown(breakdownData);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load dashboard data'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const returns = summary?.totalReturns ?? 0;

  return (
    <div className="page dashboard">
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
          <div className="card-value">{formatMoney(summary?.totalExpensesThisPeriod ?? 0)}</div>
          <p className="card-subtitle">This month</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Total Investments</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">{formatMoney(summary?.totalInvested ?? 0)}</div>
          <p className="card-subtitle">All time</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Investment Returns</h3>
            <span className="card-icon">✨</span>
          </div>
          <div className={`card-value ${returns >= 0 ? 'value-gain' : 'value-loss'}`}>
            {formatMoney(returns)}
          </div>
          <p className="card-subtitle">{returns >= 0 ? 'Profit' : 'Loss'}</p>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>Net Worth</h3>
            <span className="card-icon">💎</span>
          </div>
          <div className="card-value">{formatMoney(summary?.netWorth ?? 0)}</div>
          <p className="card-subtitle">Total assets</p>
        </div>
      </div>

      <div className="dashboard-charts">
        <section className="chart-panel">
          <h2>Spending Trend</h2>
          <SpendingTrendChart points={trends} />
        </section>
        <section className="chart-panel">
          <h2>Spending by Category</h2>
          <CategoryBreakdownChart items={breakdown} />
        </section>
      </div>
    </div>
  );
}
