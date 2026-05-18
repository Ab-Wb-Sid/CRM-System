// ═══════════════════════════════════════════════════════
//  Sanestix CRM — RTK Query API Service
//  Connected to FastAPI backend via fetchBaseQuery.
//  JWT token is automatically attached from Redux auth state.
// ═══════════════════════════════════════════════════════
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Opportunity, Developer, Task, DashboardStats,
  RevenuePoint, HeatmapCell, OpportunityStage,
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

// ── Base URL ───────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001/api/v1';

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

    getHeatmapData: builder.query<HeatmapCell[], void>({
      query: () => '/crm/heatmap?weeks=8',
      providesTags: ['Developer'],
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

    updateTask: builder.mutation<{ id: string; status: string }, Partial<Task> & { id: string }>({
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
  }),
});

export const {
  useLoginMutation,
  useGetDashboardStatsQuery,
  useGetRevenuePointsQuery,
  useGetOpportunitiesQuery,
  useMoveOpportunityMutation,
  useGetDevelopersQuery,
  useGetHeatmapDataQuery,
  useGetTasksQuery,
  useUpdateTaskMutation,
} = crmApi;
