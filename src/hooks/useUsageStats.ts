import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../lib/constants';

export interface UsageTotals {
    calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost_usd: string;
}

export interface UsageBreakdownRow {
    provider: string;
    model: string;
    calls: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost_usd: string;
}

export interface UsageStats {
    totals: UsageTotals;
    breakdown: UsageBreakdownRow[];
}

const EMPTY: UsageStats = {
    totals: { calls: 0, prompt_tokens: 0, completion_tokens: 0, total_cost_usd: '0' },
    breakdown: [],
};

export function useUsageStats(from: string, to: string) {
    const [data, setData] = useState<UsageStats>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            // Use the dashboard endpoint and map its shape to the simpler UsageStats
            const res = await fetch(`${API_BASE_URL}/api/usage/dashboard?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: any = await res.json();

            // Map UsageDashboardData -> UsageStats (best-effort)
            const totals = {
                calls: json.totals?.this_month_requests || 0,
                prompt_tokens: json.totals?.this_month_prompt_tokens || 0,
                completion_tokens: json.totals?.this_month_completion_tokens || 0,
                total_cost_usd: String(json.totals?.this_month_cost_usd || 0)
            };

            // Flatten models across providers into breakdown rows
            const breakdown = (json.providers || []).flatMap((p: any) => {
                return (p.models || []).map((m: any) => ({
                    provider: p.provider,
                    model: m.model,
                    calls: m.requests || 0,
                    prompt_tokens: m.prompt_tokens || m.month_prompt_tokens || 0,
                    completion_tokens: m.completion_tokens || m.month_completion_tokens || 0,
                    total_cost_usd: String(m.cost_usd || 0)
                }));
            });

            setData({ totals, breakdown });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load usage stats');
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => {
        load();
    }, [load]);

    return { data, loading, error, reload: load };
}
