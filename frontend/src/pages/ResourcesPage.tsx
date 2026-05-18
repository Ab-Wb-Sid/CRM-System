// ═══════════════════════════════════════════════════════
//  Resources Page — Heatmap + Developer Cards
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import { ResourceHeatmap } from '../components/heatmap/ResourceHeatmap';
import { GlassCard } from '../components/ui/GlassCard';
import {
  useGetDevelopersQuery,
  useGetHeatmapDataQuery,
} from '../store/api/crmApi';

export const ResourcesPage: React.FC = () => {
  const { data: developers = [] } = useGetDevelopersQuery();
  const { data: heatmapData = [], isLoading } = useGetHeatmapDataQuery();

  const avgUtilization = Math.round(
    heatmapData.reduce((s, c) => s + c.utilizationPct, 0) /
    Math.max(heatmapData.length, 1)
  );

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
      >
        {[
          { label: 'Team Members', value: developers.length, accent: 'var(--color-neon-blue)' },
          { label: 'Avg Utilization', value: `${avgUtilization}%`, accent: avgUtilization > 85 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)' },
          { label: 'Overloaded', value: heatmapData.filter(c => c.utilizationPct > 90).length, accent: 'var(--color-neon-red)' },
          { label: 'Available Slots', value: heatmapData.filter(c => c.utilizationPct < 50).length, accent: 'var(--color-neon-green)' },
        ].map(({ label, value, accent }) => (
          <GlassCard key={label} style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ marginBottom: 24 }}
      >
        {isLoading ? (
          <div className="skeleton rounded-2xl" style={{ height: 320 }} />
        ) : (
          <ResourceHeatmap data={heatmapData} />
        )}
      </motion.div>

      {/* Developer Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
          Developer Profiles
        </h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {developers.map((dev, i) => {
            const thisWeek = heatmapData.find(c => c.developerId === dev.id && c.weekLabel === 'Wk 1');
            const util = thisWeek?.utilizationPct ?? 0;
            const utilColor = util > 90 ? 'var(--color-neon-red)' : util > 70 ? 'var(--color-neon-amber)' : 'var(--color-neon-green)';

            return (
              <motion.div
                key={dev.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard hover style={{ padding: 18 }}>
                  <div className="flex items-start gap-3" style={{ marginBottom: 12 }}>
                    <div
                      className="flex items-center justify-center rounded-xl font-bold flex-shrink-0"
                      style={{
                        width: 42, height: 42, fontSize: 14,
                        background: 'linear-gradient(135deg, var(--color-neon-blue), var(--color-neon-purple))',
                        color: '#fff',
                      }}
                    >
                      {dev.avatar}
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{dev.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{dev.role}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: utilColor }}>{util}%</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>this week</p>
                    </div>
                  </div>

                  {/* Utilization Bar */}
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ height: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${util}%` }}
                      transition={{ duration: 0.8, delay: i * 0.06 + 0.3, ease: 'easeOut' }}
                      className="rounded-full"
                      style={{ height: '100%', background: utilColor, boxShadow: `0 0 8px ${utilColor}` }}
                    />
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1">
                    {dev.skills.map(skill => (
                      <span
                        key={skill}
                        style={{
                          fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
