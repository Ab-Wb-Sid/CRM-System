// ═══════════════════════════════════════════════════════
//  authSlice.ts — JWT Authentication State
// ═══════════════════════════════════════════════════════
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userEmail: string | null;
}

const TOKEN_KEY = 'sanestix_access_token';
const REFRESH_KEY = 'sanestix_refresh_token';

// Rehydrate from localStorage on app load
const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  userEmail: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ access_token: string; refresh_token: string; email?: string }>
    ) => {
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.isAuthenticated = true;
      state.userEmail = action.payload.email ?? null;
      localStorage.setItem(TOKEN_KEY, action.payload.access_token);
      localStorage.setItem(REFRESH_KEY, action.payload.refresh_token);
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.userEmail = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
