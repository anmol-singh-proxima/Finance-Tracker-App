import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_CURRENCY, isSupportedCurrency } from '../../utils/currencies';

/**
 * App-wide user preferences (BR-17). The display currency persists across
 * sessions via localStorage; the write happens in the header's change handler
 * (reducers stay pure), the read happens once here at store construction.
 */

export const CURRENCY_STORAGE_KEY = 'financeTracker.currency';

interface SettingsState {
  currency: string;
}

function initialCurrency(): string {
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && isSupportedCurrency(stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable (privacy mode) — fall through to the default.
  }
  return DEFAULT_CURRENCY;
}

const initialState: SettingsState = {
  currency: initialCurrency(),
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    currencyChanged: (state, action: PayloadAction<string>) => {
      if (isSupportedCurrency(action.payload)) {
        state.currency = action.payload;
      }
    },
  },
});

export const { currencyChanged } = settingsSlice.actions;
export default settingsSlice.reducer;
