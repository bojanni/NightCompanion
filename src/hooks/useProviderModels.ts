import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProviderModels, refreshProvider } from '../lib/provider-models-service';
import type { NormalizedModel } from '../lib/provider-models-service';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

export interface UseProviderModelsResult {
    /** All live models grouped by provider */
    models: Record<string, NormalizedModel[]>;
    /** Flat list of all models across all providers */
    allModels: NormalizedModel[];
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    /** Refetch all providers */
    refetch: () => void;
    /** Force-refresh a single provider */
    refreshSingle: (provider: string) => Promise<void>;
}

export function useProviderModels(): UseProviderModelsResult {
    const [models, setModels] = useState<Record<string, NormalizedModel[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchProviderModels();
            setModels(data);
            setLastUpdated(new Date());
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load provider models';
            setError(msg);
            // Don't clear existing models on error — keep stale data
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch + periodic refresh
    useEffect(() => {
        load();
        timerRef.current = setInterval(load, REFRESH_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [load]);

    const refreshSingle = useCallback(async (provider: string) => {
        try {
            const updated = await refreshProvider(provider);
            setModels(prev => ({ ...prev, [provider]: updated }));
            setLastUpdated(new Date());
        } catch (e) {
            const msg = e instanceof Error ? e.message : `Failed to refresh ${provider}`;
            setError(msg);
        }
    }, []);

    const allModels = Object.values(models).flat();

    return {
        models,
        allModels,
        isLoading,
        error,
        lastUpdated,
        refetch: load,
        refreshSingle,
    };
}
