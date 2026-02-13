import { useState, useEffect } from 'react';
import {
    Server, Loader2, Check, Trash2, Zap, RefreshCw, Eye, EyeOff, Laptop
} from 'lucide-react';
import { ApiKeySchema } from '../lib/validation-schemas'; // Using validation if applicable, or just simple check

interface LocalEndpoint {
    id: string;
    provider: 'ollama' | 'lmstudio';
    endpoint_url: string;
    model_name: string;
    model_gen?: string;
    model_improve?: string;
    is_active: boolean;
    updated_at: string;
}

interface LocalEndpointCardProps {
    type: 'ollama' | 'lmstudio';
    endpoint: LocalEndpoint | undefined;
    actionLoading: string | null;
    onSave: (endpointUrl: string, modelGen: string, modelImprove: string) => void;
    onDelete: () => void;
    onSetActive: () => void;
}

export function LocalEndpointCard({ type, endpoint, actionLoading, onSave, onDelete, onSetActive }: LocalEndpointCardProps) {
    const defaults = type === 'ollama'
        ? { url: 'http://localhost:11434', name: 'Ollama' }
        : { url: 'http://localhost:1234/v1', name: 'LM Studio' };

    const [url, setUrl] = useState(endpoint?.endpoint_url || defaults.url);
    const [modelGen, setModelGen] = useState(endpoint?.model_gen || endpoint?.model_name || '');
    const [modelImprove, setModelImprove] = useState(endpoint?.model_improve || endpoint?.model_name || '');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (endpoint) {
            setUrl(endpoint.endpoint_url);
            setModelGen(endpoint.model_gen || endpoint.model_name || '');
            setModelImprove(endpoint.model_improve || endpoint.model_name || '');
        }
    }, [endpoint]);

    const isConfigured = !!endpoint;
    const isActive = endpoint?.is_active || false;
    const isSaving = actionLoading === type;
    const isDeleting = actionLoading === `${type}-delete`;
    const isSettingActive = actionLoading === `${type}-active`;

    const handleSave = () => {
        // Basic validation
        if (!url) return;
        onSave(url, modelGen || 'default', modelImprove || 'default');
        setIsEditing(false);
    };

    return (
        <div className={`bg-slate-900/60 border rounded-2xl p-5 transition-all ${isActive ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' : 'border-slate-800 hover:border-slate-700'
            }`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                        <Server size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{defaults.name}</h3>
                        {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-400 mt-0.5">
                                <Check size={10} /> Active
                            </span>
                        )}
                    </div>
                </div>
                {isConfigured && (
                    <div className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-400">
                        Configured
                    </div>
                )}
            </div>

            {!isConfigured || isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Endpoint URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                            placeholder={defaults.url}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Gen Model (Optional)</label>
                            <input
                                type="text"
                                value={modelGen}
                                onChange={(e) => setModelGen(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                                placeholder="e.g. llama3"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Improve Model (Optional)</label>
                            <input
                                type="text"
                                value={modelImprove}
                                onChange={(e) => setModelImprove(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                                placeholder="e.g. mistral"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Configuration'}
                        </button>
                        {isConfigured && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-lg"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Endpoint</span>
                            <span className="text-slate-300 font-mono truncate max-w-[150px]">{endpoint.endpoint_url}</span>
                        </div>
                        {endpoint.model_gen && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Gen Model</span>
                                <span className="text-slate-300 font-mono">{endpoint.model_gen}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onSetActive}
                            disabled={isSettingActive}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${isActive
                                    ? 'bg-violet-500/20 text-violet-300 pointer-events-none'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            {isSettingActive ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            {isActive ? 'Active' : 'Activate'}
                        </button>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove"
                        >
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
