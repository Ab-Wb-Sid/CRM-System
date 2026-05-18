// ═══════════════════════════════════════════════════════
//  KanbanCard — Draggable opportunity card
// ═══════════════════════════════════════════════════════
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { NeonBadge } from '../ui/NeonBadge';
import type { Opportunity } from '../../types';

interface KanbanCardProps {
  opportunity: Opportunity;
}

function isStale(lastActivity: string, thresholdDays = 14): boolean {
  const d = new Date(lastActivity);
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diff > thresholdDays;
}

function formatCurrency(v: number) {
  return v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : `$${(v / 1_000).toFixed(0)}K`;
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ opportunity: opp }) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: opp.id });

  const stale = isStale(opp.lastActivityDate);
  const days = daysUntil(opp.estimatedCloseDate);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-xl select-none"
        style={{
          padding: '12px 14px',
          border: stale
            ? '1px solid rgba(255,159,10,0.3)'
            : '1px solid rgba(255,255,255,0.08)',
          boxShadow: stale
            ? '0 0 12px rgba(255,159,10,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
            : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2" style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, flex: 1 }}>
            {opp.title}
          </p>
          {stale && (
            <div title="No activity for 14+ days">
              <AlertTriangle
                size={13}
                style={{ color: 'var(--color-neon-amber)', flexShrink: 0, marginTop: 1 }}
              />
            </div>
          )}
        </div>

        {/* Client */}
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          {opp.clientName}
        </p>

        {/* Deal Type Badge */}
        <div style={{ marginBottom: 10 }}>
          <NeonBadge value={opp.dealType} />
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
          {opp.techStack.slice(0, 3).map(tech => (
            <span
              key={tech}
              style={{
                fontSize: 9, fontWeight: 600, padding: '2px 6px',
                borderRadius: 4, letterSpacing: '0.04em',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-muted)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {tech}
            </span>
          ))}
          {opp.techStack.length > 3 && (
            <span style={{ fontSize: 9, color: 'var(--color-text-muted)', padding: '2px 4px' }}>
              +{opp.techStack.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1">
            <DollarSign size={11} style={{ color: 'var(--color-neon-green)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neon-green)' }}>
              {formatCurrency(opp.expectedValue)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={10} style={{ color: days < 7 ? 'var(--color-neon-red)' : 'var(--color-text-muted)' }} />
            <span style={{
              fontSize: 10,
              color: days < 0 ? 'var(--color-neon-red)' : days < 7 ? 'var(--color-neon-amber)' : 'var(--color-text-muted)',
            }}>
              {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
            </span>
          </div>
          <div
            className="flex items-center justify-center rounded-md font-bold"
            style={{
              width: 22, height: 22, fontSize: 9,
              background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
              color: '#fff',
            }}
            title={opp.assignedPM}
          >
            {opp.pmAvatar}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
