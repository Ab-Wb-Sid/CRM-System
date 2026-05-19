// ═══════════════════════════════════════════════════════
//  Tasks Page — Advanced Data Grid
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { TaskGrid } from '../components/datagrid/TaskGrid';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonBadge } from '../components/ui/NeonBadge';
import { useCreateTaskMutation, useGetTasksQuery } from '../store/api/crmApi';
import { useAppDispatch } from '../store';
import { addNotification } from '../store/slices/uiSlice';
import type { TaskStatus } from '../types';

const STATUS_LIST: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done', 'Blocked'];

export const TasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: tasks = [] } = useGetTasksQuery();
  const [createTask] = useCreateTaskMutation();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('Backlog');

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
            onClick={() => {
              setTaskTitle('');
              setTaskStatus('Backlog');
              setNewTaskOpen(true);
            }}
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

      {newTaskOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setNewTaskOpen(false)}
        >
          <div className="glass-card rounded-xl" style={{ width: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>New Task</h2>
            <input
              autoFocus
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="Task title"
              style={{ width: '100%', marginBottom: 12 }}
            />
            <select
              value={taskStatus}
              onChange={e => setTaskStatus(e.target.value as TaskStatus)}
              style={{ width: '100%', marginBottom: 12 }}
            >
              {STATUS_LIST.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <div className="flex justify-between">
              <button
                onClick={() => setNewTaskOpen(false)}
                className="rounded-lg px-3 py-1.5 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!taskTitle.trim()) {
                    dispatch(addNotification({
                      type: 'warning',
                      title: 'Missing task title',
                      message: 'Enter a task title before saving.',
                    }));
                    return;
                  }
                  await createTask({ title: taskTitle.trim(), status: taskStatus }).unwrap();
                  dispatch(addNotification({
                    type: 'success',
                    title: 'Task created',
                    message: `"${taskTitle.trim()}" was inserted into the database.`,
                  }));
                  setTaskTitle('');
                  setNewTaskOpen(false);
                }}
                className="rounded-lg px-3 py-1.5 cursor-pointer"
                style={{ background: 'var(--color-neon-blue)', border: 'none', color: '#000', fontWeight: 700 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
