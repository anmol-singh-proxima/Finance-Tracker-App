import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiErrorMessage } from '../api/client';
import { listCategories } from '../api/categories';
import { createExpense, deleteExpense, listExpenses, updateExpense } from '../api/expenses';
import DayEditDialog, { type DayEditChanges } from '../components/Calendar/DayEditDialog';
import DayViewDialog from '../components/Calendar/DayViewDialog';
import MonthCalendar from '../components/Calendar/MonthCalendar';
import ExpenseCategoryFilter from '../components/Filters/ExpenseFilters';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  added,
  fetchError,
  fetchStart,
  fetchSuccess,
  removed,
  updated,
} from '../store/slices/expenseSlice';
import type { Category } from '../types/domain';
import { MONTH_NAMES, groupExpensesByDate, monthRange, toIsoDate } from '../utils/calendar';
import { formatCurrency } from '../utils/format';
import './Expenses.css';

/**
 * Calendar-based expense management (BR-16, IMPL-FE-09/FE-03). Shows the
 * selected month as a real calendar; each day offers View/Edit dialogs for
 * that day's expenses. The page owns all data loading, saving, and dialog
 * state; the calendar and dialogs are presentational.
 */

function todayParts() {
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth(), day: now.getDate() };
}

// Year selector range: a decade back, one year ahead.
const YEAR_RANGE_BACK = 10;
const YEAR_OPTIONS = Array.from(
  { length: YEAR_RANGE_BACK + 2 },
  (_, i) => todayParts().year - YEAR_RANGE_BACK + i
);

export default function Expenses() {
  const dispatch = useAppDispatch();
  const { items, loading, error, totalAmount } = useAppSelector((state) => state.expenses);

  const today = todayParts();
  const todayIso = toIsoDate(today.year, today.monthIndex, today.day);

  const [year, setYear] = useState(today.year);
  const [monthIndex, setMonthIndex] = useState(today.monthIndex);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');

  const loadMonth = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const expenses = await listExpenses({
        ...monthRange(year, monthIndex),
        category: categoryFilter,
      });
      dispatch(fetchSuccess(expenses));
    } catch (err) {
      dispatch(fetchError(apiErrorMessage(err, 'Failed to load expenses')));
    }
  }, [dispatch, year, monthIndex, categoryFilter]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  // Auto-dismiss the "saved" notice.
  useEffect(() => {
    if (!saveNotice) return;
    const timer = setTimeout(() => setSaveNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [saveNotice]);

  const byDate = useMemo(() => groupExpensesByDate(items), [items]);

  const goToPreviousMonth = () => {
    if (monthIndex === 0) {
      setYear((y) => y - 1);
      setMonthIndex(11);
    } else {
      setMonthIndex((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (monthIndex === 11) {
      setYear((y) => y + 1);
      setMonthIndex(0);
    } else {
      setMonthIndex((m) => m + 1);
    }
  };

  const goToToday = () => {
    setYear(today.year);
    setMonthIndex(today.monthIndex);
  };

  const openQuickAdd = () => {
    // "+ Add Expense" edits today when viewing the current month, otherwise
    // the first day of the selected month.
    const isCurrentMonth = year === today.year && monthIndex === today.monthIndex;
    setEditDate(isCurrentMonth ? todayIso : toIsoDate(year, monthIndex, 1));
  };

  /**
   * Apply the staged create/update/delete set from the Edit dialog. Each
   * successful operation updates the store immediately; if anything fails the
   * month is re-fetched so the UI never shows half-applied state, and the
   * dialog stays open with the error.
   */
  const handleSaveDay = async (changes: DayEditChanges) => {
    const failures: string[] = [];

    for (const id of changes.deletes) {
      try {
        await deleteExpense(id);
        dispatch(removed(id));
      } catch (err) {
        failures.push(apiErrorMessage(err, 'a deletion failed'));
      }
    }
    for (const { id, input } of changes.updates) {
      try {
        dispatch(updated(await updateExpense(id, input)));
      } catch (err) {
        failures.push(apiErrorMessage(err, 'an update failed'));
      }
    }
    for (const input of changes.creates) {
      try {
        dispatch(added(await createExpense(input)));
      } catch (err) {
        failures.push(apiErrorMessage(err, 'a new expense failed to save'));
      }
    }

    if (failures.length > 0) {
      await loadMonth();
      throw new Error(`Some changes could not be saved: ${failures[0]}`);
    }

    setEditDate(null);
    setSaveNotice('Changes saved');
  };

  const monthLabel = `${MONTH_NAMES[monthIndex]} ${year}`;

  return (
    <div className="expenses">
      <div className="expenses-header">
        <h1>Expenses</h1>
        <div className="header-actions">
          <div className="total-amount">
            <span>Total · {monthLabel}</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <button className="btn btn-primary" onClick={openQuickAdd}>
            + Add Expense
          </button>
        </div>
      </div>

      <div className="calendar-toolbar">
        <div className="toolbar-nav">
          <button
            type="button"
            className="toolbar-arrow"
            aria-label="Previous month"
            onClick={goToPreviousMonth}
          >
            ‹
          </button>
          <div className="toolbar-selects">
            <label className="visually-hidden" htmlFor="month-select">
              Month
            </label>
            <select
              id="month-select"
              value={monthIndex}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor="year-select">
              Year
            </label>
            <select id="year-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="toolbar-arrow"
            aria-label="Next month"
            onClick={goToNextMonth}
          >
            ›
          </button>
          <button type="button" className="btn btn-secondary toolbar-today" onClick={goToToday}>
            Today
          </button>
        </div>
        <ExpenseCategoryFilter
          categories={categories}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      <div aria-live="polite">
        {saveNotice && <div className="alert alert-success page-alert">{saveNotice}</div>}
      </div>
      {error && (
        <div className="alert alert-danger page-alert" role="alert">
          {error}{' '}
          <button type="button" className="alert-retry" onClick={loadMonth}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="calendar-skeleton" role="status" aria-label="Loading expenses">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="skeleton-cell" />
          ))}
        </div>
      ) : (
        <MonthCalendar
          year={year}
          monthIndex={monthIndex}
          byDate={byDate}
          todayIso={todayIso}
          onView={setViewDate}
          onEdit={setEditDate}
        />
      )}

      {viewDate && (
        <DayViewDialog
          date={viewDate}
          expenses={byDate.get(viewDate)?.expenses ?? []}
          onClose={() => setViewDate(null)}
          onEdit={() => {
            setEditDate(viewDate);
            setViewDate(null);
          }}
        />
      )}

      {editDate && (
        <DayEditDialog
          date={editDate}
          expenses={byDate.get(editDate)?.expenses ?? []}
          categories={categories}
          onCancel={() => setEditDate(null)}
          onSave={handleSaveDay}
        />
      )}
    </div>
  );
}
