import { useEffect, useRef } from 'react';
import { useUsageDashboard } from '../hooks/useUsage';
import { toast } from 'sonner';

export function RateLimitAlertWidget() {
    const { data } = useUsageDashboard();
    const prevPercents = useRef<Record<string, number>>({});

    useEffect(() => {
        if (!data || !data.providers) return;
        const current: Record<string, number> = {};
        for (const p of data.providers) {
            const percent = Number(p.current_window.percent_used || 0);
            current[p.provider] = percent;
            const prev = prevPercents.current[p.provider];
            if (prev !== undefined) {
                if (percent >= 100 && prev < 100) {
                    toast.error(`Limiet bereikt voor ${p.provider}. Reset over ${(new Date(p.current_window.window_resets_at).getTime() - Date.now()) / 60000 | 0} min.`);
                } else if (percent >= 80 && prev < 80) {
                    const remaining = Number(p.current_window.requests_remaining || 0);
                    toast.warning(`Bijna op limiet voor ${p.provider} (${remaining} requests over). Overweeg lokale modellen.`);
                }
            }
        }
        prevPercents.current = current;
    }, [data]);

    return null;
}
