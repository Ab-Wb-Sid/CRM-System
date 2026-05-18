// ═══════════════════════════════════════════════════════
//  Contracts Page — Subscription & Renewal Management
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonBadge } from '../components/ui/NeonBadge';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const CONTRACTS = [
  { id: 'con-001', client: 'Orbis Analytics', type: 'Managed Services', mrr: 8000, renewalDate: '2026-07-15', status: 'Active', daysUntilRenewal: 64 },
  { id: 'con-002', client: 'Polaris Ventures', type: 'Fixed-Cost', mrr: 26600, renewalDate: '2026-08-01', status: 'Active', daysUntilRenewal: 81 },
  { id: 'con-003', client: 'Synthara Inc.', type: 'Managed Services', mrr: 12000, renewalDate: '2026-05-30', status: 'Expiring Soon', daysUntilRenewal: 18 },
  { id: 'con-004', client: 'Nexaflow Labs', type: 'Staff Augmentation', mrr: 14400, renewalDate: '2026-06-10', status: 'Active', daysUntilRenewal: 29 },
  { id: 'con-005', client: 'Helix Systems', type: 'Fixed-Cost', mrr: 17500, renewalDate: '2026-09-20', status: 'Active', daysUntilRenewal: 131 },
  { id: 'con-006', client: 'Crest Digital', type: 'Fixed-Cost', mrr: 10600, renewalDate: '2026-05-22', status: 'Expiring Soon', daysUntilRenewal: 10 },
];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  'Active': { color: 'var(--color-neon-green)', bg: 'rgba(0,255,135,0.1)' },
  'Expiring Soon': { color: 'var(--color-neon-amber)', bg: 'rgba(255,159,10,0.1)' },
  'Expired': { color: 'var(--color-neon-red)', bg: 'rgba(255,69,58,0.1)' },
};

export const ContractsPage: React.FC = () => {
  const totalMRR = CONTRACTS.reduce((s, c) => s + c.mrr, 0);
  const expiringSoon = CONTRACTS.filter(c => c.daysUntilRenewal <= 60);

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
          { label: 'Total Contracts', value: CONTRACTS.length, accent: 'var(--color-neon-blue)' },
          { label: 'Total MRR', value: `$${(totalMRR / 1000).toFixed(1)}K`, accent: 'var(--color-neon-green)' },
          { label: 'Expiring in 60d', value: expiringSoon.length, accent: 'var(--color-neon-amber)' },
          { label: 'ARR', value: `$${(totalMRR * 12 / 1000).toFixed(0)}K`, accent: 'var(--color-neon-purple)' },
        ].map(({ label, value, accent }) => (
          <GlassCard key={label} style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Alerts */}
      {expiringSoon.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl flex items-start gap-3"
          style={{
            padding: '14px 18px', marginBottom: 24,
            background: 'rgba(255,159,10,0.08)',
            border: '1px solid rgba(255,159,10,0.3)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--color-neon-amber)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-neon-amber)', marginBottom: 4 }}>
              {expiringSoon.length} contract{expiringSoon.length > 1 ? 's' : ''} expiring within 60 days
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {expiringSoon.map(c => c.client).join(', ')} — Begin renewal conversations immediately.
            </p>
          </div>
        </motion.div>
      )}

      {/* Contracts Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{
              background: 'rgba(7,11,20,0.8)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <tr>
                {['Client', 'Type', 'MRR', 'Annual Value', 'Renewal Date', 'Days Left', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: 'var(--color-text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTRACTS.map((contract, i) => {
                const sc = STATUS_COLORS[contract.status];
                return (
                  <motion.tr
                    key={contract.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{contract.client}</p>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <NeonBadge value={contract.type} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-neon-green)' }}>
                        ${contract.mrr.toLocaleString()}/mo
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        ${(contract.mrr * 12).toLocaleString()}/yr
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(contract.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: contract.daysUntilRenewal <= 30 ? 'var(--color-neon-red)'
                          : contract.daysUntilRenewal <= 60 ? 'var(--color-neon-amber)'
                          : 'var(--color-text-secondary)',
                      }}>
                        {contract.daysUntilRenewal}d
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        color: sc.color, background: sc.bg, border: `1px solid ${sc.color}30`,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
                        {contract.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        className="flex items-center gap-1 rounded-lg px-3 py-1 cursor-pointer"
                        style={{
                          fontSize: 11, color: 'var(--color-neon-blue)',
                          background: 'rgba(10,132,255,0.1)',
                          border: '1px solid rgba(10,132,255,0.2)',
                        }}
                      >
                        <RefreshCw size={10} /> Renew
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      </motion.div>
    </div>
  );
};
