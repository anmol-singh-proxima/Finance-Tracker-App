/**
 * Calendar-grid math and per-day grouping for the expense calendar
 * (IMPL-FE-09, BR-16). Pure functions — no I/O, no React — so the weekday
 * alignment and totals are unit-testable in isolation.
 */

import type { Expense } from '../types/domain';

/** A day cell in the month grid. `null` marks a leading/trailing blank cell. */
export interface CalendarDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  dayOfMonth: number;
}

export type CalendarCell = CalendarDay | null;

/** Sunday-first weekday headers, matching the grid produced by monthGrid. */
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' })
);

/** Format year/monthIndex/day as an ISO date without any timezone shifting. */
export function toIsoDate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Build the month layout as rows of 7 cells (Sunday → Saturday). Days are
 * aligned to the weekday the month starts on; cells outside the month are
 * `null`, exactly like the blank squares of a printed calendar.
 */
export function monthGrid(year: number, monthIndex: number): CalendarCell[][] {
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const totalDays = daysInMonth(year, monthIndex);

  const cells: CalendarCell[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ date: toIsoDate(year, monthIndex, day), dayOfMonth: day });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Inclusive first/last ISO dates of a month, for the list-endpoint filters. */
export function monthRange(year: number, monthIndex: number): { dateFrom: string; dateTo: string } {
  return {
    dateFrom: toIsoDate(year, monthIndex, 1),
    dateTo: toIsoDate(year, monthIndex, daysInMonth(year, monthIndex)),
  };
}

/** Per-day rollup displayed in a calendar cell. */
export interface DaySummary {
  expenses: Expense[];
  total: number;
}

/** Group a month's expenses by their ISO date, accumulating the day total. */
export function groupExpensesByDate(expenses: Expense[]): Map<string, DaySummary> {
  const byDate = new Map<string, DaySummary>();
  for (const expense of expenses) {
    const day = byDate.get(expense.date);
    if (day) {
      day.expenses.push(expense);
      day.total += expense.amount;
    } else {
      byDate.set(expense.date, { expenses: [expense], total: expense.amount });
    }
  }
  return byDate;
}

/** Human-readable label for an ISO date, e.g. "Friday, July 11, 2026". */
export function formatDayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
