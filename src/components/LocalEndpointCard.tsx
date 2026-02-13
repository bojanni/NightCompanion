import { useState, useEffect } from 'react';
import {
    Server, Loader2, Check, Trash2, Zap, RefreshCw
} from 'lucide-react';

interface LocalEndpoint {
    id: string;
    provider: 'ollama' | 'lmstudio';
    endpoint_url: string;
    model_name: string;
    model_gen?: string;
    model_improve?: string;
    is_active: boolean;
    is_active_gen: boolean;
    is_active_improve: boolean;
    updated_at: string;
}

interface LocalEndpointCardProps {
    type: 'ollama' | 'lmstudio';
    endpoint: LocalEndpoint | undefined;
    actionLoading: string | null;
    onSave: (endpointUrl: string, modelGen: string, modelImprove: string) => void;
    onDelete: () => void;
    onSetActive: (role: 'generation' | 'improvement') => void;
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

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onSetActive('generation')}
                                disabled={actionLoading === `${type}-generation`}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 ${endpoint.is_active_gen
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {actionLoading === `${type}-generation` ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                {endpoint.is_active_gen ? 'Gen: Active' : 'Gen: Activate'}
                            </button>
                            <button
                                onClick={() => onSetActive('improvement')}
                                disabled={actionLoading === `${type}-improvement`}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 ${endpoint.is_active_improve
                                    ? 'bg-teal-500/20 text-teal-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {actionLoading === `${type}-improvement` ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                {endpoint.is_active_improve ? 'Imp: Active' : 'Imp: Activate'}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 p-1.5 text-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[10px]"
                                title="Edit"
                            >
                                <RefreshCw size={12} /> Edit
                            </button>
                            <button
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="flex-1 p-1.5 text-center text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-[10px]"
                                title="Remove"
                            >
                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
