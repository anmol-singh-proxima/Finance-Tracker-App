import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { investmentAPI } from '../services/api';
import {
  fetchInvestmentsStart,
  fetchInvestmentsSuccess,
  fetchInvestmentsError,
  addInvestment,
  deleteInvestment,
} from '../redux/slices/investmentSlice';
import './Investments.css';

function Investments() {
  const dispatch = useDispatch();
  const { investments, loading, error, totalInvested, totalReturns } = useSelector(
    (state) => state.investments
  );
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    amount: '',
    currentValue: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    dispatch(fetchInvestmentsStart());
    try {
      const response = await investmentAPI.getInvestments();
      dispatch(fetchInvestmentsSuccess(response.data));
    } catch (err) {
      dispatch(fetchInvestmentsError('Failed to load investments'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await investmentAPI.createInvestment({
        ...formData,
        amount: parseFloat(formData.amount),
        currentValue: parseFloat(formData.currentValue),
      });
      dispatch(addInvestment(response.data));
      setFormData({
        name: '',
        type: '',
        amount: '',
        currentValue: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error creating investment:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await investmentAPI.deleteInvestment(id);
      dispatch(deleteInvestment(id));
    } catch (err) {
      console.error('Error deleting investment:', err);
    }
  };

  const returnPercentage =
    totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;

  return (
    <div className="investments">
      <div className="investments-header">
        <h1>Investment Tracker</h1>
        <div className="header-actions">
          <div className="investment-stats">
            <div className="stat">
              <span>Total Invested:</span>
              <strong>${totalInvested.toFixed(2)}</strong>
            </div>
            <div className="stat">
              <span>Total Returns:</span>
              <strong style={{ color: totalReturns > 0 ? '#16a34a' : '#dc2626' }}>
                ${totalReturns.toFixed(2)}
              </strong>
            </div>
            <div className="stat">
              <span>ROI:</span>
              <strong style={{ color: returnPercentage > 0 ? '#16a34a' : '#dc2626' }}>
                {returnPercentage}%
              </strong>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '✕ Close' : '+ Add Investment'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="investment-form-container">
          <form onSubmit={handleSubmit} className="investment-form">
            <div className="form-group">
              <label>Investment Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Apple Stock"
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
              >
                <option value="">Select type</option>
                <option value="stocks">Stocks</option>
                <option value="bonds">Bonds</option>
                <option value="mutual-funds">Mutual Funds</option>
                <option value="etf">ETF</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="real-estate">Real Estate</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Initial Amount</label>
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
              <label>Current Value</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) =>
                  setFormData({ ...formData, currentValue: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
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
        ) : investments.length === 0 ? (
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
              {investments.map((investment) => {
                const returnAmount = investment.currentValue - investment.amount;
                const roi =
                  investment.amount > 0
                    ? ((returnAmount / investment.amount) * 100).toFixed(2)
                    : 0;
                return (
                  <tr key={investment.id}>
                    <td>{investment.name}</td>
                    <td>
                      <span className={`type-badge ${investment.type}`}>
                        {investment.type}
                      </span>
                    </td>
                    <td>
                      {new Date(investment.purchaseDate).toLocaleDateString()}
                    </td>
                    <td>${investment.amount.toFixed(2)}</td>
                    <td>${investment.currentValue.toFixed(2)}</td>
                    <td
                      style={{
                        color: returnAmount > 0 ? '#16a34a' : '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      ${returnAmount.toFixed(2)}
                    </td>
                    <td
                      style={{
                        color: roi > 0 ? '#16a34a' : '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      {roi}%
                    </td>
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

export default Investments;
