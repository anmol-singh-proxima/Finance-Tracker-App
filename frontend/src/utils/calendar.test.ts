import { describe, expect, it } from 'vitest';

import type { Expense } from '../types/domain';
import { daysInMonth, groupExpensesByDate, monthGrid, monthRange, toIsoDate } from './calendar';

const expense = (id: string, date: string, amount: number): Expense => ({
  id,
  category: 'Food & Dining',
  amount,
  date,
  description: null,
});

describe('toIsoDate', () => {
  it('zero-pads month and day', () => {
    expect(toIsoDate(2026, 0, 5)).toBe('2026-01-05');
    expect(toIsoDate(2026, 11, 31)).toBe('2026-12-31');
  });
});

describe('daysInMonth', () => {
  it('handles regular, leap, and non-leap February', () => {
    expect(daysInMonth(2026, 6)).toBe(31); // July 2026
    expect(daysInMonth(2024, 1)).toBe(29); // leap year
    expect(daysInMonth(2026, 1)).toBe(28);
  });
});

describe('monthGrid', () => {
  it('aligns days to the starting weekday (Feb 2024 starts on Thursday)', () => {
    const weeks = monthGrid(2024, 1);
    const firstWeek = weeks[0]!;
    expect(firstWeek.slice(0, 4)).toEqual([null, null, null, null]);
    expect(firstWeek[4]).toEqual({ date: '2024-02-01', dayOfMonth: 1 });
  });

  it('produces rows of exactly 7 cells covering every day once', () => {
    const weeks = monthGrid(2026, 6); // July 2026
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
    const days = weeks.flat().filter((cell) => cell !== null);
    expect(days).toHaveLength(31);
    expect(days[0]!.dayOfMonth).toBe(1);
    expect(days[30]!.dayOfMonth).toBe(31);
  });

  it('pads the trailing week with blanks', () => {
    const weeks = monthGrid(2024, 1); // Feb 2024 ends on Thursday
    const lastWeek = weeks[weeks.length - 1]!;
    expect(lastWeek[4]).toEqual({ date: '2024-02-29', dayOfMonth: 29 });
    expect(lastWeek[5]).toBeNull();
    expect(lastWeek[6]).toBeNull();
  });
});

describe('monthRange', () => {
  it('returns the inclusive first and last day of the month', () => {
    expect(monthRange(2026, 6)).toEqual({ dateFrom: '2026-07-01', dateTo: '2026-07-31' });
    expect(monthRange(2024, 1)).toEqual({ dateFrom: '2024-02-01', dateTo: '2024-02-29' });
  });
});

describe('groupExpensesByDate', () => {
  it('groups expenses by date and accumulates day totals', () => {
    const byDate = groupExpensesByDate([
      expense('a', '2026-07-01', 10),
      expense('b', '2026-07-01', 5.5),
      expense('c', '2026-07-02', 3),
    ]);
    expect(byDate.get('2026-07-01')?.expenses.map((e) => e.id)).toEqual(['a', 'b']);
    expect(byDate.get('2026-07-01')?.total).toBe(15.5);
    expect(byDate.get('2026-07-02')?.total).toBe(3);
    expect(byDate.get('2026-07-03')).toBeUndefined();
  });

  it('returns an empty map for no expenses', () => {
    expect(groupExpensesByDate([]).size).toBe(0);
  });
});
