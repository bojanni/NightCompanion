import { useState, useMemo } from 'react';
import { Activity, ChevronDown, ChevronUp, RefreshCw, X } from 'lucide-react';
import { useSessionStats } from '../context/SessionStatsContext';
import { useUsageStats } from '../hooks/useUsageStats';

type Period = 'today' | 'week' | 'month' | 'all' | 'custom';

function getPeriodDates(period: Period, customFrom: string, customTo: string): { from: string; to: string } {
    const now = new Date();
    const toDate = new Date(now);
    toDate.setHours(23, 59, 59, 999);

    if (period === 'custom') return { from: customFrom, to: customTo || toDate.toISOString() };
    if (period === 'all') return { from: '', to: '' };

    const fromDate = new Date(now);
    if (period === 'today') {
        fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
    } else {
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
    }
    return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

function fmt(usd: number | string): string {
    const n = typeof usd === 'string' ? parseFloat(usd) : usd;
    if (isNaN(n) || n === 0) return '$0.00';
    if (n < 0.001) return '< $0.001';
    if (n < 0.01) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(3)}`;
}

function fmtTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

interface Props {
    collapsed: boolean;
}

export default function SidebarCostWidget({ collapsed }: Props) {
    const { stats } = useSessionStats();
    const [open, setOpen] = useState(false);
    const [period, setPeriod] = useState<Period>('month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const { from, to } = useMemo(
        () => getPeriodDates(period, customFrom, customTo),
        [period, customFrom, customTo]
    );

    const { data, loading, reload } = useUsageStats(from, to);

    const sessionCost = stats.estimatedCostUsd;
    const sessionTokens = stats.promptTokens + stats.completionTokens;

    const PERIOD_LABELS: Record<Period, string> = {
        today: 'Today',
        week: '7 days',
        month: 'Month',
        all: 'All time',
        custom: 'Custom',
    };

    if (collapsed) {
        return (
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all mx-auto"
                title={`Session: ${stats.calls} calls · ${fmt(sessionCost)}`}
            >
                <Activity size={18} />
            </button>
        );
    }

    return (
        <div className="mx-3 mb-2">
            {/* Compact row */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-all group"
            >
                <Activity size={14} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300">
                            {stats.calls} call{stats.calls !== 1 ? 's' : ''} · {fmtTokens(sessionTokens)} tok
                        </span>
                        <span className="text-[11px] font-bold text-amber-400 tabular-nums">
                            {fmt(sessionCost)}
                        </span>
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide">Session usage</span>
                </div>
                {open
                    ? <ChevronUp size={12} className="text-slate-500 shrink-0" />
                    : <ChevronDown size={12} className="text-slate-500 shrink-0" />
                }
            </button>

            {/* Expanded panel */}
            {open && (
                <div className="mt-1 p-3 bg-slate-900 border border-slate-700/50 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Period selector */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${period === p
                                    ? 'bg-amber-500 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                        <button
                            onClick={reload}
                            className="ml-auto text-slate-500 hover:text-white transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Custom date range */}
                    {period === 'custom' && (
                        <div className="flex gap-2">
                            <input
                                type="date"
                                title="From date"
                                aria-label="From date"
                                value={customFrom ? customFrom.slice(0, 10) : ''}
                                onChange={e => setCustomFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
                                className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            />
                            <span className="text-slate-500 self-center text-[10px]">→</span>
                            <input
                                type="date"
                                title="To date"
                                aria-label="To date"
                                value={customTo ? customTo.slice(0, 10) : ''}
                                onChange={e => setCustomTo(e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '')}
                                className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            />
                        </div>
                    )}

                    {/* Historical totals */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Calls', value: String(data.totals.calls) },
                            { label: 'Tokens', value: fmtTokens((data.totals.prompt_tokens || 0) + (data.totals.completion_tokens || 0)) },
                            { label: 'Cost', value: fmt(parseFloat(data.totals.total_cost_usd as string) || 0) },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-800/60 rounded-lg p-2 text-center">
                                <div className="text-[11px] font-bold text-white tabular-nums">{value}</div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Breakdown table */}
                    {data.breakdown.length > 0 && (
                        <div className="space-y-1">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">By model</p>
                            <div className="max-h-40 overflow-y-auto space-y-1 dropdown-scroll">
                                {data.breakdown.map((row, i) => (
                                    <div key={i} className="flex items-center justify-between px-2 py-1 bg-slate-800/40 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-300 font-medium truncate max-w-[120px]" title={row.model}>
                                                {row.model || row.provider}
                                            </p>
                                            <p className="text-[9px] text-slate-500">{row.calls} call{row.calls !== 1 ? 's' : ''} · {fmtTokens((row.prompt_tokens || 0) + (row.completion_tokens || 0))} tok</p>
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-400 tabular-nums shrink-0 ml-1">
                                            {fmt(parseFloat(row.total_cost_usd as string) || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.breakdown.length === 0 && !loading && (
                        <p className="text-[10px] text-slate-500 text-center py-2">No usage data for this period</p>
                    )}

                    <button
                        onClick={() => setOpen(false)}
                        className="w-full text-[10px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
                    >
                        <X size={10} /> Close
                    </button>
                </div>
            )}
        </div>
    );
}
