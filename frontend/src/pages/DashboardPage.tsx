// ═══════════════════════════════════════════════════════
//  Dashboard Page — KPIs, Revenue Chart, Quick Metrics
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Briefcase, TrendingUp, Users,
  Activity, Target,
} from 'lucide-react';
import { KpiCard } from '../components/dashboard/KpiCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonBadge } from '../components/ui/NeonBadge';
import {
  useGetDashboardStatsQuery,
  useGetRevenuePointsQuery,
  useGetOpportunitiesQuery,
  useGetTasksQuery,
} from '../store/api/crmApi';

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export const DashboardPage: React.FC = () => {
  const { data: stats } = useGetDashboardStatsQuery();
  const { data: revenue = [] } = useGetRevenuePointsQuery();
  const { data: opportunities = [] } = useGetOpportunitiesQuery();
  const { data: tasks = [] } = useGetTasksQuery();

  const criticalTasks = tasks.filter(t => t.priority === 'Critical' && t.status !== 'Done');
  const inProgress = tasks.filter(t => t.status === 'In Progress');
  const recentOpps = opportunities.slice(0, 4);

  if (!stats) return null;

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* KPI Grid */}
      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}
      >
        {[
          { title: 'Monthly Recurring Revenue', value: stats.mrr, growth: stats.mrrGrowth, format: 'currency' as const, prefix: '$', accent: 'var(--color-neon-green)', icon: DollarSign, subtitle: `${(stats.mrr / 1000).toFixed(0)}K this month` },
          { title: 'Annual Run Rate', value: stats.arr, format: 'currency' as const, prefix: '$', accent: 'var(--color-neon-blue)', icon: TrendingUp },
          { title: 'Open Pipeline', value: stats.openDealsValue, format: 'currency' as const, prefix: '$', accent: 'var(--color-neon-purple)', icon: Target, subtitle: `${stats.openDeals} active deals` },
          { title: 'Active Projects', value: stats.activeProjects, accent: 'var(--color-neon-amber)', icon: Briefcase },
          { title: 'Team Utilization', value: stats.developerUtilization, format: 'percent' as const, suffix: '%', decimals: 1, accent: 'var(--color-neon-green)', icon: Activity, subtitle: `${stats.teamSize} developers` },
          { title: 'Team Size', value: stats.teamSize, accent: 'var(--color-neon-blue)', icon: Users, subtitle: 'Active developers' },
        ].map((kpi, i) => (
          <motion.div key={i} variants={fadeUp}>
            <KpiCard {...kpi} />
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        className="grid gap-4"
        style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24 }}
      >
        <motion.div variants={fadeUp}>
          <RevenueChart data={revenue} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <GlassCard style={{ padding: 20, height: '100%' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              Critical Tasks
            </h3>
            <div className="flex flex-col gap-2">
              {criticalTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-lg"
                  style={{ padding: '8px 10px', background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.15)' }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                      {task.title}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{task.projectName}</p>
                  </div>
                  <NeonBadge value={task.status} />
                </div>
              ))}
              {criticalTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 12 }}>
                  ✅ No critical blockers
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        variants={staggerChildren}
        initial="initial"
        animate="animate"
        className="grid gap-4"
        style={{ gridTemplateColumns: '1fr 1fr' }}
      >
        {/* Recent Opportunities */}
        <motion.div variants={fadeUp}>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              Recent Opportunities
            </h3>
            <div className="flex flex-col gap-2">
              {recentOpps.map(opp => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between rounded-lg"
                  style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>{opp.title}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{opp.clientName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <NeonBadge value={opp.stage} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-neon-green)' }}>
                      ${(opp.expectedValue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* In Progress Tasks */}
        <motion.div variants={fadeUp}>
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>
              In Progress ({inProgress.length})
            </h3>
            <div className="flex flex-col gap-2">
              {inProgress.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg"
                  style={{ padding: '8px 10px', background: 'rgba(10,132,255,0.04)', border: '1px solid rgba(10,132,255,0.1)' }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2, lineHeight: 1.3 }}>{task.title}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{task.assigneeName} · {task.projectName}</p>
                  </div>
                  <div
                    className="flex items-center justify-center rounded font-bold"
                    style={{
                      width: 22, height: 22, fontSize: 9,
                      background: 'rgba(10,132,255,0.2)', color: 'var(--color-neon-blue)',
                      border: '1px solid rgba(10,132,255,0.3)',
                      flexShrink: 0, marginLeft: 8,
                    }}
                    title="Story Points"
                  >
                    {task.storyPoints}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};
