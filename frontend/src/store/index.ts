import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import investmentReducer from './slices/investmentSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    investments: investmentReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
