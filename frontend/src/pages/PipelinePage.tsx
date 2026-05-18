// ═══════════════════════════════════════════════════════
//  Pipeline Page — Kanban Board View
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { GlassCard } from '../components/ui/GlassCard';
import { useGetOpportunitiesQuery } from '../store/api/crmApi';

export const PipelinePage: React.FC = () => {
  const { data: opps = [] } = useGetOpportunitiesQuery();

  const totalPipeline = opps
    .filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost')
    .reduce((s, o) => s + o.expectedValue, 0);

  const wonValue = opps
    .filter(o => o.stage === 'Closed Won')
    .reduce((s, o) => s + o.expectedValue, 0);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Summary Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
      >
        {[
          { label: 'Total Pipeline', value: `$${(totalPipeline / 1000).toFixed(0)}K`, accent: 'var(--color-neon-blue)' },
          { label: 'Closed Won', value: `$${(wonValue / 1000).toFixed(0)}K`, accent: 'var(--color-neon-green)' },
          { label: 'Total Deals', value: opps.length, accent: 'var(--color-neon-purple)' },
          { label: 'Active Deals', value: opps.filter(o => !['Closed Won','Closed Lost'].includes(o.stage)).length, accent: 'var(--color-neon-amber)' },
        ].map(({ label, value, accent }) => (
          <GlassCard key={label} style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Drag & drop cards to advance deals through the pipeline
        </p>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
            style={{
              fontSize: 12, color: 'var(--color-text-secondary)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Filter size={13} /> Filter
          </button>
          <button
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer"
            style={{
              fontSize: 12, fontWeight: 600, color: '#000',
              background: 'var(--color-neon-blue)',
              border: 'none',
            }}
          >
            <Plus size={13} /> Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <KanbanBoard />
      </motion.div>
    </div>
  );
};
