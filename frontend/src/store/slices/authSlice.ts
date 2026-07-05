import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuthUser } from '../../types/domain';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // True until the initial Cognito session check completes, so the router can
  // avoid bouncing a logged-in user to /login on a hard reload.
  initializing: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  initializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authenticated: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.initializing = false;
    },
    unauthenticated: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.initializing = false;
    },
  },
});

export const { authenticated, unauthenticated } = authSlice.actions;
export default authSlice.reducer;
