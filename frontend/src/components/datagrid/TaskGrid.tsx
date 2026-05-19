// ═══════════════════════════════════════════════════════
//  TaskGrid — Advanced Data Grid with TanStack Table v8
//  Features: sticky header, sorting, filtering, inline edit
// ═══════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Trash2 } from 'lucide-react';
import { NeonBadge } from '../ui/NeonBadge';
import { InlineEditCell } from './InlineEditCell';
import {
  useDeleteTaskMutation,
  useGetDevelopersQuery,
  useGetProjectsQuery,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from '../../store/api/crmApi';
import type { Developer, Project, Task, TaskStatus, TaskPriority } from '../../types';

const PRIORITY_ORDER: Record<TaskPriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export const TaskGrid: React.FC = () => {
  const { data: tasks = [], isLoading } = useGetTasksQuery();
  const { data: developers = [] } = useGetDevelopersQuery();
  const { data: projects = [] } = useGetProjectsQuery();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleCellEdit = useCallback(
    async (id: string, field: keyof Task, value: unknown) => {
      if (field === 'projectId') {
        await updateTask({ id, project_id: value ? Number(value) : null });
        return;
      }
      if (field === 'assigneeId') {
        await updateTask({ id, assigned_to_developer_id: value ? Number(value) : null });
        return;
      }
      if (field === 'dueDate') {
        await updateTask({
          id,
          due_date: value ? new Date(`${value as string}T12:00:00`).toISOString() : null,
        });
        return;
      }
      await updateTask({ id, [field]: value });
    },
    [updateTask],
  );

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'P',
      size: 42,
      sortingFn: (a, b) =>
        PRIORITY_ORDER[a.original.priority] - PRIORITY_ORDER[b.original.priority],
      cell: ({ getValue }) => {
        const v = getValue() as TaskPriority;
        const colors: Record<TaskPriority, string> = {
          Critical: 'var(--color-neon-red)',
          High: 'var(--color-neon-amber)',
          Medium: 'var(--color-neon-blue)',
          Low: 'var(--color-text-muted)',
        };
        return (
          <div
            title={v}
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: colors[v], margin: '0 auto',
              boxShadow: v === 'Critical' ? `0 0 6px ${colors[v]}` : undefined,
            }}
          />
        );
      },
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Task',
      size: 280,
      cell: ({ getValue, row }) => (
        <InlineEditCell
          value={getValue() as string}
          onCommit={val => handleCellEdit(row.original.id, 'title', val)}
        />
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue, row }) => (
        <StatusSelectCell
          value={getValue() as TaskStatus}
          onChange={val => handleCellEdit(row.original.id, 'status', val)}
        />
      ),
    },
    {
      id: 'projectName',
      accessorKey: 'projectName',
      header: 'Project',
      size: 160,
      cell: ({ row }) => (
        <ProjectSelectCell
          value={row.original.projectId}
          projects={projects}
          onChange={projectId => handleCellEdit(row.original.id, 'projectId', projectId)}
        />
      ),
    },
    {
      id: 'assigneeName',
      accessorKey: 'assigneeName',
      header: 'Assignee',
      size: 130,
      cell: ({ row }) => (
        <AssigneeSelectCell
          value={row.original.assigneeId}
          developers={developers}
          onChange={developerId => handleCellEdit(row.original.id, 'assigneeId', developerId)}
        />
      ),
    },
    {
      id: 'storyPoints',
      accessorKey: 'storyPoints',
      header: 'SP',
      size: 50,
      cell: ({ getValue }) => (
        <div
          className="flex items-center justify-center rounded-md font-bold"
          style={{
            width: 24, height: 24, fontSize: 10, margin: '0 auto',
            background: 'rgba(10,132,255,0.15)',
            color: 'var(--color-neon-blue)',
            border: '1px solid rgba(10,132,255,0.25)',
          }}
        >
          {getValue() as number}
        </div>
      ),
    },
    {
      id: 'epic',
      accessorKey: 'epic',
      header: 'Epic',
      size: 110,
      cell: ({ getValue }) => (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          background: 'rgba(191,90,242,0.12)', color: 'var(--color-neon-purple)',
          border: '1px solid rgba(191,90,242,0.2)',
        }}>
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Due',
      size: 90,
      cell: ({ getValue, row }) => (
        <DueDateCell
          value={getValue() as string}
          onChange={dateValue => handleCellEdit(row.original.id, 'dueDate', dateValue)}
        />
      ),
    },
    {
      id: 'sprint',
      accessorKey: 'sprint',
      header: 'Sprint',
      size: 80,
      cell: ({ getValue }) => (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{getValue() as string}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 42,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => deleteTask(row.original.id)}
          title="Delete task"
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'rgba(255,69,58,0.08)',
            border: '1px solid rgba(255,69,58,0.25)',
            color: 'var(--color-neon-red)',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={12} />
        </button>
      ),
    },
  ], [deleteTask, developers, handleCellEdit, projects]);

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton rounded-xl" style={{ height: 44 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div className="relative flex items-center" style={{ width: 260 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: 12 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {table.getFilteredRowModel().rows.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Table */}
      <div
        className="glass-card rounded-xl overflow-hidden"
        style={{ maxHeight: 480, overflowY: 'auto' }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* Sticky Header */}
          <thead style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'rgba(7,11,20,0.95)',
            backdropFilter: 'blur(12px)',
          }}>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      width: header.column.getSize(),
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span style={{ opacity: 0.5 }}>
                          {header.column.getIsSorted() === 'asc'
                            ? <ArrowUp size={10} />
                            : header.column.getIsSorted() === 'desc'
                            ? <ArrowDown size={10} />
                            : <ArrowUpDown size={10} />
                          }
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row, rowIdx) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: rowIdx * 0.02 }}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      verticalAlign: 'middle',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── StatusSelectCell ─────────────────────────────────────
const STATUS_OPTIONS: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done', 'Blocked'];

interface StatusSelectCellProps {
  value: TaskStatus;
  onChange: (val: TaskStatus) => void;
}

const StatusSelectCell: React.FC<StatusSelectCellProps> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        autoFocus
        value={value}
        onChange={e => { onChange(e.target.value as TaskStatus); setEditing(false); }}
        onBlur={() => setEditing(false)}
        style={{ fontSize: 11, height: 28, borderRadius: 6, minWidth: 100 }}
      >
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }} title="Click to change status">
      <NeonBadge value={value} dot />
    </div>
  );
};

interface ProjectSelectCellProps {
  value: string;
  projects: Project[];
  onChange: (projectId: string) => void;
}

const ProjectSelectCell: React.FC<ProjectSelectCellProps> = ({ value, projects, onChange }) => (
  <select
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    style={{ fontSize: 11, height: 28, borderRadius: 6, minWidth: 140, width: '100%' }}
    title="Assign project"
  >
    <option value="">No project</option>
    {projects.map(project => (
      <option key={project.id} value={project.id}>{project.name}</option>
    ))}
  </select>
);

interface AssigneeSelectCellProps {
  value: string;
  developers: Developer[];
  onChange: (developerId: string) => void;
}

const AssigneeSelectCell: React.FC<AssigneeSelectCellProps> = ({ value, developers, onChange }) => {
  const selectedDeveloper = developers.find(dev => dev.userId === value || dev.id === value);
  return (
    <select
      value={selectedDeveloper?.id ?? ''}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: 11, height: 28, borderRadius: 6, minWidth: 120, width: '100%' }}
      title="Assign resource"
    >
      <option value="">Unassigned</option>
      {developers.map(dev => (
        <option key={dev.id} value={dev.id}>{dev.name}</option>
      ))}
    </select>
  );
};

interface DueDateCellProps {
  value: string;
  onChange: (dateValue: string) => void;
}

const DueDateCell: React.FC<DueDateCellProps> = ({ value, onChange }) => {
  const parsed = value ? new Date(value) : null;
  const dateValue = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : '';

  return (
    <input
      type="date"
      value={dateValue}
      onChange={e => onChange(e.target.value)}
      style={{ fontSize: 11, height: 28, minWidth: 118, padding: '4px 6px' }}
      title="Set due date"
    />
  );
};
