import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../lib/constants';

type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface ImportItem {
    id: string;
    title: string;
}

interface ExtensionContextType {
    connectionStatus: ConnectionStatus;
    lastEvent: string | null;
    liveCount: number;
    lastSyncTime: Date | null;
    registerImportListener: (callback: (item: ImportItem) => void) => () => void;
}

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export const useExtension = () => {
    const context = useContext(ExtensionContext);
    if (!context) {
        throw new Error('useExtension must be used within an ExtensionProvider');
    }
    return context;
};

export const ExtensionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const [liveCount, setLiveCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);
    const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const listenersRef = useRef<Set<(item: ImportItem) => void>>(new Set());

    const registerImportListener = useCallback((callback: (item: ImportItem) => void) => {
        listenersRef.current.add(callback);
        return () => {
            listenersRef.current.delete(callback);
        };
    }, []);

    // Batch import tracking
    const batchStats = useRef({
        newItems: 0,
        duplicates: 0
    });

    const BASE_URL = API_BASE_URL;

    const flushBatch = useCallback(() => {
        const { newItems, duplicates } = batchStats.current;
        if (newItems > 0 || duplicates > 0) {
            const newText = newItems === 1 ? '1 nieuwe creatie' : `${newItems} nieuwe creaties`;
            const dupText = duplicates === 1 ? '1 al aanwezig' : `${duplicates} al aanwezig`;

            if (newItems > 0 && duplicates > 0) {
                toast.success(`Import batch voltooid: ${newText}, ${dupText}.`);
            } else if (newItems > 0) {
                toast.success(`Import batch voltooid: ${newText}.`);
            } else {
                toast.info(`Import batch voltooid (alleen ${dupText}).`);
            }
        }

        // Reset batch
        batchStats.current = { newItems: 0, duplicates: 0 };
        batchTimerRef.current = null;
    }, []);

    const handleImportEvent = useCallback((type: 'import' | 'import_duplicate', payload?: { id?: string; title?: string }) => {
        setLastSyncTime(new Date());

        const id = payload?.id;
        const title = payload?.title;

        if (type === 'import') {
            batchStats.current.newItems += 1;
            setLiveCount(c => c + 1);
            if (title) setLastEvent(`"${title}" geïmporteerd`);

            if (id && title) {
                listenersRef.current.forEach(cb => cb({ id, title }));
            }
        } else if (type === 'import_duplicate') {
            batchStats.current.duplicates += 1;
            if (title) setLastEvent(`"${title}" al aanwezig (overgeslagen)`);
        }

        // Debounce batch summary flush
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
        batchTimerRef.current = setTimeout(flushBatch, 2000); // Wait 2s without events to flush batch
    }, [flushBatch]);

    const connectSSE = useCallback(() => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const es = new EventSource(`${BASE_URL}/api/events`);

        es.onopen = () => {
            setConnectionStatus('connected');
        };

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'import' || data.type === 'import_duplicate') {
                    handleImportEvent(data.type, data);
                }
            } catch (err) {
                console.error("Failed to parse SSE message", err);
            }
        };

        es.onerror = () => {
            setConnectionStatus('disconnected');
            // Try reconnecting in 5s
            setTimeout(connectSSE, 5000);
        };

        eventSourceRef.current = es;
    }, [BASE_URL, handleImportEvent]);

    useEffect(() => {
        connectSSE();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (batchTimerRef.current) {
                clearTimeout(batchTimerRef.current);
            }
        };
    }, [connectSSE]);

    return (
        <ExtensionContext.Provider value={{ connectionStatus, lastEvent, liveCount, lastSyncTime, registerImportListener }}>
            {children}
        </ExtensionContext.Provider>
    );
};
