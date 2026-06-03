import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { API_BASE, useGetReportQuery } from '../store/api/crmApi';
import { useAppDispatch, useAppSelector } from '../store';
import { addNotification } from '../store/slices/uiSlice';
import type { ReportType } from '../types';

const REPORT_OPTIONS: Array<{
  type: ReportType;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    type: 'dashboard',
    title: 'Executive Snapshot',
    description: 'MRR, ARR, growth, active projects, and open pipeline.',
    accent: 'var(--color-neon-green)',
  },
  {
    type: 'pipeline',
    title: 'Pipeline Report',
    description: 'Opportunities, clients, stages, probabilities, and weighted value.',
    accent: 'var(--color-neon-purple)',
  },
  {
    type: 'resources',
    title: 'Resource Utilization',
    description: 'Current-week capacity, allocated hours, skills, and utilization.',
    accent: 'var(--color-neon-blue)',
  },
  {
    type: 'tasks',
    title: 'Task Delivery',
    description: 'Tasks by status with project, assignee, due date, and creation date.',
    accent: 'var(--color-neon-amber)',
  },
];

const formatHeader = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

const formatCell = (value: string | number | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
};

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('dashboard');
  const token = useAppSelector(state => state.auth.token);
  const dispatch = useAppDispatch();
  const { data, isFetching, refetch } = useGetReportQuery(reportType);
  const [downloading, setDownloading] = useState(false);

  const selectedReport = REPORT_OPTIONS.find(option => option.type === reportType) ?? REPORT_OPTIONS[0];
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/reports/download?report_type=${reportType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('Report download failed.');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `sanestix-${reportType}-report.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      dispatch(addNotification({
        type: 'success',
        title: 'Report downloaded',
        message: `${selectedReport.title} CSV is ready.`,
      }));
    } catch {
      dispatch(addNotification({
        type: 'error',
        title: 'Download failed',
        message: 'The report could not be downloaded. Please try again.',
      }));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        style={{ marginBottom: 22 }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <BarChart3 size={18} style={{ color: 'var(--color-neon-blue)' }} />
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reports</h1>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Generate CRM snapshots and download clean CSV files for analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer"
            style={{
              background: 'var(--color-neon-blue)',
              border: 'none',
              color: '#000',
              fontSize: 12,
              fontWeight: 800,
              opacity: downloading ? 0.65 : 1,
            }}
          >
            <Download size={14} />
            {downloading ? 'Downloading' : 'Download CSV'}
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}
      >
        {REPORT_OPTIONS.map(option => {
          const active = option.type === reportType;
          return (
            <button
              key={option.type}
              onClick={() => setReportType(option.type)}
              className="glass-card rounded-xl cursor-pointer"
              style={{
                padding: 16,
                textAlign: 'left',
                borderColor: active ? `${option.accent}` : 'var(--color-border)',
                boxShadow: active ? `0 0 0 1px ${option.accent}55` : undefined,
              }}
            >
              <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                <FileSpreadsheet size={15} style={{ color: option.accent }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {option.title}
                </span>
              </div>
              <p style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
                {option.description}
              </p>
            </button>
          );
        })}
      </motion.div>

      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex items-center justify-between" style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>{selectedReport.title}</h2>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {data ? `${data.row_count} rows generated ${new Date(data.generated_at).toLocaleString()}` : 'Preparing report preview'}
            </p>
          </div>
          {isFetching && (
            <span style={{ fontSize: 11, color: 'var(--color-neon-blue)', fontWeight: 700 }}>
              Generating...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead style={{ background: 'rgba(7,11,20,0.8)' }}>
              <tr>
                {columns.map(column => (
                  <th
                    key={column}
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      fontSize: 10,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatHeader(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${reportType}-${index}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {columns.map(column => (
                    <td key={column} style={{ padding: '12px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {formatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
              {!isFetching && rows.length === 0 && (
                <tr>
                  <td style={{ padding: 24, fontSize: 12, color: 'var(--color-text-muted)' }}>
                    No rows available for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
