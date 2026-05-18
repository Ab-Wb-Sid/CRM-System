// ═══════════════════════════════════════════════════════
//  KpiCard — Animated KPI summary card
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface KpiCardProps {
  title: string;
  value: number;
  growth?: number;
  prefix?: string;
  suffix?: string;
  format?: 'number' | 'currency' | 'percent';
  decimals?: number;
  accent: string;
  icon: React.ElementType;
  subtitle?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title, value, growth, prefix = '', suffix = '',
  format = 'number', decimals = 0, accent, icon: Icon, subtitle,
}) => {
  const isPositive = (growth ?? 0) >= 0;

  return (
    <GlassCard hover style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Accent glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </p>
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} format={format} decimals={decimals} />
      </div>

      {subtitle && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{subtitle}</p>
      )}

      {growth !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5"
          style={{ marginTop: 12 }}
        >
          {isPositive
            ? <TrendingUp size={13} style={{ color: 'var(--color-neon-green)' }} />
            : <TrendingDown size={13} style={{ color: 'var(--color-neon-red)' }} />
          }
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: isPositive ? 'var(--color-neon-green)' : 'var(--color-neon-red)',
          }}>
            {isPositive ? '+' : ''}{growth}% vs last month
          </span>
        </motion.div>
      )}
    </GlassCard>
  );
};
