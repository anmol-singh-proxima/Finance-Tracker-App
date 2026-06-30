import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { expenseAPI } from '../services/api';
import {
  fetchExpensesStart,
  fetchExpensesSuccess,
  fetchExpensesError,
  addExpense,
  deleteExpense,
} from '../redux/slices/expenseSlice';
import './Expenses.css';

function Expenses() {
  const dispatch = useDispatch();
  const { expenses, loading, error, totalAmount } = useSelector((state) => state.expenses);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    dispatch(fetchExpensesStart());
    try {
      const response = await expenseAPI.getExpenses();
      dispatch(fetchExpensesSuccess(response.data));
    } catch (err) {
      dispatch(fetchExpensesError('Failed to load expenses'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await expenseAPI.createExpense({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      dispatch(addExpense(response.data));
      setFormData({
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error creating expense:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await expenseAPI.deleteExpense(id);
      dispatch(deleteExpense(id));
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  return (
    <div className="expenses">
      <div className="expenses-header">
        <h1>Expense Tracker</h1>
        <div className="header-actions">
          <div className="total-amount">
            <span>Total Expenses:</span>
            <strong>${totalAmount.toFixed(2)}</strong>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Close' : '+ Add Expense'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="expense-form-container">
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
              >
                <option value="">Select a category</option>
                <option value="food">Food & Dining</option>
                <option value="transport">Transportation</option>
                <option value="utilities">Utilities</option>
                <option value="entertainment">Entertainment</option>
                <option value="health">Health & Medical</option>
                <option value="shopping">Shopping</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Add a note..."
              />
            </div>

            <button type="submit" className="btn btn-success">
              Save Expense
            </button>
          </form>
        </div>
      )}

      <div className="expenses-list">
        <h2>Recent Expenses</h2>
        {loading ? (
          <div className="loading">Loading expenses...</div>
        ) : expenses.length === 0 ? (
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
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td>
                    <span className={`category-badge ${expense.category}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td>{expense.description}</td>
                  <td>${expense.amount.toFixed(2)}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(expense.id)}
                    >
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

export default Expenses;
