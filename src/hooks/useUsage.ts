import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UsageDashboardData, UsageHistoryPoint } from '../types/usage';
import { API_BASE_URL } from '../lib/constants';

const API_BASE = `${API_BASE_URL}/api/usage`;
const USAGE_DASHBOARD_KEY = ['usage', 'dashboard'];
const USAGE_HISTORY_KEY = ['usage', 'history'];

export function useUsageDashboard() {
    return useQuery<UsageDashboardData>({
        queryKey: USAGE_DASHBOARD_KEY,
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard`);
            if (!res.ok) throw new Error('Failed to load usage dashboard');
            return res.json();
        },
        refetchInterval: 30000,
    });
}

export function useUsageHistory(provider = 'all', period = '30d') {
    return useQuery<UsageHistoryPoint[]>({
        queryKey: [...USAGE_HISTORY_KEY, provider, period],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/history?provider=${encodeURIComponent(provider)}&period=${encodeURIComponent(period)}`);
            if (!res.ok) throw new Error('Failed to load usage history');
            return res.json();
        },
    });
}

export function useUpdateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: { monthly_budget_usd: number; warning_at_percent: number }) => {
            const res = await fetch(`${API_BASE}/budget`, {
                method: 'POST',
                body: JSON.stringify(vars),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to update budget settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USAGE_DASHBOARD_KEY });
        }
    });
}

export function useUpdateRateLimit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (vars: { provider: string; max_requests: number; window_minutes: number; enabled: boolean; warning_percent?: number }) => {
            const res = await fetch(`${API_BASE}/rate-limit-settings/${encodeURIComponent(vars.provider)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    max_requests: vars.max_requests,
                    window_minutes: vars.window_minutes,
                    enabled: vars.enabled,
                    warning_percent: vars.warning_percent ?? 80
                })
            });
            if (!res.ok) throw new Error('Failed to update rate limit settings');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USAGE_DASHBOARD_KEY });
        }
    });
}
