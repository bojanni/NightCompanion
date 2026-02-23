import { useEffect, useRef } from 'react';
import { useUsageDashboard } from '../hooks/useUsage';
import { toast } from 'sonner';

export function BudgetAlertWidget() {
    const { data } = useUsageDashboard();
    const prevPercent = useRef<number | null>(null);

    useEffect(() => {
        if (!data || !data.budget) return;

        const currentPercent = data.budget.percent_used;
        const limit = data.budget.monthly_limit_usd;

        if (prevPercent.current !== null) {
            // Trigger 100% alert
            if (currentPercent >= 100 && prevPercent.current < 100) {
                toast.error(`⚠️ AI Budget bereikt! ($${limit.toFixed(2)}). Schakel over naar lokale modellen om extra kosten te voorkomen.`, {
                    duration: 10000,
                    className: 'bg-red-950 border-red-900 text-red-200'
                });
            }
            // Trigger 80% alert
            else if (currentPercent >= 80 && prevPercent.current < 80) {
                toast.warning(`Waarschuwing: Je hebt 80% van je maandelijkse AI budget verbruikt ($${data.budget.current_spend_usd.toFixed(2)} / $${limit.toFixed(2)}).`, {
                    duration: 8000,
                });
            }
        }

        prevPercent.current = currentPercent;
    }, [data]);

    // This component performs background monitoring and doesn't render visual UI itself.
    return null;
}
