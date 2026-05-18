// ═══════════════════════════════════════════════════════
//  Tasks Page — Advanced Data Grid
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { TaskGrid } from '../components/datagrid/TaskGrid';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonBadge } from '../components/ui/NeonBadge';
import { useGetTasksQuery } from '../store/api/crmApi';
import type { TaskStatus } from '../types';

const STATUS_LIST: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done', 'Blocked'];

export const TasksPage: React.FC = () => {
  const { data: tasks = [] } = useGetTasksQuery();

  const statusCounts = STATUS_LIST.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const totalPoints = tasks.reduce((s, t) => s + t.storyPoints, 0);
  const donePoints = tasks.filter(t => t.status === 'Done').reduce((s, t) => s + t.storyPoints, 0);
  const velocity = Math.round((donePoints / totalPoints) * 100);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Status Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-3"
        style={{ marginBottom: 24 }}
      >
        {STATUS_LIST.map(status => (
          <GlassCard key={status} style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <NeonBadge value={status} dot />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {statusCounts[status]}
            </span>
          </GlassCard>
        ))}

        <GlassCard style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Velocity</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neon-green)' }}>{velocity}%</span>
        </GlassCard>

        <div style={{ marginLeft: 'auto' }}>
          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 cursor-pointer font-semibold"
            style={{
              fontSize: 12, color: '#000',
              background: 'var(--color-neon-blue)',
              border: 'none',
            }}
          >
            <Plus size={13} /> New Task
          </button>
        </div>
      </motion.div>

      {/* Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TaskGrid />
      </motion.div>
    </div>
  );
};
