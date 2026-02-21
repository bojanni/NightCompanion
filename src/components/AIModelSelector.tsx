import React, { useMemo } from 'react';
import { Sparkles, Eye, Zap, MessageSquare, AlertCircle } from 'lucide-react';
import { AI_PROVIDER_MODELS, getModelsForTask, getModelById, TaskType, AIProviderModel } from '../lib/ai-provider-models';

interface AIModelSelectorProps {
    task: TaskType;
    value: string; // selected model id e.g. "openai:gpt-4o"
    onChange: (id: string) => void;
    availableProviders?: string[]; // Array of provider IDs that have api keys or are local, e.g. ['openai', 'anthropic', 'ollama']
    onlyAvailable?: boolean;
}

const RatingDots = ({ score, max = 5, colorClass = "bg-amber-400" }: { score: number; max?: number; colorClass?: string }) => (
    <div className="flex gap-0.5" title={`${score}/${max}`}>
        {Array.from({ length: max }).map((_, i) => (
            <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i < score ? colorClass : 'bg-slate-700'}`}
            />
        ))}
    </div>
);

const COST_COLORS = {
    free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    low: 'bg-green-500/10 text-green-400 border-green-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const BADGE_COLORS = {
    Best: 'bg-amber-500/20 text-amber-400',
    Fast: 'bg-blue-500/20 text-blue-400',
    Budget: 'bg-green-500/20 text-green-400',
    Local: 'bg-slate-600/30 text-slate-300',
};

export default function AIModelSelector({ task, value, onChange, availableProviders = [], onlyAvailable = false }: AIModelSelectorProps) {
    const models = useMemo(() => {
        // We want to show recommended first, but also let users select others that are not optimally recommended
        // if they want to. We'll split the list.
        const recommended = getModelsForTask(task);
        const others = AI_PROVIDER_MODELS.filter(m => !m.recommendedFor.includes(task));

        let all = [...recommended, ...others];

        if (onlyAvailable && availableProviders.length > 0) {
            all = all.filter(m => availableProviders.includes(m.provider));
        }
        return all;
    }, [task, availableProviders, onlyAvailable]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {models.map(model => {
                    const isSelected = value === model.id;
                    const isRecommended = model.recommendedFor.includes(task);
                    const isAvailable = availableProviders.includes(model.provider);
                    // If onlyAvailable is false but we check availability, we might dim it instead
                    // For now, if unconfigured, we show it normal but maybe slightly dimmer? Or let them click it so it prompts to configure later.
                    // Let's dim it if NOT recommended for this task to show it's less optimal.

                    return (
                        <button
                            key={model.id}
                            onClick={() => onChange(model.id)}
                            className={`relative flex flex-col items-start p-3 rounded-xl border transition-all text-left overflow-hidden ${isSelected
                                    ? 'bg-slate-800 border-amber-500 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
                                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80'
                                } ${!isRecommended ? 'opacity-60 hover:opacity-100 grayscale-[30%]' : ''}`}
                        >
                            {/* Selection Glow Indicator */}
                            {isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}

                            <div className="flex w-full justify-between items-start mb-2 pl-2">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-slate-200">{model.name}</span>
                                        {model.capabilities.includes('vision') && task !== 'vision' && (
                                            <Eye size={12} className="text-slate-500" title="Vision Capable" />
                                        )}
                                        {!isRecommended && (
                                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md flex items-center gap-1" title="Not optimal for this task">
                                                <AlertCircle size={10} /> Suboptimal
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{model.provider}</span>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    {model.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BADGE_COLORS[model.badge]}`}>
                                            {model.badge}
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 border rounded uppercase ${COST_COLORS[model.strengths.cost]}`}>
                                        {model.strengths.cost}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full px-2 mt-auto">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Creativity</span>
                                    <RatingDots score={model.strengths.creativity} colorClass="bg-purple-400" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Precision</span>
                                    <RatingDots score={model.strengths.instruction} colorClass="bg-emerald-400" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Speed</span>
                                    <RatingDots score={model.strengths.speed} colorClass="bg-blue-400" />
                                </div>
                            </div>

                            {model.note && (
                                <div className="mt-2 text-[11px] text-slate-400 italic pl-2 border-l-2 border-slate-700/50">
                                    {model.note}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
