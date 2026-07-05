import { describe, expect, it } from 'vitest';

import type { Investment } from '../../types/domain';
import reducer, { added, fetchSuccess, removed } from './investmentSlice';

const investment = (id: string, amount: number, currentValue: number): Investment => ({
  id,
  name: 'Fund',
  type: 'etf',
  amount,
  currentValue,
  purchaseDate: '2026-01-01',
  notes: null,
});

describe('investmentSlice', () => {
  it('computes invested and returns on fetchSuccess', () => {
    const state = reducer(
      undefined,
      fetchSuccess([investment('a', 1000, 1100), investment('b', 500, 400)])
    );
    expect(state.totalInvested).toBe(1500);
    // returns = (1100-1000) + (400-500) = 100 - 100 = 0
    expect(state.totalReturns).toBe(0);
  });

  it('adds an investment and updates totals', () => {
    const start = reducer(undefined, fetchSuccess([investment('a', 1000, 1100)]));
    const next = reducer(start, added(investment('b', 200, 250)));
    expect(next.totalInvested).toBe(1200);
    expect(next.totalReturns).toBe(150); // 100 + 50
  });

  it('removes an investment and reverts its contribution to totals', () => {
    const start = reducer(
      undefined,
      fetchSuccess([investment('a', 1000, 1100), investment('b', 200, 250)])
    );
    const next = reducer(start, removed('b'));
    expect(next.items.map((i) => i.id)).toEqual(['a']);
    expect(next.totalInvested).toBe(1000);
    expect(next.totalReturns).toBe(100);
  });
});
