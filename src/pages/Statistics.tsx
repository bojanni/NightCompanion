import { useState, useEffect } from 'react';
import { BarChart2, Hash, Star, Trophy, Activity, AlertCircle } from 'lucide-react';
import { fetchStatistics, StatisticsData } from '../lib/stats-service';

export default function Statistics() {
    const [data, setData] = useState<StatisticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const stats = await fetchStatistics();
                setData(stats);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error loading statistics');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Activity size={32} className="text-teal-500 animate-pulse" />
                <p className="text-slate-400 font-medium">Crunching your generation stats...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl flex items-center gap-4 text-red-400">
                <AlertCircle size={24} className="shrink-0" />
                <p>{error}</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <BarChart2 size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Statistics</h1>
                    <p className="text-slate-400 mt-1">Insights into your generations, models, and tags.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Models */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
                        <Trophy size={20} className="text-amber-500" />
                        <h2 className="text-lg font-semibold text-white">Most Used Models</h2>
                    </div>
                    <div className="p-6">
                        {data.topModels.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No model usage data available yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {data.topModels.map((model, idx) => (
                                    <div key={idx} className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs">
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{model.model_name}</div>
                                                <div className="text-sm text-slate-400">{model.usage_count} generation{model.usage_count !== 1 ? 's' : ''}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2 py-1 rounded-md">
                                                <Star size={14} className="fill-amber-400" />
                                                <span className="font-bold text-sm">{Number(model.avg_rating).toFixed(1)}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 mt-1">Avg Rating</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Tags */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
                        <Hash size={20} className="text-teal-500" />
                        <h2 className="text-lg font-semibold text-white">Most Used Tags</h2>
                    </div>
                    <div className="p-6">
                        {data.topTags.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">No tags used yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {data.topTags.map((tag, idx) => {
                                    // Determine relative size based on position/count to create a subtle cloud effect
                                    const isTop3 = idx < 3;
                                    const isTop10 = idx >= 3 && idx < 10;

                                    let sizeClass = "text-xs px-3 py-1.5";
                                    let colorClass = "bg-slate-800 text-slate-300 hover:text-white";

                                    if (isTop3) {
                                        sizeClass = "text-sm px-4 py-2 font-medium";
                                        colorClass = "bg-teal-500/10 text-teal-400 border border-teal-500/20";
                                    } else if (isTop10) {
                                        colorClass = "bg-slate-800 text-white border border-slate-700";
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`rounded-full flex items-center gap-2 transition-colors cursor-default ${sizeClass} ${colorClass}`}
                                            title={`${tag.usage_count} uses`}
                                        >
                                            <span>{tag.name}</span>
                                            <span className="opacity-50 text-[10px] bg-black/20 px-1.5 rounded-full">{tag.usage_count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
