import { useState, useEffect, useRef } from 'react';
import {
    Server, Loader2, Check, Trash2, Zap, RefreshCw, Eye, ChevronDown, Search, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import type { LocalEndpoint } from '../lib/api-keys-service';
import { listModels, ModelListItem } from '../lib/ai-service';

interface LocalEndpointCardProps {
    type: 'ollama' | 'lmstudio';
    endpoint: LocalEndpoint | undefined;
    actionLoading: string | null;
    onSave: (endpointUrl: string, modelGen: string, modelImprove: string, modelVision: string) => void;
    onDelete: () => void;
    onSetActive: (role: 'generation' | 'improvement' | 'vision') => void;
}

// Helper component for Editable Combobox
function EditableModelSelect({
    value,
    onChange,
    options,
    placeholder,
    label,
    className = ''
}: {
    value: string;
    onChange: (val: string) => void;
    options: ModelListItem[];
    placeholder: string;
    label: string;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(search.toLowerCase()) ||
        opt.id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all font-mono placeholder:font-sans"
                    placeholder={placeholder}
                    onFocus={() => setIsOpen(true)}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-3 text-slate-500 hover:text-white"
                >
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Filter list..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white border border-slate-700 focus:outline-none focus:border-slate-600"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-1 space-y-0.5">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between group transition-colors ${value === opt.id ? 'bg-teal-500/10 text-teal-300' : 'hover:bg-slate-800 text-slate-300'
                                        }`}
                                >
                                    <span className="truncate font-medium">{opt.name}</span>
                                    {value === opt.id && <Check size={14} className="text-teal-500" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-xs text-slate-500">
                                No models found.
                                <br />Type manually above.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function LocalEndpointCard({ type, endpoint, actionLoading, onSave, onDelete, onSetActive }: LocalEndpointCardProps) {
    const defaults = type === 'ollama'
        ? {
            url: 'http://localhost:11434',
            name: 'Ollama',
            desc: 'Run Llama 3, Mistral, Gemma, and other large language models locally.',
            docs: 'https://ollama.com/'
        }
        : {
            url: 'http://localhost:1234',
            name: 'LM Studio',
            desc: 'Discover, download, and run local LLMs with an easy-to-use interface.',
            docs: 'https://lmstudio.ai/'
        };

    const [url, setUrl] = useState(endpoint?.endpoint_url || defaults.url);
    const [modelGen, setModelGen] = useState(endpoint?.model_gen || endpoint?.model_name || '');
    const [modelImprove, setModelImprove] = useState(endpoint?.model_improve || endpoint?.model_name || '');
    const [modelVision, setModelVision] = useState(endpoint?.model_vision || endpoint?.model_name || '');
    const [isEditing, setIsEditing] = useState(false);

    // State for fetched models
    const [availableModels, setAvailableModels] = useState<ModelListItem[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    useEffect(() => {
        if (endpoint) {
            setUrl(endpoint.endpoint_url);
            setModelGen(endpoint.model_gen || endpoint.model_name || '');
            setModelImprove(endpoint.model_improve || endpoint.model_name || '');
            setModelVision(endpoint.model_vision || endpoint.model_name || '');
        }
    }, [endpoint]);

    const isConfigured = !!endpoint;
    const isActive = endpoint?.is_active || false;
    const isSaving = actionLoading === type;
    const isDeleting = actionLoading === `${type}-delete`;

    // Determine active roles for styling
    const isGenActive = !!(endpoint?.is_active_gen && (endpoint?.model_gen || endpoint?.model_name) === modelGen);
    const isImpActive = !!(endpoint?.is_active_improve && (endpoint?.model_improve || endpoint?.model_name) === modelImprove);
    const isVisActive = !!(endpoint?.is_active_vision && (endpoint?.model_vision || endpoint?.model_name) === modelVision);

    const handleFetchModels = async () => {
        if (!url) {
            toast.error('Please enter an Endpoint URL first');
            return;
        }
        setIsFetching(true);
        try {
            // Pass empty string as token since auth removed. 
            // Pass 'local' as provider so backend knows logic, URL passed as endpointUrl
            const models = await listModels('', 'local', undefined, url);
            setAvailableModels(models);
            toast.success(`Found ${models.length} models`);

            // Auto-fill if empty and models found
            if (models.length > 0) {
                if (!modelGen) setModelGen(models[0].id);
                if (!modelImprove) setModelImprove(models[0].id);
                if (!modelVision) setModelVision(models[0].id);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to fetch models. Check URL and ensure server is running.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = () => {
        // Basic validation
        if (!url) {
            toast.error('Endpoint URL is required');
            return;
        }
        onSave(url, modelGen || 'default', modelImprove || 'default', modelVision || 'default');
        setIsEditing(false);
    };

    const header = (
        <div className="flex items-start justify-between mb-6">
            <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    {defaults.name} Configuration
                    {isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Zap size={10} /> Active
                        </span>
                    )}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{defaults.desc}</p>
                <a
                    href={defaults.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-2 transition-colors"
                >
                    Visit Website <ExternalLink size={10} />
                </a>
            </div>
        </div>
    );

    if (!isConfigured && !isEditing) {
        return (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-left-4 duration-300">
                {header}
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Server size={24} className="text-slate-500" />
                    </div>
                    <h4 className="text-white font-medium mb-2">Not Configured</h4>
                    <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                        Connect your local {defaults.name} instance to run models privately.
                    </p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-lg transition-colors"
                    >
                        Configure {defaults.name}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 w-full animate-in fade-in slide-in-from-left-4 duration-300">
            {header}

            <div className="space-y-6">
                {/* Endpoint URL Input */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Endpoint URL</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            disabled={!isEditing}
                            className={`flex-1 bg-slate-800 border ${isEditing ? 'border-slate-700 focus:border-teal-500/50' : 'border-transparent'} rounded-xl px-4 py-2.5 text-white focus:outline-none transition-all font-mono text-sm`}
                            placeholder={defaults.url}
                        />
                        <button
                            type="button"
                            onClick={handleFetchModels}
                            disabled={isFetching || !url}
                            className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50 text-xs font-medium flex items-center gap-2"
                            title="Fetch Models"
                        >
                            {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            {isFetching ? 'Fetching...' : 'Fetch Models'}
                        </button>
                    </div>

                    {isEditing && (
                        <div className="flex items-center gap-2 mt-3">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !url}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Configuration'}
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); if (endpoint) setUrl(endpoint.endpoint_url); }}
                                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors text-sm border border-slate-700"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {!isEditing && (
                        <div className="flex items-center gap-3 mt-3">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-teal-400 hover:text-teal-300 text-xs font-medium flex items-center gap-1"
                            >
                                Change URL
                            </button>
                            <div className="w-px h-3 bg-slate-700" />
                            <button
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Remove Configuration
                            </button>
                        </div>
                    )}
                </div>

                {/* Model Selection Grid */}
                {isConfigured && (
                    <div className="pt-6 border-t border-slate-800/50 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                <Server size={14} className="text-teal-500" />
                                Model Selection
                            </h4>
                            <button
                                onClick={handleFetchModels}
                                disabled={isFetching}
                                className="text-xs text-slate-500 hover:text-teal-400 flex items-center gap-1.5 transition-colors"
                            >
                                {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Refresh Models
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Generation Model</label>
                                <EditableModelSelect
                                    label="Generation Model"
                                    value={modelGen}
                                    onChange={(val) => { setModelGen(val); if (!isEditing) onSave(url, val, modelImprove, modelVision); }}
                                    options={availableModels}
                                    placeholder="e.g. llama3"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Improvement Model</label>
                                <EditableModelSelect
                                    label="Improvement Model"
                                    value={modelImprove}
                                    onChange={(val) => { setModelImprove(val); if (!isEditing) onSave(url, modelGen, val, modelVision); }}
                                    options={availableModels}
                                    placeholder="e.g. mistral"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2">Vision Model</label>
                                <EditableModelSelect
                                    label="Vision Model"
                                    value={modelVision}
                                    onChange={(val) => { setModelVision(val); if (!isEditing) onSave(url, modelGen, modelImprove, val); }}
                                    options={availableModels}
                                    placeholder="e.g. llava"
                                />
                            </div>
                        </div>

                        {/* Role Toggles */}
                        {!isEditing && (
                            <div className="pt-6 mt-4 border-t border-slate-800/50 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <button
                                        onClick={() => onSetActive('generation')}
                                        disabled={actionLoading === `${type}-generation`}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${isGenActive
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                            : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        <Zap size={16} className={actionLoading === `${type}-generation` ? 'animate-spin' : ''} />
                                        {isGenActive ? 'Active Gen' : 'Set Gen'}
                                    </button>
                                    <button
                                        onClick={() => onSetActive('improvement')}
                                        disabled={actionLoading === `${type}-improvement`}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${isImpActive
                                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20'
                                            : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        <Zap size={16} className={actionLoading === `${type}-improvement` ? 'animate-spin' : ''} />
                                        {isImpActive ? 'Active Improve' : 'Set Improve'}
                                    </button>
                                    <button
                                        onClick={() => onSetActive('vision')}
                                        disabled={actionLoading === `${type}-vision`}
                                        className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${isVisActive
                                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'
                                            : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        <Eye size={16} className={actionLoading === `${type}-vision` ? 'animate-spin' : ''} />
                                        {isVisActive ? 'Active Vision' : 'Set Vision'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
