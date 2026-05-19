// ═══════════════════════════════════════════════════════
//  TopBar — Search, Notifications, User Avatar
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Search, Bell, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { setGlobalSearch, markAllRead, markNotificationRead, addNotification } from '../../store/slices/uiSlice';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  pipeline: 'Sales Pipeline',
  resources: 'Resource Management',
  tasks: 'Task Manager',
  contracts: 'Contracts & Renewals',
};

export const TopBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeView, globalSearchQuery, notifications } = useAppSelector(s => s.ui);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const notifColors: Record<string, string> = {
    success: 'var(--color-neon-green)',
    warning: 'var(--color-neon-amber)',
    error: 'var(--color-neon-red)',
    info: 'var(--color-neon-blue)',
  };

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        height: 64,
        background: 'rgba(7,11,20,0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* ── Page Title ──────────────────────────────────── */}
      <div>
        <motion.h1
          key={activeView}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}
        >
          {PAGE_TITLES[activeView] ?? 'Sanestix CRM'}
        </motion.h1>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Right Controls ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex items-center" style={{ width: 260 }}>
          <Search
            size={14}
            style={{
              position: 'absolute', left: 10,
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search anything..."
            value={globalSearchQuery}
            onChange={e => dispatch(setGlobalSearch(e.target.value))}
            style={{
              width: '100%',
              paddingLeft: 32, paddingRight: 12,
              height: 34, fontSize: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
              borderRadius: 8, color: 'var(--color-text-primary)',
            }}
          />
          {globalSearchQuery && (
            <button
              onClick={() => dispatch(setGlobalSearch(''))}
              style={{
                position: 'absolute', right: 8,
                background: 'none', border: 'none',
                color: 'var(--color-text-muted)', cursor: 'pointer',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              width: 36, height: 36,
              background: notifOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute flex items-center justify-center rounded-full text-black font-bold"
                style={{
                  top: -4, right: -4, width: 16, height: 16, fontSize: 9,
                  background: 'var(--color-neon-amber)',
                  boxShadow: '0 0 6px rgba(255,159,10,0.6)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="glass-card absolute right-0 rounded-xl overflow-hidden"
                style={{ top: 44, width: 340, zIndex: 100 }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Notifications</span>
                  <button
                    onClick={() => dispatch(markAllRead())}
                    style={{ fontSize: 11, color: 'var(--color-neon-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                </div>
                <div className="flex flex-col" style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => dispatch(markNotificationRead(n.id))}
                      className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      <div
                        className="rounded-full flex-shrink-0 mt-0.5"
                        style={{ width: 8, height: 8, background: notifColors[n.type], marginTop: 5, boxShadow: `0 0 6px ${notifColors[n.type]}` }}
                      />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer"
            style={{
              background: userOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="flex items-center justify-center rounded-lg font-bold text-black"
              style={{
                width: 28, height: 28, fontSize: 11,
                background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
              }}
            >
              AK
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>Admin</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Project Manager</p>
            </div>
          </button>

          <AnimatePresence>
            {userOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="glass-card absolute right-0 rounded-xl overflow-hidden"
                style={{ top: 44, width: 190, zIndex: 100 }}
              >
                <button
                  onClick={() => {
                    dispatch(addNotification({
                      type: 'info',
                      title: 'Profile',
                      message: 'Profile editing is not connected to the backend yet.',
                    }));
                    setUserOpen(false);
                  }}
                  style={{ width: '100%', padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}
                >
                  View profile
                </button>
                <button
                  onClick={() => dispatch(logout())}
                  className="flex items-center gap-2"
                  style={{ width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--color-neon-red)', cursor: 'pointer', fontSize: 12 }}
                >
                  <LogOut size={13} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
