import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Expense } from '../../types/domain';

interface ExpenseState {
  items: Expense[];
  loading: boolean;
  error: string | null;
  // Client-side sum for the page header only. The authoritative totals shown on
  // the dashboard come from the backend (/dashboard/summary), computed in SQL.
  totalAmount: number;
}

const initialState: ExpenseState = {
  items: [],
  loading: false,
  error: null,
  totalAmount: 0,
};

function sumAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, exp) => sum + exp.amount, 0);
}

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSuccess: (state, action: PayloadAction<Expense[]>) => {
      state.loading = false;
      state.items = action.payload;
      state.totalAmount = sumAmount(action.payload);
    },
    fetchError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    added: (state, action: PayloadAction<Expense>) => {
      state.items.unshift(action.payload);
      state.totalAmount += action.payload.amount;
    },
    removed: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex((exp) => exp.id === action.payload);
      if (index !== -1) {
        state.totalAmount -= state.items[index]!.amount;
        state.items.splice(index, 1);
      }
    },
  },
});

export const { fetchStart, fetchSuccess, fetchError, added, removed } = expenseSlice.actions;
export default expenseSlice.reducer;
