import { useCallback } from 'react';

import { useAppSelector } from '../store/hooks';
import { formatCurrency } from '../utils/format';

/**
 * Money formatter bound to the user's selected display currency (BR-17).
 * Every component that renders a monetary value uses this instead of calling
 * formatCurrency directly, so a currency change re-renders the whole app
 * consistently.
 */
export function useCurrencyFormatter(): (value: number) => string {
  const currency = useAppSelector((state) => state.settings.currency);
  return useCallback((value: number) => formatCurrency(value, currency), [currency]);
}
