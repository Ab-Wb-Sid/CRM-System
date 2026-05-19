// ═══════════════════════════════════════════════════════
//  Sanestix CRM — Shared TypeScript Types
// ═══════════════════════════════════════════════════════

// ─── Enums ──────────────────────────────────────────────
export type DealType = 'Staff Augmentation' | 'Fixed-Cost' | 'Managed Services';

export type OpportunityStage =
  | 'Lead'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type TaskStatus = 'Backlog' | 'In Progress' | 'In Review' | 'Done' | 'Blocked';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ProjectStatus = 'Kickoff' | 'In Progress' | 'UAT' | 'Delivered';

// ─── Core Entities ──────────────────────────────────────
export interface Client {
  id: string;
  companyName: string;
  industry: string;
  logoInitials: string;
  accentColor: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  dealType: DealType;
  stage: OpportunityStage;
  expectedValue: number;
  probability: number;
  assignedPM: string;
  pmAvatar: string;
  techStack: string[];
  estimatedCloseDate: string;
  lastActivityDate: string;
  storyPoints?: number;
}

export interface Developer {
  id: string;
  userId?: string;
  name: string;
  role: string;
  email?: string;
  avatar: string;
  skills: string[];
  weeklyCapacity: number; // hours/week
  allocations: DeveloperAllocation[];
}

export interface DeveloperAllocation {
  projectId: string;
  projectName: string;
  weekStart: string; // ISO date YYYY-MM-DD (Monday)
  hoursAllocated: number;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number;
  dueDate: string;
  epic: string;
  sprint: string;
  techStack: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  opportunityId?: string;
  name: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: number;
  burnedHours: number;
  estimatedHours: number;
  velocityActual: number;
  velocityEstimated: number;
  techStack: string[];
}

// ─── Dashboard ───────────────────────────────────────────
export interface DashboardStats {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  activeProjects: number;
  openDeals: number;
  openDealsValue: number;
  developerUtilization: number;
  teamSize: number;
}

export interface RevenuePoint {
  month: string;
  mrr: number;
  arr: number;
  pipeline: number;
}

// ─── Heatmap ─────────────────────────────────────────────
export interface HeatmapCell {
  developerId: string;
  developerName: string;
  weekLabel: string;
  weekStart: string;
  utilizationPct: number;
  projectName: string;
}

// ─── UI State ────────────────────────────────────────────
export interface UiState {
  sidebarCollapsed: boolean;
  activeView: 'dashboard' | 'pipeline' | 'resources' | 'tasks' | 'contracts';
  globalSearchQuery: string;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ─── Kanban ───────────────────────────────────────────────
export interface KanbanState {
  columns: Record<OpportunityStage, string[]>; // stage -> opportunity IDs
}
