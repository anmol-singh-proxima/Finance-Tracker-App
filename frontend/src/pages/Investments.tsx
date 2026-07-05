import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { apiErrorMessage } from '../api/client';
import { createInvestment, deleteInvestment, listInvestments } from '../api/investments';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  added,
  fetchError,
  fetchStart,
  fetchSuccess,
  removed,
} from '../store/slices/investmentSlice';
import { formatCurrency, formatDate } from '../utils/format';
import './Investments.css';

// Investment types are free-text on the backend (no fixed table), so the
// dropdown options stay a frontend concern — matching the original app.
const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'mutual-funds', label: 'Mutual Funds' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
];

const emptyForm = () => ({
  name: '',
  type: '',
  amount: '',
  currentValue: '',
  purchaseDate: new Date().toISOString().split('T')[0] ?? '',
  notes: '',
});

export default function Investments() {
  const dispatch = useAppDispatch();
  const { items, loading, error, totalInvested, totalReturns } = useAppSelector(
    (state) => state.investments
  );

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const loadInvestments = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const investments = await listInvestments();
      dispatch(fetchSuccess(investments));
    } catch (err) {
      dispatch(fetchError(apiErrorMessage(err, 'Failed to load investments')));
    }
  }, [dispatch]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const investment = await createInvestment({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        currentValue: parseFloat(formData.currentValue),
        purchaseDate: formData.purchaseDate,
        notes: formData.notes || null,
      });
      dispatch(added(investment));
      setFormData(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save the investment'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvestment(id);
      dispatch(removed(id));
    } catch (err) {
      dispatch(fetchError(apiErrorMessage(err, 'Could not delete the investment')));
    }
  };

  const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <div className="investments">
      <div className="investments-header">
        <h1>Investment Tracker</h1>
        <div className="header-actions">
          <div className="investment-stats">
            <div className="stat">
              <span>Total Invested:</span>
              <strong>{formatCurrency(totalInvested)}</strong>
            </div>
            <div className="stat">
              <span>Total Returns:</span>
              <strong style={{ color: totalReturns >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatCurrency(totalReturns)}
              </strong>
            </div>
            <div className="stat">
              <span>ROI:</span>
              <strong style={{ color: returnPercentage >= 0 ? '#16a34a' : '#dc2626' }}>
                {returnPercentage.toFixed(2)}%
              </strong>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Close' : '+ Add Investment'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="investment-form-container">
          <form onSubmit={handleSubmit} className="investment-form">
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="form-group">
              <label>Investment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Apple Stock"
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="">Select type</option>
                {INVESTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Initial Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Current Value</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add investment notes..."
              />
            </div>

            <button type="submit" className="btn btn-success">
              Save Investment
            </button>
          </form>
        </div>
      )}

      <div className="investments-list">
        <h2>My Investments</h2>
        {loading ? (
          <div className="loading">Loading investments...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No investments recorded yet</div>
        ) : (
          <table className="investments-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Purchased</th>
                <th>Initial Amount</th>
                <th>Current Value</th>
                <th>Return</th>
                <th>ROI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((investment) => {
                const returnAmount = investment.currentValue - investment.amount;
                const roi = investment.amount > 0 ? (returnAmount / investment.amount) * 100 : 0;
                const gainColor = returnAmount >= 0 ? '#16a34a' : '#dc2626';
                return (
                  <tr key={investment.id}>
                    <td>{investment.name}</td>
                    <td>
                      <span className="type-badge">{investment.type}</span>
                    </td>
                    <td>{formatDate(investment.purchaseDate)}</td>
                    <td>{formatCurrency(investment.amount)}</td>
                    <td>{formatCurrency(investment.currentValue)}</td>
                    <td style={{ color: gainColor, fontWeight: 600 }}>
                      {formatCurrency(returnAmount)}
                    </td>
                    <td style={{ color: gainColor, fontWeight: 600 }}>{roi.toFixed(2)}%</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(investment.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
