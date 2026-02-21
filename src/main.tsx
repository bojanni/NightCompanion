import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';
import { queryClient } from './lib/query-client';
import { ThemeProvider } from './context/ThemeContext';
import { SessionStatsProvider } from './context/SessionStatsContext';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="nightcompanion-theme">
        <SessionStatsProvider>
          <App />
          <Toaster
            position="top-right"
            theme="system"
            richColors
            closeButton
            duration={4000}
            offset={100}
          />
          <ReactQueryDevtools initialIsOpen={false} />
        </SessionStatsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
