// ═══════════════════════════════════════════════════════
//  Sanestix CRM — RTK Query API Service
//  Connected to FastAPI backend via fetchBaseQuery.
//  JWT token is automatically attached from Redux auth state.
// ═══════════════════════════════════════════════════════
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Opportunity, Developer, Task, DashboardStats,
  RevenuePoint, HeatmapCell, OpportunityStage, Project,
} from '../../types';

// ── Auth types ─────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface OpportunityCreateRequest {
  title: string;
  client_name: string;
  expected_value: number;
  probability: number;
  stage?: OpportunityStage;
}

export interface OpportunityUpdateRequest {
  id: string;
  title?: string;
  client_name?: string;
  expected_value?: number;
  probability?: number;
  stage?: OpportunityStage;
}

export interface TaskCreateRequest {
  title: string;
  status?: Task['status'];
  due_date?: string | null;
  project_id?: number | null;
  opportunity_id?: number | null;
  assigned_to_developer_id?: number | null;
}

export interface DeveloperWriteRequest {
  name: string;
  role: string;
  email: string;
  weekly_capacity: number;
  skills: string[];
}

// ── Base URL ───────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1';

export const crmApi = createApi({
  reducerPath: 'crmApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers, { getState }) => {
      // Attach JWT Bearer token if present
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Opportunity', 'Task', 'Developer', 'Dashboard'],
  endpoints: (builder) => ({

    // ── Authentication ──────────────────────────────────
    login: builder.mutation<TokenResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // ── Dashboard ──────────────────────────────────────
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/crm/dashboard',
      transformResponse: (raw: Record<string, number>): DashboardStats => ({
        mrr: raw.mrr,
        mrrGrowth: raw.mrr_growth,
        arr: raw.arr,
        activeProjects: raw.active_projects,
        openDeals: raw.open_deals,
        openDealsValue: raw.open_deals_value,
        developerUtilization: raw.developer_utilization,
        teamSize: raw.team_size,
      }),
      providesTags: ['Dashboard'],
    }),

    getRevenuePoints: builder.query<RevenuePoint[], void>({
      query: () => '/crm/revenue?months=12',
    }),

    // ── Opportunities / Kanban ─────────────────────────
    getOpportunities: builder.query<Opportunity[], void>({
      query: () => '/crm/opportunities',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Opportunity' as const, id })),
              { type: 'Opportunity', id: 'LIST' },
            ]
          : [{ type: 'Opportunity', id: 'LIST' }],
    }),

    createOpportunity: builder.mutation<Opportunity, OpportunityCreateRequest>({
      query: (body) => ({
        url: '/crm/opportunities',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Opportunity', id: 'LIST' },
        'Dashboard',
      ],
    }),

    updateOpportunity: builder.mutation<Opportunity, OpportunityUpdateRequest>({
      query: ({ id, ...body }) => ({
        url: `/crm/opportunities/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Opportunity', id },
        { type: 'Opportunity', id: 'LIST' },
        'Dashboard',
      ],
    }),

    deleteOpportunity: builder.mutation<void, string>({
      query: (id) => ({
        url: `/crm/opportunities/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Opportunity', id: 'LIST' },
        'Dashboard',
      ],
    }),

    moveOpportunity: builder.mutation<{ id: string; stage: string }, { id: string; stage: OpportunityStage }>({
      query: ({ id, stage }) => ({
        url: `/crm/opportunities/${id}/stage`,
        method: 'PATCH',
        body: { stage },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Opportunity', id },
        { type: 'Opportunity', id: 'LIST' },
      ],
    }),

    // ── Developers / Heatmap ───────────────────────────
    getDevelopers: builder.query<Developer[], void>({
      query: () => '/crm/developers',
      providesTags: ['Developer'],
    }),

    createDeveloper: builder.mutation<Developer, DeveloperWriteRequest>({
      query: (body) => ({
        url: '/crm/developers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Developer', 'Dashboard'],
    }),

    updateDeveloper: builder.mutation<Developer, DeveloperWriteRequest & { id: string }>({
      query: ({ id, ...body }) => ({
        url: `/crm/developers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Developer', 'Dashboard', { type: 'Task', id: 'LIST' }],
    }),

    deleteDeveloper: builder.mutation<void, string>({
      query: (id) => ({
        url: `/crm/developers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Developer', 'Dashboard'],
    }),

    getHeatmapData: builder.query<HeatmapCell[], void>({
      query: () => '/crm/heatmap?weeks=8',
      providesTags: ['Developer'],
    }),

    getProjects: builder.query<Project[], void>({
      query: () => '/crm/projects',
    }),

    // ── Tasks / Data Grid ─────────────────────────────
    getTasks: builder.query<Task[], void>({
      query: () => '/crm/tasks',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Task' as const, id })),
              { type: 'Task', id: 'LIST' },
            ]
          : [{ type: 'Task', id: 'LIST' }],
    }),

    createTask: builder.mutation<Task, TaskCreateRequest>({
      query: (body) => ({
        url: '/crm/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        'Dashboard',
      ],
    }),

    updateTask: builder.mutation<Task, Partial<Task> & {
      id: string;
      due_date?: string | null;
      project_id?: number | null;
      assigned_to_developer_id?: number | null;
    }>({
      query: ({ id, ...patch }) => ({
        url: `/crm/tasks/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
      ],
    }),

    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/crm/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        'Dashboard',
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetDashboardStatsQuery,
  useGetRevenuePointsQuery,
  useGetOpportunitiesQuery,
  useCreateOpportunityMutation,
  useUpdateOpportunityMutation,
  useDeleteOpportunityMutation,
  useMoveOpportunityMutation,
  useGetDevelopersQuery,
  useCreateDeveloperMutation,
  useUpdateDeveloperMutation,
  useDeleteDeveloperMutation,
  useGetHeatmapDataQuery,
  useGetProjectsQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = crmApi;
