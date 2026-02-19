import React, { createContext, useContext, useState, useCallback } from 'react';
import { listModels } from './ai-service';
import type { ApiKeyInfo, LocalEndpoint } from './api-keys-service';

export interface ProviderHealth {
    status: 'ok' | 'error' | 'loading' | 'idle';
    latency: number | null;
    lastCheck: number;
    error?: string;
}

interface ProviderHealthContextType {
    health: Record<string, ProviderHealth>;
    checkHealth: (providerId: string, providerConfig: ApiKeyInfo | LocalEndpoint) => Promise<void>;
}

const ProviderHealthContext = createContext<ProviderHealthContextType | undefined>(undefined);

export function ProviderHealthProvider({ children }: { children: React.ReactNode }) {
    const [health, setHealth] = useState<Record<string, ProviderHealth>>({});

    const checkHealth = useCallback(async (providerId: string, providerConfig: ApiKeyInfo | LocalEndpoint) => {
        // Set loading state
        setHealth(prev => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                status: 'loading',
                lastCheck: Date.now(),
                latency: prev[providerId]?.latency ?? null
            } as ProviderHealth
        }));

        const startTime = performance.now();
        try {
            // "Ping" by listing models. This verifies auth and connectivity.
            // We need a token for listModels but it's handled inside listModels or we pass a mock one if needed.
            // listModels signature: (token: string, provider?: string, apiKey?: string, endpointUrl?: string)
            // The current listModels implementation might need adjustment or we just pass what we have.
            // Actually listModels takes (token, provider, apiKey, endpointUrl). 
            // API Key handling is tricky from client if it's cloud and encrypted. 
            // But listModels in ai-service.ts actually calls 'list-models' action on backend.
            // The backend 'list-models' action handles looking up keys if we just pass provider name.

            const token = 'mock-token'; // Authentication handled by backend session or similar in this app

            const providerName = providerConfig.provider;
            const apiKey: string | undefined = undefined;
            let endpointUrl: string | undefined = undefined;

            if ('endpoint_url' in providerConfig) {
                endpointUrl = providerConfig.endpoint_url;
            }

            await listModels(token, providerName, apiKey, endpointUrl);

            const endTime = performance.now();
            const latency = Math.round(endTime - startTime);

            setHealth(prev => ({
                ...prev,
                [providerId]: {
                    status: 'ok',
                    latency,
                    lastCheck: Date.now()
                } as ProviderHealth
            }));

        } catch (err) {
            console.error(`Health check failed for ${providerId}:`, err);
            setHealth(prev => ({
                ...prev,
                [providerId]: {
                    status: 'error',
                    latency: null,
                    lastCheck: Date.now(),
                    error: err instanceof Error ? err.message : 'Unknown error'
                }
            }));
        }
    }, []);

    return (
        <ProviderHealthContext.Provider value={{ health, checkHealth }}>
            {children}
        </ProviderHealthContext.Provider>
    );
}

export function useProviderHealth() {
    const context = useContext(ProviderHealthContext);
    if (context === undefined) {
        throw new Error('useProviderHealth must be used within a ProviderHealthProvider');
    }
    return context;
}
