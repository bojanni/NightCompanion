import { Zap, Sparkles, Eye, Settings, AlertTriangle } from 'lucide-react';
import type { ApiKeyInfo, LocalEndpoint } from '../../lib/api-keys-service';
import { PROVIDERS } from '../Settings'; // We'll need to export PROVIDERS from Settings.tsx or move it to a shared file

interface DashboardProps {
    activeGen: ApiKeyInfo | LocalEndpoint | undefined;
    activeImprove: ApiKeyInfo | LocalEndpoint | undefined;
    activeVision: ApiKeyInfo | LocalEndpoint | undefined;
    onConfigure: () => void;
    configuredCount: number;
}

export function Dashboard({ activeGen, activeImprove, activeVision, onConfigure, configuredCount }: DashboardProps) {

    const getProviderDisplayName = (p: ApiKeyInfo | LocalEndpoint | undefined) => {
        if (!p) return 'Not Configured';
        if ('endpoint_url' in p) {
            return `${p.provider === 'ollama' ? 'Ollama' : 'LM Studio'} (${p.model_gen || p.model_improve || p.model_name})`;
        }
        // We need access to PROVIDERS list to get nice name, or just use provider id
        // For now, let's just capitalize provider ID if we can't get name easily, or import PROVIDERS.
        // Since PROVIDERS is in Settings.tsx, we might want to move it to a constants file.
        // For now, I will capitalize the ID.
        const name = p.provider.charAt(0).toUpperCase() + p.provider.slice(1);
        const model = p.model_gen || p.model_improve || p.model_name || 'Default';
        return `${name} (${model})`;
    };

    const getProviderName = (p: ApiKeyInfo | LocalEndpoint | undefined) => {
        if (!p) return 'None';
        if ('endpoint_url' in p) return p.provider === 'ollama' ? 'Ollama' : 'LM Studio';
        return p.provider.charAt(0).toUpperCase() + p.provider.slice(1);
    };

    const getModelName = (p: ApiKeyInfo | LocalEndpoint | undefined, role: 'gen' | 'improve' | 'vision') => {
        if (!p) return '-';
        if (role === 'gen') return p.model_gen || p.model_name || 'Default';
        if (role === 'improve') return p.model_improve || p.model_name || 'Default';
        // Vision might not have specific model col yet, usually just model_name
        return p.model_name || 'Default';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Section */}
            <div className="text-center space-y-4 py-8">
                <h2 className="text-3xl font-bold text-white tracking-tight">AI Configuration Status</h2>
                <p className="text-slate-400 max-w-lg mx-auto">
                    Overview of your active AI providers for different tasks.
                    Configure them to unlock the full potential of NightCompanion.
                </p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Generation Card */}
                <div className={`relative group overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${activeGen ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' : 'bg-slate-900/40 border-slate-800 border-dashed'}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${activeGen ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Zap size={24} />
                        </div>
                        {activeGen && <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">Active</div>}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1">Generation</h3>
                    <p className="text-sm text-slate-400 mb-4 h-10">Creates prompts from your ideas using advanced reasoning.</p>

                    <div className="space-y-1">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Provider</div>
                        <div className="text-slate-200 font-medium truncate">{getProviderName(activeGen)}</div>
                    </div>
                    <div className="space-y-1 mt-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model</div>
                        <div className="text-slate-200 font-medium truncate">{getModelName(activeGen, 'gen')}</div>
                    </div>
                </div>

                {/* Improvement Card */}
                <div className={`relative group overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${activeImprove ? 'bg-teal-500/5 border-teal-500/20 hover:border-teal-500/40' : 'bg-slate-900/40 border-slate-800 border-dashed'}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${activeImprove ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Sparkles size={24} />
                        </div>
                        {activeImprove && <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-500 border border-teal-500/20">Active</div>}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1">Improvement</h3>
                    <p className="text-sm text-slate-400 mb-4 h-10">Refines and enhances your prompts with expert techniques.</p>

                    <div className="space-y-1">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Provider</div>
                        <div className="text-slate-200 font-medium truncate">{getProviderName(activeImprove)}</div>
                    </div>
                    <div className="space-y-1 mt-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model</div>
                        <div className="text-slate-200 font-medium truncate">{getModelName(activeImprove, 'improve')}</div>
                    </div>
                </div>

                {/* Vision Card */}
                <div className={`relative group overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${activeVision ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40' : 'bg-slate-900/40 border-slate-800 border-dashed'}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${activeVision ? 'bg-violet-500/10 text-violet-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Eye size={24} />
                        </div>
                        {activeVision && <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-500 border border-violet-500/20">Active</div>}
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1">Vision</h3>
                    <p className="text-sm text-slate-400 mb-4 h-10">Analyzes characters and images for style replication.</p>

                    <div className="space-y-1">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Provider</div>
                        <div className="text-slate-200 font-medium truncate">{getProviderName(activeVision)}</div>
                    </div>
                    <div className="space-y-1 mt-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Model</div>
                        <div className="text-slate-200 font-medium truncate">{getModelName(activeVision, 'vision')}</div>
                    </div>
                </div>

            </div>

            {/* Action Area */}
            <div className="flex flex-col items-center justify-center pt-8 space-y-4">
                <button
                    onClick={onConfigure}
                    className="group relative inline-flex items-center gap-3 px-8 py-4 bg-slate-100 hover:bg-white text-slate-900 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.5)]"
                >
                    <Settings size={20} className="group-hover:rotate-45 transition-transform duration-500" />
                    Configure Providers
                </button>

                <p className="text-slate-500 text-sm">
                    {configuredCount === 0 ? (
                        <span className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle size={14} /> No providers configured yet
                        </span>
                    ) : (
                        <span>{configuredCount} provider{configuredCount !== 1 ? 's' : ''} currently configured</span>
                    )}
                </p>
            </div>

        </div>
    );
}
