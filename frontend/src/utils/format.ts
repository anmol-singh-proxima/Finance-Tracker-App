/** Formatting helpers shared across the UI. */

/** Format a number as USD, e.g. 1234.5 -> "$1,234.50". */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
