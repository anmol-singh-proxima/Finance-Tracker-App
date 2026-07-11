import { useEffect, useRef, useState } from 'react';

import type { ExpenseInput } from '../../api/expenses';
import type { Category, Expense } from '../../types/domain';
import { formatDayLabel } from '../../utils/calendar';
import ConfirmDialog from '../Dialogs/ConfirmDialog';
import Modal from '../Dialogs/Modal';
import './DayDialogs.css';

/**
 * Editable table of one day's expenses (IMPL-FE-09, BR-16/BR-02/BR-11).
 * All edits — field changes, added rows, deletions — are staged locally and
 * only applied when the user clicks "Save Changes"; Cancel discards them.
 * The dialog computes the create/update/delete set; the page owns the API
 * calls and store updates (layering per IMPLEMENTATION-PLAN §2).
 */
export interface DayEditChanges {
  creates: ExpenseInput[];
  updates: { id: string; input: ExpenseInput }[];
  deletes: string[];
}

interface Props {
  date: string;
  expenses: Expense[];
  categories: Category[];
  onCancel: () => void;
  /** Applies the staged changes; rejects with a user-readable Error on failure. */
  onSave: (changes: DayEditChanges) => Promise<void>;
}

interface EditRow {
  key: string;
  /** Backend id, or null for a not-yet-saved row. */
  id: string | null;
  description: string;
  category: string;
  amount: string;
}

let nextRowKey = 0;

function newRow(): EditRow {
  nextRowKey += 1;
  return { key: `new-${nextRowKey}`, id: null, description: '', category: '', amount: '' };
}

function toRows(expenses: Expense[]): EditRow[] {
  // Start empty days with one blank row so "edit" doubles as "add".
  if (expenses.length === 0) {
    return [newRow()];
  }
  return expenses.map((expense) => ({
    key: expense.id,
    id: expense.id,
    description: expense.description ?? '',
    category: expense.category,
    amount: String(expense.amount),
  }));
}

/** A row counts as content when the user has typed anything into it. */
function isBlank(row: EditRow): boolean {
  return row.description.trim() === '' && row.category === '' && row.amount.trim() === '';
}

function validateRow(row: EditRow): string | null {
  if (row.category === '') {
    return 'Select a category';
  }
  const amount = Number(row.amount);
  if (row.amount.trim() === '' || Number.isNaN(amount) || amount <= 0) {
    return 'Enter an amount greater than 0';
  }
  return null;
}

function toInput(row: EditRow, date: string): ExpenseInput {
  return {
    category: row.category,
    amount: Number(row.amount),
    date,
    description: row.description.trim() || null,
  };
}

export default function DayEditDialog({ date, expenses, categories, onCancel, onSave }: Props) {
  const [rows, setRows] = useState<EditRow[]>(() => toRows(expenses));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const focusRowKey = useRef<string | null>(null);

  // Focus the first field of a freshly added row.
  useEffect(() => {
    if (focusRowKey.current) {
      document.getElementById(`edit-desc-${focusRowKey.current}`)?.focus();
      focusRowKey.current = null;
    }
  }, [rows.length]);

  const updateRow = (key: string, patch: Partial<EditRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const row = newRow();
    focusRowKey.current = row.key;
    setRows((current) => [...current, row]);
  };

  const requestDelete = (row: EditRow) => {
    // Deleting a saved expense is destructive → confirm first. Removing a row
    // the user just added (and never saved) is freely reversible → no dialog.
    if (row.id) {
      setPendingDeleteKey(row.key);
    } else {
      setRows((current) => current.filter((r) => r.key !== row.key));
    }
  };

  const confirmDelete = () => {
    const row = rows.find((r) => r.key === pendingDeleteKey);
    if (row?.id) {
      setDeletedIds((current) => [...current, row.id!]);
      setRows((current) => current.filter((r) => r.key !== row.key));
    }
    setPendingDeleteKey(null);
  };

  const handleSave = async () => {
    setSaveError('');
    // Ignore fully blank rows instead of failing validation on them.
    const activeRows = rows.filter((row) => row.id !== null || !isBlank(row));

    const errors: Record<string, string> = {};
    for (const row of activeRows) {
      const error = validateRow(row);
      if (error) {
        errors[row.key] = error;
      }
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const initialById = new Map(expenses.map((expense) => [expense.id, expense]));
    const changes: DayEditChanges = { creates: [], updates: [], deletes: deletedIds };
    for (const row of activeRows) {
      if (row.id === null) {
        changes.creates.push(toInput(row, date));
        continue;
      }
      const initial = initialById.get(row.id);
      const input = toInput(row, date);
      const dirty =
        initial &&
        (initial.category !== input.category ||
          initial.amount !== input.amount ||
          (initial.description ?? null) !== input.description);
      if (dirty) {
        changes.updates.push({ id: row.id, input });
      }
    }

    setSaving(true);
    try {
      await onSave(changes);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the changes');
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Edit Expenses — ${formatDayLabel(date)}`}
      onClose={onCancel}
      size="lg"
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      {saveError && (
        <div className="alert alert-danger" role="alert">
          {saveError}
        </div>
      )}

      <div className="edit-rows">
        <div className="edit-header" aria-hidden="true">
          <span className="edit-header-sno">#</span>
          <span>Item Name</span>
          <span>Category</span>
          <span>Price</span>
          <span className="edit-header-actions" />
        </div>

        {rows.map((row, index) => (
          <div key={row.key} className="edit-row-wrap">
            <div className="edit-row">
              <span className="edit-row-sno" aria-hidden="true">
                {index + 1}
              </span>
              <label className="edit-field">
                <span className="edit-field-label">Item Name</span>
                <input
                  id={`edit-desc-${row.key}`}
                  type="text"
                  value={row.description}
                  maxLength={500}
                  placeholder="e.g. Groceries"
                  aria-label={`Item name, row ${index + 1}`}
                  onChange={(e) => updateRow(row.key, { description: e.target.value })}
                />
              </label>
              <label className="edit-field">
                <span className="edit-field-label">Category</span>
                <select
                  value={row.category}
                  aria-label={`Category, row ${index + 1}`}
                  aria-invalid={rowErrors[row.key] ? true : undefined}
                  onChange={(e) => updateRow(row.key, { category: e.target.value })}
                >
                  <option value="">Select…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="edit-field">
                <span className="edit-field-label">Price</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
                  value={row.amount}
                  placeholder="0.00"
                  aria-label={`Price, row ${index + 1}`}
                  aria-invalid={rowErrors[row.key] ? true : undefined}
                  onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="edit-delete"
                aria-label={`Delete row ${index + 1}`}
                onClick={() => requestDelete(row)}
              >
                Delete
              </button>
            </div>
            {rowErrors[row.key] && (
              <p className="edit-row-error" role="alert">
                {rowErrors[row.key]}
              </p>
            )}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn-secondary edit-add" onClick={addRow}>
        + Add Expense
      </button>

      {pendingDeleteKey && (
        <ConfirmDialog
          title="Delete Expense?"
          message="Are you sure you want to delete this expense? It will be removed when you save changes."
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteKey(null)}
        />
      )}
    </Modal>
  );
}
