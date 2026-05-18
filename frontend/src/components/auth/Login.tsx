// ═══════════════════════════════════════════════════════
//  Login.tsx — Sanestix CRM Authentication Page
//  Glassmorphism dark-mode login with JWT auth flow.
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { useAppDispatch } from '../../store';
import { setCredentials } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../store/api/crmApi';
import './Login.css';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        email,
      }));
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: { message?: string } }; status?: number };
      if (apiErr?.status === 401 || apiErr?.data?.error?.message) {
        setError(apiErr.data?.error?.message ?? 'Invalid email or password.');
      } else if (apiErr?.status === 422) {
        setError('Please enter a valid email address.');
      } else {
        setError('Unable to reach the server. Is the backend running?');
      }
    }
  };

  return (
    <div className="login-root">
      {/* Ambient background orbs */}
      <div className="login-orb login-orb--purple" aria-hidden="true" />
      <div className="login-orb login-orb--blue" aria-hidden="true" />
      <div className="login-orb login-orb--teal" aria-hidden="true" />

      <div className="login-card" role="main">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo" aria-label="Sanestix logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="10" fill="url(#lg1)" />
              <path d="M10 22 L18 10 L26 22" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="18" cy="26" r="2.5" fill="white" />
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="36" y2="36">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="login-brand-name">Sanestix</h1>
          <p className="login-brand-sub">CRM for Software Houses</p>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your workspace</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Email address</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor"
                aria-hidden="true" width="16" height="16">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="admin@sanestix.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                autoComplete="email"
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" viewBox="0 0 20 20" fill="currentColor"
                aria-hidden="true" width="16" height="16">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2
                  2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0
                      001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478
                      3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003
                      2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98
                      9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943
                      9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0
                      11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="login-error" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0
                  11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            className={`login-btn${isLoading ? ' login-btn--loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="login-footer">
          Sanestix CRM &copy; {new Date().getFullYear()} — Sanestix Technologies
        </p>
      </div>
    </div>
  );
};

export default Login;
