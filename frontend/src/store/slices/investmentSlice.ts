import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Investment } from '../../types/domain';

interface InvestmentState {
  items: Investment[];
  loading: boolean;
  error: string | null;
  totalInvested: number;
  totalReturns: number;
}

const initialState: InvestmentState = {
  items: [],
  loading: false,
  error: null,
  totalInvested: 0,
  totalReturns: 0,
};

function totals(investments: Investment[]): { invested: number; returns: number } {
  return investments.reduce(
    (acc, inv) => ({
      invested: acc.invested + inv.amount,
      returns: acc.returns + (inv.currentValue - inv.amount),
    }),
    { invested: 0, returns: 0 }
  );
}

const investmentSlice = createSlice({
  name: 'investments',
  initialState,
  reducers: {
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSuccess: (state, action: PayloadAction<Investment[]>) => {
      state.loading = false;
      state.items = action.payload;
      const { invested, returns } = totals(action.payload);
      state.totalInvested = invested;
      state.totalReturns = returns;
    },
    fetchError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    added: (state, action: PayloadAction<Investment>) => {
      state.items.unshift(action.payload);
      state.totalInvested += action.payload.amount;
      state.totalReturns += action.payload.currentValue - action.payload.amount;
    },
    removed: (state, action: PayloadAction<string>) => {
      const index = state.items.findIndex((inv) => inv.id === action.payload);
      if (index !== -1) {
        const inv = state.items[index]!;
        state.totalInvested -= inv.amount;
        state.totalReturns -= inv.currentValue - inv.amount;
        state.items.splice(index, 1);
      }
    },
  },
});

export const { fetchStart, fetchSuccess, fetchError, added, removed } = investmentSlice.actions;
export default investmentSlice.reducer;
