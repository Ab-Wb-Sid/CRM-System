// ═══════════════════════════════════════════════════════
//  Sidebar — Collapsible Glassmorphic Navigation
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GitBranch, Users, CheckSquare,
  FileText, ChevronLeft, ChevronRight, Zap,
  Settings, HelpCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleSidebar, setActiveView } from '../../store/slices/uiSlice';
import type { UiState } from '../../types';

interface NavItem {
  icon: React.ElementType;
  label: string;
  view: UiState['activeView'];
  accent?: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard', accent: 'var(--color-neon-blue)' },
  { icon: GitBranch, label: 'Pipeline', view: 'pipeline', accent: 'var(--color-neon-purple)', badge: 6 },
  { icon: Users, label: 'Resources', view: 'resources', accent: 'var(--color-neon-green)' },
  { icon: CheckSquare, label: 'Tasks', view: 'tasks', accent: 'var(--color-neon-amber)', badge: 3 },
  { icon: FileText, label: 'Contracts', view: 'contracts', accent: 'var(--color-neon-green)' },
];

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector(s => s.ui.sidebarCollapsed);
  const activeView = useAppSelector(s => s.ui.activeView);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen glass border-r"
      style={{ borderColor: 'var(--color-border)', flexShrink: 0 }}
    >
      {/* ── Logo ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 overflow-hidden" style={{ minHeight: 72 }}>
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
            boxShadow: '0 0 20px rgba(10,132,255,0.4)',
          }}
        >
          <Zap size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                Sanestix
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                CRM Platform
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav Items ───────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.view;
          return (
            <NavItemButton
              key={item.view}
              item={item}
              isActive={isActive}
              collapsed={collapsed}
              onClick={() => dispatch(setActiveView(item.view))}
            />
          );
        })}
      </nav>

      {/* ── Bottom Actions ───────────────────────────────── */}
      <div className="px-2 py-3 flex flex-col gap-1" style={{ borderTop: '1px solid var(--color-border)' }}>
        {[
          { icon: Settings, label: 'Settings' },
          { icon: HelpCircle, label: 'Help' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', width: '100%' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* ── Collapse Toggle ──────────────────────────────── */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute flex items-center justify-center rounded-full cursor-pointer transition-all duration-200"
        style={{
          top: 68, right: -13, width: 26, height: 26,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-bright)',
          color: 'var(--color-text-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 10,
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </motion.aside>
  );
};

// ── NavItemButton ────────────────────────────────────────
interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const NavItemButton: React.FC<NavItemButtonProps> = ({ item, isActive, collapsed, onClick }) => {
  const { icon: Icon, label, accent = 'var(--color-neon-blue)', badge } = item;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="relative flex items-center gap-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
      style={{
        padding: collapsed ? '10px 18px' : '10px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: isActive ? `${accent}18` : 'transparent',
        border: 'none',
        color: isActive ? accent : 'var(--color-text-secondary)',
        width: '100%',
      }}
      title={collapsed ? label : undefined}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute left-0 top-1/2 rounded-r-full"
          style={{
            width: 3, height: 20, background: accent,
            transform: 'translateY(-50%)',
            boxShadow: `0 0 8px ${accent}`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      <Icon size={18} style={{ flexShrink: 0 }} />

      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Badge */}
      {badge && !collapsed && (
        <AnimatePresence>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              fontSize: 10, fontWeight: 700,
              background: accent, color: '#000',
              borderRadius: 999, padding: '1px 6px',
              minWidth: 18, textAlign: 'center',
            }}
          >
            {badge}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.button>
  );
};
