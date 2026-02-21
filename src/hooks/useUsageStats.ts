import { useState, useEffect, useCallback } from 'react';

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
            const res = await fetch(`http://localhost:3000/api/usage?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
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
