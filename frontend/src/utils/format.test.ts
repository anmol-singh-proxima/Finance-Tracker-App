import { describe, expect, it } from 'vitest';

import { formatCurrency } from './format';

describe('formatCurrency', () => {
  it('defaults to USD with two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats the selected display currency (BR-17)', () => {
    expect(formatCurrency(1234.5, 'INR')).toBe('₹1,234.50');
    expect(formatCurrency(1234.5, 'GBP')).toBe('£1,234.50');
  });

  it('respects zero-decimal currencies', () => {
    expect(formatCurrency(1234.5, 'JPY')).toBe('¥1,235');
  });
});
