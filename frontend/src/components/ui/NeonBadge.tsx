// ═══════════════════════════════════════════════════════
//  NeonBadge — Status & Priority Indicator Chips
// ═══════════════════════════════════════════════════════
import React from 'react';
import type { TaskStatus, TaskPriority, DealType } from '../../types';

type BadgeVariant = TaskStatus | TaskPriority | DealType | string;

const BADGE_STYLES: Record<string, { color: string; bg: string; glow?: string }> = {
  // Task Status
  'Backlog':      { color: 'var(--color-text-muted)',   bg: 'rgba(255,255,255,0.05)' },
  'In Progress':  { color: 'var(--color-neon-blue)',    bg: 'var(--color-neon-blue-dim)', glow: 'rgba(10,132,255,0.3)' },
  'In Review':    { color: 'var(--color-neon-purple)',  bg: 'var(--color-neon-purple-dim)', glow: 'rgba(191,90,242,0.3)' },
  'Done':         { color: 'var(--color-neon-green)',   bg: 'var(--color-neon-green-dim)', glow: 'rgba(0,255,135,0.3)' },
  'Blocked':      { color: 'var(--color-neon-red)',     bg: 'var(--color-neon-red-dim)', glow: 'rgba(255,69,58,0.3)' },
  // Priority
  'Critical':     { color: 'var(--color-neon-red)',     bg: 'var(--color-neon-red-dim)', glow: 'rgba(255,69,58,0.3)' },
  'High':         { color: 'var(--color-neon-amber)',   bg: 'var(--color-neon-amber-dim)', glow: 'rgba(255,159,10,0.3)' },
  'Medium':       { color: 'var(--color-neon-blue)',    bg: 'var(--color-neon-blue-dim)' },
  'Low':          { color: 'var(--color-text-muted)',   bg: 'rgba(255,255,255,0.05)' },
  // Deal Types
  'Staff Augmentation': { color: 'var(--color-neon-green)',  bg: 'var(--color-neon-green-dim)' },
  'Fixed-Cost':         { color: 'var(--color-neon-blue)',   bg: 'var(--color-neon-blue-dim)' },
  'Managed Services':   { color: 'var(--color-neon-purple)', bg: 'var(--color-neon-purple-dim)' },
  // Pipeline Stages
  'Lead':          { color: 'var(--color-text-muted)',   bg: 'rgba(255,255,255,0.06)' },
  'Qualified':     { color: 'var(--color-neon-blue)',    bg: 'var(--color-neon-blue-dim)' },
  'Proposal':      { color: 'var(--color-neon-purple)',  bg: 'var(--color-neon-purple-dim)' },
  'Negotiation':   { color: 'var(--color-neon-amber)',   bg: 'var(--color-neon-amber-dim)' },
  'Closed Won':    { color: 'var(--color-neon-green)',   bg: 'var(--color-neon-green-dim)', glow: 'rgba(0,255,135,0.25)' },
  'Closed Lost':   { color: 'var(--color-neon-red)',     bg: 'var(--color-neon-red-dim)' },
};

interface NeonBadgeProps {
  value: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const NeonBadge: React.FC<NeonBadgeProps> = ({ value, size = 'sm', dot = false }) => {
  const style = BADGE_STYLES[value] ?? { color: 'var(--color-text-secondary)', bg: 'rgba(255,255,255,0.08)' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: 999,
        fontSize: size === 'sm' ? 10 : 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: style.color,
        background: style.bg,
        border: `1px solid ${style.color}30`,
        boxShadow: style.glow ? `0 0 8px ${style.glow}` : undefined,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: style.color,
            boxShadow: style.glow ? `0 0 4px ${style.glow}` : undefined,
            display: 'inline-block',
          }}
        />
      )}
      {value}
    </span>
  );
};
