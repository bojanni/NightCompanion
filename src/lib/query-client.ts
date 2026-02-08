import { QueryClient } from '@tanstack/react-query';

/**
 * Configure React Query client with optimized defaults
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000,

            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,

            // Retry failed requests once
            retry: 1,

            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,

            // Don't refetch on mount if data is fresh
            refetchOnMount: false,

            // Don't refetch on reconnect if data is fresh
            refetchOnReconnect: false,
        },
        mutations: {
            // Retry mutations once
            retry: 1,
        },
    },
});
