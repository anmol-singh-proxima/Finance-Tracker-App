import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  investments: [],
  loading: false,
  error: null,
  totalInvested: 0,
  totalReturns: 0,
};

const investmentSlice = createSlice({
  name: 'investments',
  initialState,
  reducers: {
    fetchInvestmentsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchInvestmentsSuccess: (state, action) => {
      state.loading = false;
      state.investments = action.payload;
      state.totalInvested = action.payload.reduce((sum, inv) => sum + inv.amount, 0);
      state.totalReturns = action.payload.reduce((sum, inv) => sum + (inv.currentValue - inv.amount), 0);
    },
    fetchInvestmentsError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    addInvestment: (state, action) => {
      state.investments.push(action.payload);
      state.totalInvested += action.payload.amount;
    },
    updateInvestment: (state, action) => {
      const index = state.investments.findIndex((inv) => inv.id === action.payload.id);
      if (index !== -1) {
        const oldAmount = state.investments[index].amount;
        const oldReturns = state.investments[index].currentValue - oldAmount;
        state.investments[index] = action.payload;
        state.totalInvested = state.totalInvested - oldAmount + action.payload.amount;
        state.totalReturns = state.totalReturns - oldReturns + (action.payload.currentValue - action.payload.amount);
      }
    },
    deleteInvestment: (state, action) => {
      const index = state.investments.findIndex((inv) => inv.id === action.payload);
      if (index !== -1) {
        const inv = state.investments[index];
        state.totalInvested -= inv.amount;
        state.totalReturns -= (inv.currentValue - inv.amount);
        state.investments.splice(index, 1);
      }
    },
  },
});

export const {
  fetchInvestmentsStart,
  fetchInvestmentsSuccess,
  fetchInvestmentsError,
  addInvestment,
  updateInvestment,
  deleteInvestment,
} = investmentSlice.actions;

export default investmentSlice.reducer;
