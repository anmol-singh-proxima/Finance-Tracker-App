import type { Expense } from '../../types/domain';
import { formatDayLabel } from '../../utils/calendar';
import { formatCurrency } from '../../utils/format';
import Modal from '../Dialogs/Modal';
import './DayDialogs.css';

/**
 * Read-only view of one day's expenses (IMPL-FE-09, BR-16/BR-05). Offers a
 * jump into edit mode so mobile users (whose calendar cells only expose
 * "view") can still reach editing.
 */
interface Props {
  date: string;
  expenses: Expense[];
  onClose: () => void;
  onEdit: () => void;
}

export default function DayViewDialog({ date, expenses, onClose, onEdit }: Props) {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <Modal
      title={formatDayLabel(date)}
      onClose={onClose}
      size="md"
      footer={
        <>
          <span className="day-dialog-total">
            Total: <strong>{formatCurrency(total)}</strong>
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            {expenses.length === 0 ? 'Add Expenses' : 'Edit'}
          </button>
        </>
      }
    >
      {expenses.length === 0 ? (
        <div className="day-dialog-empty">
          <p>No expenses recorded for this day.</p>
          <p className="day-dialog-empty-hint">Use “Add Expenses” below to record one.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="day-table">
            <thead>
              <tr>
                <th scope="col" className="col-sno">
                  S.No
                </th>
                <th scope="col">Item Name</th>
                <th scope="col">Category</th>
                <th scope="col" className="col-price">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr key={expense.id}>
                  <td className="col-sno">{index + 1}</td>
                  <td>{expense.description || <span className="day-table-muted">—</span>}</td>
                  <td>
                    <span className="category-badge">{expense.category}</span>
                  </td>
                  <td className="col-price">{formatCurrency(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
