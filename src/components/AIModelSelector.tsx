import React, { useMemo, useState } from 'react';
import { Search, Cloud, Server, Info, CheckCircle2, Eye, BookOpen, Sparkles, Wand2 } from 'lucide-react';
import { AI_PROVIDER_MODELS, getModelById, TaskType, AIProviderModel } from '../lib/ai-provider-models';

interface AIModelSelectorProps {
    task: TaskType;
    value: string; // selected model id "provider:model"
    onChange: (id: string) => void;
    availableProviders?: string[]; // configured provider IDs
    onlyAvailable?: boolean;
}

// ── Task recommendation badges ──────────────────────────────────────────────
const TASK_META: Record<TaskType, { label: string; icon: typeof Sparkles; color: string }> = {
    generate: { label: 'Generation', icon: Sparkles, color: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
    improve: { label: 'Improvement', icon: Wand2, color: 'text-teal-400   bg-teal-500/10   border-teal-500/20' },
    vision: { label: 'Vision', icon: Eye, color: 'text-sky-400    bg-sky-500/10    border-sky-500/20' },
    research: { label: 'Research', icon: BookOpen, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
};

// Badge colours
const BADGE_COLORS: Record<string, string> = {
    Best: 'bg-amber-500/20   text-amber-400   border-amber-500/30',
    Fast: 'bg-blue-500/20    text-blue-400    border-blue-500/30',
    Budget: 'bg-green-500/20   text-green-400   border-green-500/30',
    Local: 'bg-slate-600/30   text-slate-300   border-slate-600/30',
};

// Provider icon colour dots
const PROVIDER_DOTS: Record<string, string> = {
    openai: 'bg-emerald-400',
    anthropic: 'bg-orange-400',
    google: 'bg-blue-400',
    ollama: 'bg-purple-400',
    lmstudio: 'bg-pink-400',
};

// ── Small provider badge pill ───────────────────────────────────────────────
function ProviderBadge({ provider, label }: { provider: string; label: string }) {
    const dot = PROVIDER_DOTS[provider] ?? 'bg-slate-400';
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

// ── Task pill ───────────────────────────────────────────────────────────────
function TaskPill({ task }: { task: TaskType }) {
    const meta = TASK_META[task];
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color}`}>
            <Icon size={9} />
            {meta.label}
        </span>
    );
}

// ── Model row ───────────────────────────────────────────────────────────────
function ModelRow({
    model,
    isSelected,
    isRecommended,
    onClick,
}: {
    model: AIProviderModel;
    isSelected: boolean;
    isRecommended: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all border
                ${isSelected
                    ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_12px_-3px_rgba(20,184,166,0.2)]'
                    : 'bg-transparent border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                }
                ${!isRecommended ? 'opacity-60 hover:opacity-90' : ''}
            `}
        >
            {/* Cost column */}
            <div className="flex-none w-28 text-right">
                {model.costIn ? (
                    <>
                        <p className="text-[10px] text-slate-500 font-mono">In: <span className="text-slate-300">{model.costIn}</span></p>
                        <p className="text-[10px] text-slate-500 font-mono">Out: <span className="text-slate-300">{model.costOut}</span></p>
                    </>
                ) : (
                    <p className="text-[10px] text-emerald-400 font-mono font-bold">Free</p>
                )}
            </div>

            {/* Separator */}
            <div className="self-stretch w-px bg-slate-700/50 flex-none mt-1" />

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Name row */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {model.name}
                        </span>
                        {isSelected && <CheckCircle2 size={13} className="text-teal-400 flex-none" />}
                        {model.badge && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${BADGE_COLORS[model.badge]}`}>
                                {model.badge}
                            </span>
                        )}
                    </div>
                </div>

                {/* Provider badge */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    <ProviderBadge provider={model.provider} label={model.providerLabel ?? model.provider} />
                    {/* Recommended-for pills */}
                    {model.recommendedFor.map(t => (
                        <TaskPill key={t} task={t} />
                    ))}
                </div>

                {/* Description */}
                {model.description && (
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                        {model.description}
                    </p>
                )}

                {/* More info */}
                {model.infoUrl && (
                    <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); window.open(model.infoUrl, '_blank', 'noopener,noreferrer'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') window.open(model.infoUrl, '_blank', 'noopener,noreferrer'); }}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-teal-400 transition-colors mt-1 cursor-pointer"
                    >
                        <Info size={10} />
                        More info
                    </span>
                )}
            </div>
        </button>
    );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AIModelSelector({
    task,
    value,
    onChange,
    availableProviders = [],
    onlyAvailable = false,
}: AIModelSelectorProps) {
    const [search, setSearch] = useState('');

    // Build ordered, filtered list
    const { cloudModels, localModels } = useMemo(() => {
        let all = [...AI_PROVIDER_MODELS];
        if (onlyAvailable && availableProviders.length > 0) {
            all = all.filter(m => availableProviders.includes(m.provider));
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            all = all.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.provider.toLowerCase().includes(q) ||
                (m.description ?? '').toLowerCase().includes(q) ||
                m.recommendedFor.some(t => t.includes(q))
            );
        }

        // Sort: recommended for current task first
        all.sort((a, b) => {
            const aRec = a.recommendedFor.includes(task);
            const bRec = b.recommendedFor.includes(task);
            if (aRec && !bRec) return -1;
            if (!aRec && bRec) return 1;
            return 0;
        });

        return {
            cloudModels: all.filter(m => !['ollama', 'lmstudio'].includes(m.provider)),
            localModels: all.filter(m => ['ollama', 'lmstudio'].includes(m.provider)),
        };
    }, [search, task, availableProviders, onlyAvailable]);

    const currentModel = getModelById(value);

    function renderSection(label: string, icon: React.ReactNode, models: AIProviderModel[]) {
        if (models.length === 0) return null;
        return (
            <div>
                <div className="flex items-center gap-2 px-2 mb-2">
                    {icon}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
                </div>
                <div className="space-y-1">
                    {models.map(model => (
                        <ModelRow
                            key={model.id}
                            model={model}
                            isSelected={value === model.id}
                            isRecommended={model.recommendedFor.includes(task)}
                            onClick={() => onChange(model.id)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Selected model summary chip */}
            {currentModel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-xl">
                    <CheckCircle2 size={14} className="text-teal-400 flex-none" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{currentModel.name}</p>
                        <p className="text-[10px] text-slate-400">{currentModel.providerLabel ?? currentModel.provider}</p>
                    </div>
                    {currentModel.costIn && (
                        <div className="text-right text-[10px] font-mono text-slate-400 flex-none">
                            <p>In: {currentModel.costIn}</p>
                            <p>Out: {currentModel.costOut}</p>
                        </div>
                    )}
                    {currentModel.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-none ${BADGE_COLORS[currentModel.badge]}`}>
                            {currentModel.badge}
                        </span>
                    )}
                </div>
            )}

            {/* Dropdown panel */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2">
                        <Search size={13} className="text-slate-500 flex-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search models..."
                            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
                        />
                    </div>
                </div>

                {/* Model lists */}
                <div className="p-3 space-y-5 max-h-[520px] overflow-y-auto custom-scrollbar">
                    {renderSection(
                        'Cloud Providers',
                        <Cloud size={12} className="text-slate-500" />,
                        cloudModels
                    )}
                    {renderSection(
                        'Local Models',
                        <Server size={12} className="text-slate-500" />,
                        localModels
                    )}
                    {cloudModels.length === 0 && localModels.length === 0 && (
                        <p className="text-center text-slate-500 text-xs py-4">No models match your search</p>
                    )}
                </div>
            </div>
        </div>
    );
}
