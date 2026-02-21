import React, { createContext, useContext, useReducer, useMemo } from 'react';

export interface UsageEntry {
    action: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    timestamp: number;
}

interface SessionStats {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCostUsd: number;
    entries: UsageEntry[];
    sessionId: string;
}

interface SessionStatsContextValue {
    stats: SessionStats;
    addUsage: (entry: Omit<UsageEntry, 'timestamp'>) => void;
    resetSession: () => void;
}

function makeSessionId(): string {
    try {
        let id = sessionStorage.getItem('nc_session_id');
        if (!id) {
            id = crypto.randomUUID();
            sessionStorage.setItem('nc_session_id', id);
        }
        return id;
    } catch {
        return crypto.randomUUID();
    }
}

const SESSION_ID = makeSessionId();

const initialState: SessionStats = {
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    entries: [],
    sessionId: SESSION_ID,
};

type Action =
    | { type: 'ADD_USAGE'; entry: UsageEntry }
    | { type: 'RESET' };

function reducer(state: SessionStats, action: Action): SessionStats {
    switch (action.type) {
        case 'ADD_USAGE':
            return {
                ...state,
                calls: state.calls + 1,
                promptTokens: state.promptTokens + action.entry.promptTokens,
                completionTokens: state.completionTokens + action.entry.completionTokens,
                estimatedCostUsd: state.estimatedCostUsd + action.entry.estimatedCostUsd,
                entries: [action.entry, ...state.entries].slice(0, 200),
            };
        case 'RESET':
            return { ...initialState, sessionId: state.sessionId };
        default:
            return state;
    }
}

const SessionStatsContext = createContext<SessionStatsContextValue | undefined>(undefined);

export function SessionStatsProvider({ children }: { children: React.ReactNode }) {
    const [stats, dispatch] = useReducer(reducer, initialState);

    const value = useMemo<SessionStatsContextValue>(() => ({
        stats,
        addUsage: (entry) => {
            dispatch({ type: 'ADD_USAGE', entry: { ...entry, timestamp: Date.now() } });
        },
        resetSession: () => dispatch({ type: 'RESET' }),
    }), [stats]);

    return (
        <SessionStatsContext.Provider value={value}>
            {children}
        </SessionStatsContext.Provider>
    );
}

export function useSessionStats() {
    const ctx = useContext(SessionStatsContext);
    if (!ctx) throw new Error('useSessionStats must be used within SessionStatsProvider');
    return ctx;
}
