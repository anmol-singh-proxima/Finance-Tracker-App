/** Formatting helpers shared across the UI. */

import { DEFAULT_CURRENCY } from './currencies';

/**
 * Format a number in the given display currency (BR-17), e.g. 1234.5 ->
 * "$1,234.50" / "₹1,234.50" / "¥1,235". Fraction digits follow the currency's
 * Intl defaults (JPY has none). Components should get a bound formatter from
 * useCurrencyFormatter() rather than calling this directly, so the user's
 * selected currency is applied.
 */
export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY): string {
  return value.toLocaleString('en-US', { style: 'currency', currency });
}

/** Format an ISO date string (YYYY-MM-DD) for display in the user's locale. */
export function formatDate(isoDate: string): string {
  // Parse as a local date (not UTC) so a plain YYYY-MM-DD doesn't shift a day
  // for users in negative-offset timezones.
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString();
}
