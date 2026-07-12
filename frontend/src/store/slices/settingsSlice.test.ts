import { describe, expect, it } from 'vitest';

import reducer, { currencyChanged } from './settingsSlice';

describe('settingsSlice', () => {
  it('defaults to USD', () => {
    const state = reducer(undefined, { type: 'init' });
    expect(state.currency).toBe('USD');
  });

  it('changes to a supported currency', () => {
    const state = reducer(undefined, currencyChanged('INR'));
    expect(state.currency).toBe('INR');
  });

  it('ignores an unsupported currency code', () => {
    const state = reducer(undefined, currencyChanged('XXX'));
    expect(state.currency).toBe('USD');
  });
});
