import { describe, expect, it } from 'vitest';

import type { Expense } from '../../types/domain';
import reducer, { added, fetchSuccess, removed } from './expenseSlice';

const expense = (id: string, amount: number): Expense => ({
  id,
  category: 'Food & Dining',
  amount,
  date: '2026-07-01',
  description: null,
});

describe('expenseSlice', () => {
  it('sums amounts on fetchSuccess', () => {
    const state = reducer(undefined, fetchSuccess([expense('a', 10), expense('b', 5.5)]));
    expect(state.items).toHaveLength(2);
    expect(state.totalAmount).toBe(15.5);
    expect(state.loading).toBe(false);
  });

  it('adds an expense and updates the total', () => {
    const start = reducer(undefined, fetchSuccess([expense('a', 10)]));
    const next = reducer(start, added(expense('b', 20)));
    expect(next.items).toHaveLength(2);
    expect(next.totalAmount).toBe(30);
  });

  it('removes an expense and decrements the total', () => {
    const start = reducer(undefined, fetchSuccess([expense('a', 10), expense('b', 20)]));
    const next = reducer(start, removed('a'));
    expect(next.items.map((e) => e.id)).toEqual(['b']);
    expect(next.totalAmount).toBe(20);
  });

  it('ignores removal of an unknown id', () => {
    const start = reducer(undefined, fetchSuccess([expense('a', 10)]));
    const next = reducer(start, removed('does-not-exist'));
    expect(next.items).toHaveLength(1);
    expect(next.totalAmount).toBe(10);
  });
});
