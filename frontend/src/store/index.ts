import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import investmentReducer from './slices/investmentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    investments: investmentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
