// ═══════════════════════════════════════════════════════
//  AppShell — Root layout: Sidebar + TopBar + Content
// ═══════════════════════════════════════════════════════
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAppSelector } from '../../store';
import { DashboardPage } from '../../pages/DashboardPage';
import { PipelinePage } from '../../pages/PipelinePage';
import { ResourcesPage } from '../../pages/ResourcesPage';
import { TasksPage } from '../../pages/TasksPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { ContractsPage } from '../../pages/ContractsPage';

const PAGE_MAP: Record<string, React.FC> = {
  dashboard: DashboardPage,
  pipeline: PipelinePage,
  resources: ResourcesPage,
  tasks: TasksPage,
  reports: ReportsPage,
  contracts: ContractsPage,
};

export const AppShell: React.FC = () => {
  const activeView = useAppSelector(s => s.ui.activeView);
  const ActivePage = PAGE_MAP[activeView] ?? DashboardPage;

  return (
    <div className="flex h-screen overflow-hidden grid-bg">
      {/* Ambient Background Orbs */}
      <div
        style={{
          position: 'fixed', top: -200, left: -100, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(10,132,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: -200, right: -100, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(191,90,242,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{ minHeight: '100%' }}
            >
              <ActivePage />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
