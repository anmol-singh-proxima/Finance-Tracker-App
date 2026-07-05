import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { apiErrorMessage } from '../api/client';
import { listCategories } from '../api/categories';
import { createExpense, deleteExpense, listExpenses } from '../api/expenses';
import ExpenseFiltersBar from '../components/Filters/ExpenseFilters';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { added, fetchError, fetchStart, fetchSuccess, removed } from '../store/slices/expenseSlice';
import type { Category, ExpenseFilters } from '../types/domain';
import { formatCurrency, formatDate } from '../utils/format';
import './Expenses.css';

const emptyForm = () => ({
  category: '',
  amount: '',
  date: new Date().toISOString().split('T')[0] ?? '',
  description: '',
});

export default function Expenses() {
  const dispatch = useAppDispatch();
  const { items, loading, error, totalAmount } = useAppSelector((state) => state.expenses);

  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const loadExpenses = useCallback(
    async (activeFilters: ExpenseFilters) => {
      dispatch(fetchStart());
      try {
        const expenses = await listExpenses(activeFilters);
        dispatch(fetchSuccess(expenses));
      } catch (err) {
        dispatch(fetchError(apiErrorMessage(err, 'Failed to load expenses')));
      }
    },
    [dispatch]
  );

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadExpenses(filters);
  }, [filters, loadExpenses]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const expense = await createExpense({
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || null,
      });
      dispatch(added(expense));
      setFormData(emptyForm());
      setShowForm(false);
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save the expense'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      dispatch(removed(id));
    } catch (err) {
      dispatch(fetchError(apiErrorMessage(err, 'Could not delete the expense')));
    }
  };

  return (
    <div className="expenses">
      <div className="expenses-header">
        <h1>Expense Tracker</h1>
        <div className="header-actions">
          <div className="total-amount">
            <span>Total Expenses:</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Close' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="expense-form-container">
          <form onSubmit={handleSubmit} className="expense-form">
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Amount</label>
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
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a note..."
              />
            </div>

            <button type="submit" className="btn btn-success">
              Save Expense
            </button>
          </form>
        </div>
      )}

      <ExpenseFiltersBar categories={categories} value={filters} onChange={setFilters} />

      <div className="expenses-list">
        <h2>Recent Expenses</h2>
        {loading ? (
          <div className="loading">Loading expenses...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No expenses recorded yet</div>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.date)}</td>
                  <td>
                    <span className="category-badge">{expense.category}</span>
                  </td>
                  <td>{expense.description}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => handleDelete(expense.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
