// ═══════════════════════════════════════════════════════
//  RevenueChart — MRR/ARR/Pipeline trend line chart
// ═══════════════════════════════════════════════════════
import React from 'react';
import {
  ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Area, AreaChart, Legend,
} from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import type { RevenuePoint } from '../../types';

interface RevenueChartProps {
  data: RevenuePoint[];
}

interface TooltipPayload {
  dataKey: string;
  name: string;
  stroke: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const formatK = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`;

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl" style={{ padding: '12px 16px', minWidth: 160 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: p.stroke }}>{p.name}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {formatK(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => (
  <GlassCard style={{ padding: 20 }}>
    <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Revenue & Pipeline Trend
        </h3>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          Last 8 months
        </p>
      </div>
    </div>

    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#bf5af2" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#bf5af2" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00ff87" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 12 }}
          iconType="circle"
          iconSize={7}
        />
        <Area
          type="monotone" dataKey="mrr" name="MRR"
          stroke="#0a84ff" strokeWidth={2}
          fill="url(#mrrGrad)" dot={false} activeDot={{ r: 4, fill: '#0a84ff' }}
        />
        <Area
          type="monotone" dataKey="pipeline" name="Pipeline"
          stroke="#00ff87" strokeWidth={2}
          fill="url(#pipeGrad)" dot={false} activeDot={{ r: 4, fill: '#00ff87' }}
          strokeDasharray="5 3"
        />
      </AreaChart>
    </ResponsiveContainer>
  </GlassCard>
);
