import { apiFetch } from '@/lib/api';
import type { DashboardOverview } from '@/lib/dashboard-types';

export const DASHBOARD_QUERY_KEY = ['dashboard', 'overview'] as const;

export function fetchDashboardOverview() {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}
