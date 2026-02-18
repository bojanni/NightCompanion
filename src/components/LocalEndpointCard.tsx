import { useState, useEffect, useRef } from 'react';
import {
    Server, Loader2, Check, Trash2, Zap, RefreshCw, Eye, ChevronDown, Search, Cloud
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
    label
}: {
    value: string;
    onChange: (val: string) => void;
    options: ModelListItem[];
    placeholder: string;
    label: string;
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
        <div className="relative" ref={containerRef}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    placeholder={placeholder}
                    onFocus={() => setIsOpen(true)}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-2 text-slate-500 hover:text-white"
                >
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Filter list..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-800 rounded px-2 pl-7 py-1 text-[10px] text-white border border-slate-700 focus:outline-none"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="p-1 space-y-0.5">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between group ${value === opt.id ? 'bg-violet-500/20 text-violet-300' : 'hover:bg-slate-800 text-slate-300'
                                        }`}
                                >
                                    <span className="truncate">{opt.name}</span>
                                    {value === opt.id && <Check size={12} />}
                                </button>
                            ))
                        ) : (
                            <div className="px-2 py-3 text-center text-[10px] text-slate-500">
                                No models found via fetch.
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
        ? { url: 'http://localhost:11434', name: 'Ollama' }
        : { url: 'http://localhost:1234/v1', name: 'LM Studio' };

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
            toast.error('Failed to fetch models. checks URL and ensure server is running.');
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
                <div className="space-y-4">
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Endpoint URL</label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                                placeholder={defaults.url}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleFetchModels}
                            disabled={isFetching || !url}
                            className="px-3 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
                            title="Fetch Models"
                        >
                            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        </button>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-800/50">
                        <EditableModelSelect
                            label="Generation Model"
                            value={modelGen}
                            onChange={setModelGen}
                            options={availableModels}
                            placeholder="e.g. llama3"
                        />
                        <EditableModelSelect
                            label="Improvement Model"
                            value={modelImprove}
                            onChange={setModelImprove}
                            options={availableModels}
                            placeholder="e.g. mistral"
                        />
                        <EditableModelSelect
                            label="Vision Model"
                            value={modelVision}
                            onChange={setModelVision}
                            options={availableModels}
                            placeholder="e.g. llava"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
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
                        {endpoint.model_improve && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Imp Model</span>
                                <span className="text-slate-300 font-mono">{endpoint.model_improve}</span>
                            </div>
                        )}
                        {endpoint.model_vision && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Vis Model</span>
                                <span className="text-slate-300 font-mono">{endpoint.model_vision}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        {/* Config Buttons Logic */}
                        <div className="grid grid-cols-3 gap-1">
                            <button
                                onClick={() => onSetActive('generation')}
                                disabled={actionLoading === `${type}-generation`}
                                className={`py-1.5 rounded-lg text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-1 ${endpoint.is_active_gen
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {actionLoading === `${type}-generation` ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                {endpoint.is_active_gen ? 'Gen Active' : 'Set Gen'}
                            </button>
                            <button
                                onClick={() => onSetActive('improvement')}
                                disabled={actionLoading === `${type}-improvement`}
                                className={`py-1.5 rounded-lg text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-1 ${endpoint.is_active_improve
                                    ? 'bg-teal-500/20 text-teal-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {actionLoading === `${type}-improvement` ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                                {endpoint.is_active_improve ? 'Imp Active' : 'Set Imp'}
                            </button>
                            <button
                                onClick={() => onSetActive('vision')}
                                disabled={actionLoading === `${type}-vision`}
                                className={`py-1.5 rounded-lg text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-1 ${endpoint.is_active_vision
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {actionLoading === `${type}-vision` ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                                {endpoint.is_active_vision ? 'Vis Active' : 'Set Vis'}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
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
