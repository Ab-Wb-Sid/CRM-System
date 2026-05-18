// ═══════════════════════════════════════════════════════
//  Sanestix CRM — Mock Data Seed
// ═══════════════════════════════════════════════════════
import type {
  Opportunity, Developer, Task, DashboardStats,
  RevenuePoint, HeatmapCell,
} from '../types';

const today = new Date();
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().split('T')[0];
};
const subDays = (d: Date, n: number) => addDays(d, -n);
const nextMonday = (offset = 0) => {
  const d = new Date(today);
  const day = d.getDay();
  const diff = (1 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff + offset * 7);
  return d.toISOString().split('T')[0];
};

// ─── Opportunities ───────────────────────────────────────
export const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-001', clientId: 'c-001', clientName: 'Nexaflow Labs',
    title: 'Platform Rebuild — React Native',
    dealType: 'Fixed-Cost', stage: 'Lead', expectedValue: 185000,
    probability: 20, assignedPM: 'Sara Chen', pmAvatar: 'SC',
    techStack: ['React Native', 'FastAPI', 'PostgreSQL'],
    estimatedCloseDate: addDays(today, 45), lastActivityDate: subDays(today, 2), storyPoints: 240,
  },
  {
    id: 'opp-002', clientId: 'c-002', clientName: 'Orbis Analytics',
    title: 'ML Pipeline — Senior Staff Aug',
    dealType: 'Staff Augmentation', stage: 'Qualified', expectedValue: 96000,
    probability: 45, assignedPM: 'James Whitfield', pmAvatar: 'JW',
    techStack: ['Python', 'TensorFlow', 'AWS'],
    estimatedCloseDate: addDays(today, 30), lastActivityDate: subDays(today, 5), storyPoints: undefined,
  },
  {
    id: 'opp-003', clientId: 'c-003', clientName: 'Synthara Inc.',
    title: 'DevOps Modernization',
    dealType: 'Managed Services', stage: 'Proposal', expectedValue: 144000,
    probability: 65, assignedPM: 'Aisha Okonkwo', pmAvatar: 'AO',
    techStack: ['Kubernetes', 'Terraform', 'Azure'],
    estimatedCloseDate: addDays(today, 18), lastActivityDate: subDays(today, 1), storyPoints: undefined,
  },
  {
    id: 'opp-004', clientId: 'c-004', clientName: 'Helix Systems',
    title: 'E-Commerce Overhaul — Full Stack',
    dealType: 'Fixed-Cost', stage: 'Negotiation', expectedValue: 210000,
    probability: 80, assignedPM: 'Sara Chen', pmAvatar: 'SC',
    techStack: ['Next.js', 'Node.js', 'MSSQL'],
    estimatedCloseDate: addDays(today, 10), lastActivityDate: subDays(today, 20), storyPoints: 380,
  },
  {
    id: 'opp-005', clientId: 'c-005', clientName: 'Polaris Ventures',
    title: 'SaaS MVP Development',
    dealType: 'Fixed-Cost', stage: 'Closed Won', expectedValue: 320000,
    probability: 100, assignedPM: 'James Whitfield', pmAvatar: 'JW',
    techStack: ['React', 'FastAPI', 'PostgreSQL', 'Redis'],
    estimatedCloseDate: subDays(today, 5), lastActivityDate: subDays(today, 5), storyPoints: 520,
  },
  {
    id: 'opp-006', clientId: 'c-006', clientName: 'Crest Digital',
    title: 'Mobile App — iOS & Android',
    dealType: 'Fixed-Cost', stage: 'Qualified', expectedValue: 128000,
    probability: 40, assignedPM: 'Aisha Okonkwo', pmAvatar: 'AO',
    techStack: ['Flutter', 'Firebase', 'Node.js'],
    estimatedCloseDate: addDays(today, 35), lastActivityDate: subDays(today, 3), storyPoints: 200,
  },
  {
    id: 'opp-007', clientId: 'c-007', clientName: 'Verdant Tech',
    title: 'ERP Integration — SAP Bridge',
    dealType: 'Fixed-Cost', stage: 'Proposal', expectedValue: 265000,
    probability: 60, assignedPM: 'Sara Chen', pmAvatar: 'SC',
    techStack: ['Java', 'Spring Boot', 'SAP'],
    estimatedCloseDate: addDays(today, 22), lastActivityDate: subDays(today, 7), storyPoints: 410,
  },
  {
    id: 'opp-008', clientId: 'c-008', clientName: 'IronForge Labs',
    title: 'Blockchain Audit Platform',
    dealType: 'Staff Augmentation', stage: 'Closed Lost', expectedValue: 75000,
    probability: 0, assignedPM: 'James Whitfield', pmAvatar: 'JW',
    techStack: ['Solidity', 'Web3.js', 'Node.js'],
    estimatedCloseDate: subDays(today, 15), lastActivityDate: subDays(today, 15), storyPoints: undefined,
  },
];

// ─── Developers ──────────────────────────────────────────
export const mockDevelopers: Developer[] = [
  {
    id: 'dev-001', name: 'Lucas Ferreira', role: 'Senior React Dev', avatar: 'LF',
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL'], weeklyCapacity: 40,
    allocations: [
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(0), hoursAllocated: 36 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(1), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(2), hoursAllocated: 24 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(3), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(4), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(5), hoursAllocated: 32 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(6), hoursAllocated: 8 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(7), hoursAllocated: 16 },
    ],
  },
  {
    id: 'dev-002', name: 'Priya Nambiar', role: 'Python / ML Engineer', avatar: 'PN',
    skills: ['Python', 'FastAPI', 'TensorFlow', 'AWS'], weeklyCapacity: 40,
    allocations: [
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(0), hoursAllocated: 20 },
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(1), hoursAllocated: 16 },
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(2), hoursAllocated: 40 },
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(3), hoursAllocated: 32 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(4), hoursAllocated: 40 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(5), hoursAllocated: 40 },
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(6), hoursAllocated: 24 },
      { projectId: 'proj-003', projectName: 'Orbis ML Pipeline', weekStart: nextMonday(7), hoursAllocated: 8 },
    ],
  },
  {
    id: 'dev-003', name: 'Riko Tanaka', role: 'DevOps / Cloud Architect', avatar: 'RT',
    skills: ['Kubernetes', 'Terraform', 'Azure', 'Docker'], weeklyCapacity: 40,
    allocations: [
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(0), hoursAllocated: 40 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(1), hoursAllocated: 40 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(2), hoursAllocated: 40 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(3), hoursAllocated: 24 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(4), hoursAllocated: 16 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(5), hoursAllocated: 40 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(6), hoursAllocated: 32 },
      { projectId: 'proj-004', projectName: 'Synthara DevOps', weekStart: nextMonday(7), hoursAllocated: 40 },
    ],
  },
  {
    id: 'dev-004', name: 'Amara Diallo', role: 'Full Stack — Node/React', avatar: 'AD',
    skills: ['React', 'Node.js', 'MSSQL', 'Redis'], weeklyCapacity: 40,
    allocations: [
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(0), hoursAllocated: 32 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(1), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(2), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(3), hoursAllocated: 16 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(4), hoursAllocated: 8 },
      { projectId: 'proj-001', projectName: 'Polaris SaaS MVP', weekStart: nextMonday(5), hoursAllocated: 0 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(6), hoursAllocated: 40 },
      { projectId: 'proj-002', projectName: 'Helix E-Commerce', weekStart: nextMonday(7), hoursAllocated: 40 },
    ],
  },
  {
    id: 'dev-005', name: 'Elias Bergström', role: 'Mobile — Flutter/iOS', avatar: 'EB',
    skills: ['Flutter', 'Swift', 'Firebase', 'Dart'], weeklyCapacity: 40,
    allocations: [
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(0), hoursAllocated: 24 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(1), hoursAllocated: 32 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(2), hoursAllocated: 40 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(3), hoursAllocated: 40 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(4), hoursAllocated: 40 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(5), hoursAllocated: 24 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(6), hoursAllocated: 16 },
      { projectId: 'proj-005', projectName: 'Crest Mobile App', weekStart: nextMonday(7), hoursAllocated: 8 },
    ],
  },
];

// ─── Tasks ────────────────────────────────────────────────
export const mockTasks: Task[] = [
  { id: 't-001', projectId: 'proj-001', projectName: 'Polaris SaaS MVP', title: 'Implement OAuth2 login flow', assigneeId: 'dev-001', assigneeName: 'Lucas Ferreira', status: 'In Progress', priority: 'Critical', storyPoints: 8, dueDate: addDays(today, 3), epic: 'Authentication', sprint: 'Sprint 4', techStack: ['React', 'FastAPI'], createdAt: subDays(today, 10) },
  { id: 't-002', projectId: 'proj-001', projectName: 'Polaris SaaS MVP', title: 'Build subscription billing module', assigneeId: 'dev-004', assigneeName: 'Amara Diallo', status: 'In Review', priority: 'High', storyPoints: 13, dueDate: addDays(today, 7), epic: 'Billing', sprint: 'Sprint 4', techStack: ['Node.js', 'Stripe'], createdAt: subDays(today, 8) },
  { id: 't-003', projectId: 'proj-001', projectName: 'Polaris SaaS MVP', title: 'Design onboarding wizard', assigneeId: 'dev-001', assigneeName: 'Lucas Ferreira', status: 'Backlog', priority: 'Medium', storyPoints: 5, dueDate: addDays(today, 14), epic: 'UX', sprint: 'Sprint 5', techStack: ['React'], createdAt: subDays(today, 5) },
  { id: 't-004', projectId: 'proj-002', projectName: 'Helix E-Commerce', title: 'Product catalog API with search', assigneeId: 'dev-004', assigneeName: 'Amara Diallo', status: 'Done', priority: 'High', storyPoints: 8, dueDate: subDays(today, 2), epic: 'Catalog', sprint: 'Sprint 3', techStack: ['Node.js', 'MSSQL'], createdAt: subDays(today, 20) },
  { id: 't-005', projectId: 'proj-002', projectName: 'Helix E-Commerce', title: 'Checkout flow & payment integration', assigneeId: 'dev-001', assigneeName: 'Lucas Ferreira', status: 'In Progress', priority: 'Critical', storyPoints: 13, dueDate: addDays(today, 5), epic: 'Payments', sprint: 'Sprint 4', techStack: ['React', 'Stripe', 'Node.js'], createdAt: subDays(today, 7) },
  { id: 't-006', projectId: 'proj-003', projectName: 'Orbis ML Pipeline', title: 'Feature engineering pipeline', assigneeId: 'dev-002', assigneeName: 'Priya Nambiar', status: 'In Progress', priority: 'High', storyPoints: 21, dueDate: addDays(today, 10), epic: 'ML Core', sprint: 'Sprint 2', techStack: ['Python', 'Pandas', 'AWS'], createdAt: subDays(today, 15) },
  { id: 't-007', projectId: 'proj-003', projectName: 'Orbis ML Pipeline', title: 'Model training CI/CD pipeline', assigneeId: 'dev-003', assigneeName: 'Riko Tanaka', status: 'Blocked', priority: 'Critical', storyPoints: 13, dueDate: addDays(today, 2), epic: 'Infrastructure', sprint: 'Sprint 2', techStack: ['Docker', 'GitHub Actions', 'AWS'], createdAt: subDays(today, 12) },
  { id: 't-008', projectId: 'proj-004', projectName: 'Synthara DevOps', title: 'Kubernetes cluster migration', assigneeId: 'dev-003', assigneeName: 'Riko Tanaka', status: 'In Progress', priority: 'Critical', storyPoints: 34, dueDate: addDays(today, 6), epic: 'Infrastructure', sprint: 'Sprint 1', techStack: ['Kubernetes', 'Azure', 'Terraform'], createdAt: subDays(today, 18) },
  { id: 't-009', projectId: 'proj-004', projectName: 'Synthara DevOps', title: 'Set up observability stack (Grafana)', assigneeId: 'dev-003', assigneeName: 'Riko Tanaka', status: 'Backlog', priority: 'Medium', storyPoints: 8, dueDate: addDays(today, 21), epic: 'Monitoring', sprint: 'Sprint 2', techStack: ['Grafana', 'Prometheus'], createdAt: subDays(today, 3) },
  { id: 't-010', projectId: 'proj-005', projectName: 'Crest Mobile App', title: 'Push notification service', assigneeId: 'dev-005', assigneeName: 'Elias Bergström', status: 'In Review', priority: 'High', storyPoints: 8, dueDate: addDays(today, 4), epic: 'Notifications', sprint: 'Sprint 3', techStack: ['Flutter', 'Firebase'], createdAt: subDays(today, 6) },
  { id: 't-011', projectId: 'proj-005', projectName: 'Crest Mobile App', title: 'Offline mode & data sync', assigneeId: 'dev-005', assigneeName: 'Elias Bergström', status: 'Backlog', priority: 'Medium', storyPoints: 13, dueDate: addDays(today, 18), epic: 'Core', sprint: 'Sprint 4', techStack: ['Flutter', 'Hive'], createdAt: subDays(today, 2) },
  { id: 't-012', projectId: 'proj-001', projectName: 'Polaris SaaS MVP', title: 'Multi-tenant data isolation', assigneeId: 'dev-002', assigneeName: 'Priya Nambiar', status: 'Done', priority: 'Critical', storyPoints: 21, dueDate: subDays(today, 3), epic: 'Architecture', sprint: 'Sprint 3', techStack: ['FastAPI', 'PostgreSQL'], createdAt: subDays(today, 25) },
];

// ─── Dashboard Stats ─────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  mrr: 148500,
  mrrGrowth: 12.4,
  arr: 1782000,
  activeProjects: 5,
  openDeals: 6,
  openDealsValue: 1048000,
  developerUtilization: 84.2,
  teamSize: 5,
};

// ─── Revenue Trend ────────────────────────────────────────
export const mockRevenuePoints: RevenuePoint[] = [
  { month: 'Oct', mrr: 98000, arr: 1176000, pipeline: 680000 },
  { month: 'Nov', mrr: 108000, arr: 1296000, pipeline: 820000 },
  { month: 'Dec', mrr: 115000, arr: 1380000, pipeline: 910000 },
  { month: 'Jan', mrr: 122000, arr: 1464000, pipeline: 780000 },
  { month: 'Feb', mrr: 131000, arr: 1572000, pipeline: 950000 },
  { month: 'Mar', mrr: 138000, arr: 1656000, pipeline: 1020000 },
  { month: 'Apr', mrr: 142000, arr: 1704000, pipeline: 1100000 },
  { month: 'May', mrr: 148500, arr: 1782000, pipeline: 1048000 },
];

// ─── Heatmap Data ─────────────────────────────────────────
export function buildHeatmapData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const weekLabels = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'];

  for (const dev of mockDevelopers) {
    for (let i = 0; i < 8; i++) {
      const ws = nextMonday(i);
      const alloc = dev.allocations.find(a => a.weekStart === ws);
      const hours = alloc?.hoursAllocated ?? 0;
      const utilizationPct = Math.round((hours / dev.weeklyCapacity) * 100);
      cells.push({
        developerId: dev.id,
        developerName: dev.name,
        weekLabel: weekLabels[i],
        weekStart: ws,
        utilizationPct,
        projectName: alloc?.projectName ?? 'Available',
      });
    }
  }
  return cells;
}
