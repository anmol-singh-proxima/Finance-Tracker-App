import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import expenseReducer from './slices/expenseSlice';
import investmentReducer from './slices/investmentSlice';

export default configureStore({
  reducer: {
    auth: authReducer,
    expenses: expenseReducer,
    investments: investmentReducer,
  },
});
