// ═══════════════════════════════════════════════════════
//  UI Slice — Sidebar, active view, search, notifications
// ═══════════════════════════════════════════════════════
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UiState } from '../../types';

const initialState: UiState = {
  sidebarCollapsed: false,
  activeView: 'dashboard',
  globalSearchQuery: '',
  notifications: [
    { id: 'n-001', type: 'warning', title: 'Deal Going Stale', message: 'Helix E-Commerce has had no activity for 20 days.', timestamp: new Date().toISOString(), read: false },
    { id: 'n-002', type: 'success', title: 'Deal Closed Won!', message: 'Polaris SaaS MVP — $320,000 closed by James Whitfield.', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: 'n-003', type: 'info', title: 'Renewal Alert', message: 'Orbis Analytics contract renews in 60 days.', timestamp: new Date(Date.now() - 7200000).toISOString(), read: true },
  ],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setActiveView(state, action: PayloadAction<UiState['activeView']>) {
      state.activeView = action.payload;
    },
    setGlobalSearch(state, action: PayloadAction<string>) {
      state.globalSearchQuery = action.payload;
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const n = state.notifications.find(n => n.id === action.payload);
      if (n) n.read = true;
    },
    markAllRead(state) {
      state.notifications.forEach(n => { n.read = true; });
    },
  },
});

export const {
  toggleSidebar, setSidebarCollapsed, setActiveView,
  setGlobalSearch, markNotificationRead, markAllRead,
} = uiSlice.actions;

export default uiSlice.reducer;
