/**
 * Supported display currencies (BR-17). Adding a currency = adding one entry
 * here; everything else (header selector, formatting, persistence) picks it
 * up. This is a *display* preference: stored amounts carry no currency and
 * are never converted — the chosen currency only drives formatting.
 */

export interface CurrencyOption {
  /** ISO 4217 code, passed straight to Intl.NumberFormat. */
  code: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
];

export const DEFAULT_CURRENCY = 'USD';

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((currency) => currency.code === code);
}
