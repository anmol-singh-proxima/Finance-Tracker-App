import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { apiErrorMessage } from '../api/client';
import { listCategories } from '../api/categories';
import { createInvestment, deleteInvestment, listInvestments } from '../api/investments';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  added,
  fetchError,
  fetchStart,
  fetchSuccess,
  removed,
} from '../store/slices/investmentSlice';
import type { Category } from '../types/domain';
import { toCategoryOptions } from '../utils/categoryOptions';
import { formatDate } from '../utils/format';
import './Investments.css';

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
  const formatMoney = useCurrencyFormatter();
  const { items, loading, error, totalInvested, totalReturns } = useAppSelector(
    (state) => state.investments
  );

  const [categories, setCategories] = useState<Category[]>([]);
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

  // Investment types come from the user's investment categories (BR-18),
  // parents and subcategories both selectable.
  useEffect(() => {
    listCategories('investment')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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
    <div className="page investments">
      <div className="investments-header">
        <h1>Investment Tracker</h1>
        <div className="header-actions">
          <div className="investment-stats">
            <div className="stat">
              <span>Total Invested:</span>
              <strong>{formatMoney(totalInvested)}</strong>
            </div>
            <div className="stat">
              <span>Total Returns:</span>
              <strong className={totalReturns >= 0 ? 'value-gain' : 'value-loss'}>
                {formatMoney(totalReturns)}
              </strong>
            </div>
            <div className="stat">
              <span>ROI:</span>
              <strong className={returnPercentage >= 0 ? 'value-gain' : 'value-loss'}>
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
              <label htmlFor="investment-name">Investment Name</label>
              <input
                id="investment-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Apple Stock"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="investment-type">Category</label>
              <select
                id="investment-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="">Select a category</option>
                {toCategoryOptions(categories).map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="investment-amount">Initial Amount</label>
              <input
                id="investment-amount"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="investment-current-value">Current Value</label>
              <input
                id="investment-current-value"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="investment-purchase-date">Purchase Date</label>
              <input
                id="investment-purchase-date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="investment-notes">Notes</label>
              <textarea
                id="investment-notes"
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
          <div className="table-scroll">
            <table className="investments-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
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
                  const gainClass = returnAmount >= 0 ? 'value-gain' : 'value-loss';
                  return (
                    <tr key={investment.id}>
                      <td>{investment.name}</td>
                      <td>
                        <span className="type-badge">{investment.type}</span>
                      </td>
                      <td>{formatDate(investment.purchaseDate)}</td>
                      <td>{formatMoney(investment.amount)}</td>
                      <td>{formatMoney(investment.currentValue)}</td>
                      <td className={gainClass}>{formatMoney(returnAmount)}</td>
                      <td className={gainClass}>{roi.toFixed(2)}%</td>
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
          </div>
        )}
      </div>
    </div>
  );
}
