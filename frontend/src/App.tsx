// ═══════════════════════════════════════════════════════
//  App.tsx — Root component with Redux Provider + Auth Guard
// ═══════════════════════════════════════════════════════
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppShell } from './components/layout/AppShell';
import Login from './components/auth/Login';
import { useAppSelector } from './store';

const AuthGate: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <AppShell /> : <Login />;
};

const App: React.FC = () => (
  <Provider store={store}>
    <AuthGate />
  </Provider>
);

export default App;
