import { useState } from 'react';
import {
    BarChart2, Activity, Settings, AlertTriangle,
    TrendingUp, CreditCard, Clock, Zap, Target
} from 'lucide-react';
import { useUsageDashboard, useUpdateBudget } from '../hooks/useUsage';
import { toast } from 'sonner';
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ProviderUsage, BudgetSettings } from '../types/usage';

export default function UsageDashboard() {
    const { data: usage, isLoading, error } = useUsageDashboard();
    const [showBudgetModal, setShowBudgetModal] = useState(false);

    // Default loading view
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-400">
                <Activity className="animate-spin mr-3" size={24} />
                Laden van API statistieken...
            </div>
        );
    }

    // Error view
    if (error || !usage) {
        return (
            <div className="p-12 text-red-400 text-center">
                Error loading usage data. Please check your backend service.
            </div>
        );
    }

    const { totals, budget, providers } = usage;

    const budgetIsCritical = budget.percent_used >= 85;
    const budgetIsWarning = budget.percent_used >= 60 && budget.percent_used < 85;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                        <BarChart2 className="text-teal-400" size={24} />
                        AI Usage & Limits
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitor API requests, tokens, and monitor your monthly limits.
                    </p>
                </div>

                <button
                    onClick={() => setShowBudgetModal(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700 hover:border-slate-600"
                >
                    <Settings size={16} />
                    Settings
                </button>
            </div>

            {/* Header Stats 4 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={CreditCard}
                    label="Today's Cost"
                    value={`$${Number(totals.today_cost_usd || 0).toFixed(2)}`}
                    color="teal"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Month to Date"
                    value={`$${Number(totals.this_month_cost_usd || 0).toFixed(2)} / $${Number(budget.monthly_limit_usd || 0).toFixed(2)}`}
                    subValue={`${Number(budget.percent_used || 0).toFixed(1)}% used`}
                    color={budgetIsCritical ? 'red' : budgetIsWarning ? 'amber' : 'teal'}
                />
                <StatCard
                    icon={Zap}
                    label="Total Monthly Requests"
                    value={Number(totals.this_month_requests || 0).toLocaleString()}
                    color="blue"
                />
                <StatCard
                    icon={Target}
                    label="Top AI Model"
                    value={totals.most_used_model !== 'N/A' ? totals.most_used_model : 'None'}
                    subValue={totals.most_used_provider !== 'N/A' ? `Provider: ${totals.most_used_provider}` : ''}
                    color="violet"
                />
            </div>

            {/* Budget Progress Bar */}
            <div className={`p-6 rounded-2xl border bg-slate-900/40 relative overflow-hidden transition-colors ${budgetIsCritical ? 'border-red-500/30' : budgetIsWarning ? 'border-amber-500/30' : 'border-slate-800'
                }`}>
                {budgetIsCritical && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">Monthly Budget Projection</h3>
                        {budgetIsCritical && <AlertTriangle size={16} className="text-red-400" />}
                    </div>
                    <p className="text-sm font-bold text-slate-300">
                        ${Number(budget.current_spend_usd || 0).toFixed(2)} of ${Number(budget.monthly_limit_usd || 0).toFixed(2)}
                    </p>
                </div>

                {/* Progress Bar Track */}
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
                    <div
                        className={`h-full absolute left-0 top-0 rounded-full transition-all duration-1000 ${budgetIsCritical ? 'bg-red-500' : budgetIsWarning ? 'bg-amber-500' : 'bg-teal-500'
                            }`}
                        style={{ width: `${Math.min(100, budget.percent_used)}%` }}
                    />
                    {budget.projected_month_end_usd > budget.monthly_limit_usd && (
                        <div
                            className="h-full absolute top-0 bg-red-500/30 border-l border-red-500/50 striped-bg"
                            style={{
                                left: `${Math.min(100, budget.percent_used)}%`,
                                width: `${Math.min(100, Math.max(0, (budget.projected_month_end_usd / budget.monthly_limit_usd * 100) - budget.percent_used))}%`
                            }}
                            title={`Projected overspend of $${(Number(budget.projected_month_end_usd || 0) - Number(budget.monthly_limit_usd || 0)).toFixed(2)}`}
                        />
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-3 text-right">
                    {budget.projected_month_end_usd > budget.monthly_limit_usd
                        ? `Warning: Projected to end month at $${Number(budget.projected_month_end_usd || 0).toFixed(2)} based on current velocity.`
                        : `Projected to end month at $${Number(budget.projected_month_end_usd || 0).toFixed(2)}.`}
                </p>
            </div>

            {/* Per-Provider Breakdowns */}
            <h3 className="text-xl font-bold text-white mt-12 mb-6">Active Provider Limits</h3>

            {providers.length === 0 ? (
                <div className="text-center py-12 p-6 rounded-2xl border border-slate-800 border-dashed text-slate-500">
                    No external providers found logging recent data.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {providers.map(p => (
                        <ProviderCard key={p.provider} data={p} />
                    ))}
                </div>
            )}

            {/* Config Modal */}
            {showBudgetModal && <BudgetConfigModal initial={budget} onClose={() => setShowBudgetModal(false)} />}

        </div>
    );
}

// --- Subcomponents ---

function StatCard({ icon: Icon, label, value, subValue, color }: { icon: any, label: string, value: string, subValue?: string, color: 'teal' | 'blue' | 'amber' | 'red' | 'violet' }) {
    const bgColors = {
        teal: 'bg-teal-500/10 text-teal-400',
        blue: 'bg-blue-500/10 text-blue-400',
        amber: 'bg-amber-500/10 text-amber-400',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        violet: 'bg-violet-500/10 text-violet-400',
    };

    return (
        <div className={`p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-colors`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
                    <p className={`text-2xl font-black text-white tracking-tight`}>{value}</p>
                    {subValue && <p className="text-sm font-medium mt-1 text-slate-400">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-xl ${bgColors[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}

function ProviderCard({ data }: { data: ProviderUsage }) {
    const p = data;
    const isCapped = p.current_window.percent_used >= 100;

    return (
        <div className={`p-6 rounded-2xl border bg-slate-900/40 flex flex-col transition-all ${isCapped ? 'border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]' : 'border-slate-800'}`}>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${isCapped ? 'bg-red-500 shadow-red-500/50' : p.current_window.percent_used > 80 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
                    <h4 className="text-lg font-bold text-white uppercase tracking-wider">{p.provider}</h4>
                </div>
                <span className="text-xs font-bold text-slate-500 font-mono tracking-widest">{Number(p.this_month.cost_usd || 0).toFixed(2)}$ / mo</span>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-between py-2">
                {/* Radial Gauge Approximation */}
                <div className="relative flex items-center justify-center min-w-32 min-h-32 shrink-0 group">
                    {/* Background Track */}
                    <svg className="w-32 h-32 -rotate-90 transform" viewBox="0 0 100 100">
                        <circle className="text-slate-800 stroke-current" strokeWidth="10" cx="50" cy="50" r="40" fill="transparent"></circle>
                        {/* Value Track */}
                        <circle
                            className={`${isCapped ? 'text-red-500' : p.current_window.percent_used > 80 ? 'text-amber-500' : 'text-teal-500'} stroke-current drop-shadow-lg transition-all duration-1000 ease-in-out`}
                            strokeWidth="10"
                            strokeLinecap="round"
                            cx="50" cy="50" r="40" fill="transparent"
                            strokeDasharray={`${Math.min(100, Math.max(0, p.current_window.percent_used)) * 2.51} 251.2`}
                        ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-3xl font-black tabular-nums tracking-tighter ${isCapped ? 'text-red-400' : 'text-white'}`}>{p.current_window.requests_used}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-t border-slate-800 pt-1 mt-1 w-16 text-center">/ {p.limit.max_requests}</span>
                    </div>
                </div>

                {/* Stats Listing */}
                <div className="flex-1 w-full space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase mb-1">
                            <span>15-Min Window</span>
                            <span className={isCapped ? 'text-red-400' : 'text-white'}>{p.current_window.requests_remaining} Left</span>
                        </div>
                        {isCapped ? (
                            <p className="text-[11px] text-red-500/80 bg-red-500/10 px-2 py-1 rounded">Resetting soon...</p>
                        ) : (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                                <Clock size={12} /> Resets dynamically
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Input Tokens</p>
                            <p className="text-sm font-medium text-slate-300">{Number(p.this_month.prompt_tokens || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-0.5">Output Tokens</p>
                            <p className="text-sm font-medium text-slate-300">{Number(p.this_month.completion_tokens || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function BudgetConfigModal({ initial, onClose }: { initial: BudgetSettings, onClose: () => void }) {
    const [budget, setBudget] = useState(initial.monthly_limit_usd.toString());
    const mutateBudget = useUpdateBudget();

    const handleSave = async () => {
        try {
            await mutateBudget.mutateAsync({
                monthly_budget_usd: parseFloat(budget) || 25.00,
                warning_at_percent: 80
            });
            toast.success('Budget opgeslagen!');
            onClose();
        } catch {
            toast.error('Kan budget niet opslaan.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                        <Settings className="text-teal-400" /> System Limits Configuration
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    <label className="block">
                        <span className="block text-sm font-bold text-slate-300 mb-2">Monthly Budget ($ USD)</span>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                            <input
                                type="number" step="1.00" min="0"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all outline-none"
                                value={budget}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBudget(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Setting a budget enables visual tracking and early warnings to avoid bill shock.</p>
                    </label>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={mutateBudget.isPending}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {mutateBudget.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
