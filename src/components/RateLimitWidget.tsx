import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface RateLimitData {
    remaining: number | null;
    reset: number | null;
}

export function RateLimitWidget({ collapsed }: { collapsed: boolean }) {
    const [data, setData] = useState<RateLimitData>({ remaining: 500, reset: null });

    useEffect(() => {
        const handleUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<RateLimitData>;
            setData(customEvent.detail);
        };

        window.addEventListener('nc-rate-limit-update', handleUpdate);
        return () => window.removeEventListener('nc-rate-limit-update', handleUpdate);
    }, []);

    // Show default state on startup instead of returning null
    if (data.remaining === null) {
        data.remaining = 500;
    }

    const isLow = data.remaining < 50;
    const isCritical = data.remaining < 10;

    let bgColor = 'bg-slate-800/50';
    let iconColor = 'text-slate-400';
    let textColor = 'text-slate-300';

    if (isCritical) {
        bgColor = 'bg-red-500/10 border border-red-500/20';
        iconColor = 'text-red-400';
        textColor = 'text-red-300 font-medium';
    } else if (isLow) {
        bgColor = 'bg-amber-500/10 border border-amber-500/20';
        iconColor = 'text-amber-400';
        textColor = 'text-amber-300 font-medium';
    }

    if (collapsed) {
        return (
            <div
                className={`w-10 h-10 mx-auto rounded-xl flex flex-col items-center justify-center ${bgColor} transition-colors`}
                title={`AI Requests Remaining (resets at ${data.reset ? new Date(data.reset * 1000).toLocaleTimeString() : '?'})`}
            >
                <span className={`text-[10px] font-bold ${textColor}`}>{data.remaining}</span>
                <Activity size={10} className={`${iconColor} opacity-70`} />
            </div>
        );
    }

    return (
        <div className={`mx-6 mb-4 px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${bgColor}`}>
            <div className={`p-1.5 rounded-lg ${isCritical ? 'bg-red-500/20' : isLow ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                <Activity size={14} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className={`text-[11px] uppercase tracking-wider font-semibold ${textColor}`}>
                        AI Limits
                    </p>
                    <span className={`text-xs font-bold ${textColor}`}>
                        {data.remaining} <span className="text-[10px] text-slate-500 font-normal">left</span>
                    </span>
                </div>
                {isCritical && (
                    <p className="text-[10px] text-red-400/80 mt-1 leading-tight truncate" title="Probeer Ollama of LM Studio">
                        Tip: Try Local Model
                    </p>
                )}
            </div>
        </div>
    );
}
