// ═══════════════════════════════════════════════════════
//  Sanestix CRM — Redux Store Configuration
// ═══════════════════════════════════════════════════════
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { crmApi } from './api/crmApi';
import uiReducer from './slices/uiSlice';
import kanbanReducer from './slices/kanbanSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    kanban: kanbanReducer,
    auth: authReducer,
    [crmApi.reducerPath]: crmApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(crmApi.middleware),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks — always use these instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
