import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  expenses: [],
  loading: false,
  error: null,
  totalAmount: 0,
  filterCategory: 'all',
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    fetchExpensesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchExpensesSuccess: (state, action) => {
      state.loading = false;
      state.expenses = action.payload;
      state.totalAmount = action.payload.reduce((sum, exp) => sum + exp.amount, 0);
    },
    fetchExpensesError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    addExpense: (state, action) => {
      state.expenses.push(action.payload);
      state.totalAmount += action.payload.amount;
    },
    updateExpense: (state, action) => {
      const index = state.expenses.findIndex((exp) => exp.id === action.payload.id);
      if (index !== -1) {
        const oldAmount = state.expenses[index].amount;
        state.expenses[index] = action.payload;
        state.totalAmount = state.totalAmount - oldAmount + action.payload.amount;
      }
    },
    deleteExpense: (state, action) => {
      const index = state.expenses.findIndex((exp) => exp.id === action.payload);
      if (index !== -1) {
        state.totalAmount -= state.expenses[index].amount;
        state.expenses.splice(index, 1);
      }
    },
    setFilterCategory: (state, action) => {
      state.filterCategory = action.payload;
    },
  },
});

export const {
  fetchExpensesStart,
  fetchExpensesSuccess,
  fetchExpensesError,
  addExpense,
  updateExpense,
  deleteExpense,
  setFilterCategory,
} = expenseSlice.actions;

export default expenseSlice.reducer;
