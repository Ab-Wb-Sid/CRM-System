// ═══════════════════════════════════════════════════════
//  ResourceHeatmap — Developer workload density map
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import type { HeatmapCell } from '../../types';

interface ResourceHeatmapProps {
  data: HeatmapCell[];
}

const WEEK_LABELS = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'];

function getColor(pct: number): { bg: string; text: string; glow: string } {
  if (pct === 0)   return { bg: 'rgba(255,255,255,0.04)', text: 'var(--color-text-muted)', glow: 'transparent' };
  if (pct <= 50)   return { bg: 'rgba(0,255,135,0.12)',   text: 'var(--color-neon-green)', glow: 'rgba(0,255,135,0.2)' };
  if (pct <= 70)   return { bg: 'rgba(0,255,135,0.22)',   text: 'var(--color-neon-green)', glow: 'rgba(0,255,135,0.3)' };
  if (pct <= 90)   return { bg: 'rgba(255,159,10,0.22)',  text: 'var(--color-neon-amber)', glow: 'rgba(255,159,10,0.3)' };
  return             { bg: 'rgba(255,69,58,0.28)',    text: 'var(--color-neon-red)',   glow: 'rgba(255,69,58,0.35)' };
}

function getUtilLabel(pct: number) {
  if (pct === 0)  return 'Free';
  if (pct <= 50)  return 'Light';
  if (pct <= 70)  return 'Moderate';
  if (pct <= 90)  return 'Heavy';
  return 'Overloaded';
}

export const ResourceHeatmap: React.FC<ResourceHeatmapProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ cell: HeatmapCell; x: number; y: number } | null>(null);

  // Get unique developers preserving order
  const developers = Array.from(new Set(data.map(d => d.developerName)));

  return (
    <GlassCard style={{ padding: 20 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Resource Utilization Heatmap
          </h3>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Next 8 weeks · Based on current allocations
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Free', color: 'rgba(0,255,135,0.15)', border: 'rgba(0,255,135,0.3)' },
            { label: 'Moderate', color: 'rgba(255,159,10,0.25)', border: 'rgba(255,159,10,0.4)' },
            { label: 'Overloaded', color: 'rgba(255,69,58,0.3)', border: 'rgba(255,69,58,0.4)' },
          ].map(({ label, color, border }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: `1px solid ${border}` }} />
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 4 }}>
          <thead>
            <tr>
              <th style={{ width: 160, textAlign: 'left', padding: '4px 8px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Developer
              </th>
              {WEEK_LABELS.map(w => (
                <th key={w} style={{ textAlign: 'center', padding: '4px 2px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, minWidth: 64 }}>
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {developers.map((devName, rowIdx) => {
              const devCells = data.filter(d => d.developerName === devName);
              return (
                <motion.tr
                  key={devName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIdx * 0.05 }}
                >
                  <td style={{ padding: '4px 8px' }}>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded-lg font-bold flex-shrink-0"
                        style={{
                          width: 26, height: 26, fontSize: 9,
                          background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
                          color: '#fff',
                        }}
                      >
                        {devName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                        {devName.split(' ')[0]}
                      </span>
                    </div>
                  </td>
                  {devCells.map(cell => {
                    const colors = getColor(cell.utilizationPct);
                    return (
                      <td key={cell.weekLabel} style={{ padding: '4px 2px' }}>
                        <motion.div
                          onMouseEnter={e => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ cell, x: rect.left + rect.width / 2, y: rect.top - 8 });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          whileHover={{ scale: 1.1 }}
                          className="flex items-center justify-center rounded-lg font-bold cursor-default"
                          style={{
                            height: 44, fontSize: 11,
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.glow}`,
                            boxShadow: cell.utilizationPct > 70 ? `0 0 8px ${colors.glow}` : undefined,
                            transition: 'all 0.15s',
                          }}
                        >
                          {cell.utilizationPct > 0 ? `${cell.utilizationPct}%` : '—'}
                        </motion.div>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating Tooltip (portal-less, fixed position) */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="glass-card rounded-xl pointer-events-none"
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              padding: '10px 14px',
              zIndex: 9999,
              minWidth: 180,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {tooltip.cell.developerName}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              {tooltip.cell.weekLabel} · {tooltip.cell.weekStart}
            </p>
            <div className="flex justify-between items-center gap-4">
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Utilization</span>
              <span
                style={{
                  fontSize: 13, fontWeight: 700,
                  color: getColor(tooltip.cell.utilizationPct).text,
                }}
              >
                {tooltip.cell.utilizationPct}%
              </span>
            </div>
            <div className="flex justify-between items-center gap-4" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Status</span>
              <span style={{ fontSize: 11, color: getColor(tooltip.cell.utilizationPct).text }}>
                {getUtilLabel(tooltip.cell.utilizationPct)}
              </span>
            </div>
            {tooltip.cell.projectName !== 'Available' && (
              <div className="flex justify-between items-center gap-4" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Project</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-primary)', fontWeight: 500, maxWidth: 120, textAlign: 'right' }}>
                  {tooltip.cell.projectName}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
