import { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, Sparkles, Eye, BookOpen, Settings } from 'lucide-react';
import { db } from '../lib/api';
import { listApiKeys } from '../lib/api-keys-service';
import type { ApiKeyInfo, LocalEndpoint } from '../lib/api-keys-service';
import { ConfigurationWizard } from './Settings/ConfigurationWizard';
import { toast } from 'sonner';
import type { ModelOption } from '../lib/provider-models';
import { ProviderHealthProvider } from '../lib/provider-health';
import AIModelSelector from '../components/AIModelSelector';
import { useTaskModels } from '../hooks/useTaskModels';

export default function AIConfig() {
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showProviders, setShowProviders] = useState(false);

    const { generate, improve, vision, research, setModel } = useTaskModels();

    const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>(() => {
        try {
            const saved = localStorage.getItem('cachedModels');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('cachedModels', JSON.stringify(dynamicModels));
        } catch { /* ignore */ }
    }, [dynamicModels]);

    const loadKeys = useCallback(async () => {
        try {
            setKeys(await listApiKeys());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to load API keys');
        }
    }, []);

    const loadLocalEndpoints = useCallback(async () => {
        try {
            const { data, error } = await db
                .from('user_local_endpoints')
                .select('*')
                .order('updated_at', { ascending: false });
            if (error) throw error;
            setLocalEndpoints(data || []);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to load local endpoints');
        }
    }, []);

    const refreshData = useCallback(async () => {
        await Promise.all([loadKeys(), loadLocalEndpoints()]);
    }, [loadKeys, loadLocalEndpoints]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await refreshData();
            setLoading(false);
        };
        init();
    }, [refreshData]);

    const availableProviders = [
        ...keys.map(k => k.provider),
        ...localEndpoints.map(e => e.provider),
    ];

    if (loading && keys.length === 0 && localEndpoints.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 size={32} className="text-teal-500 animate-spin" />
            </div>
        );
    }

    return (
        <ProviderHealthProvider>
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">AI Configuration</h1>
                    <p className="text-slate-400 text-sm mt-1">Choose which AI model handles each task</p>
                </div>

                {/* 4 Task Model Cards */}
                <div className="space-y-6">

                    {/* Generation */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Zap size={20} /></div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Prompt Generation</h3>
                                <p className="text-xs text-slate-400">Used for Random and Guided generation tools</p>
                            </div>
                        </div>
                        <AIModelSelector
                            task="generate"
                            value={generate}
                            onChange={(id) => setModel('generate', id)}
                            availableProviders={availableProviders}
                        />
                    </div>

                    {/* Improvement */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg"><Sparkles size={20} /></div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Prompt Improvement</h3>
                                <p className="text-xs text-slate-400">Used for the magic enhancer and diagnostic tools</p>
                            </div>
                        </div>
                        <AIModelSelector
                            task="improve"
                            value={improve}
                            onChange={(id) => setModel('improve', id)}
                            availableProviders={availableProviders}
                        />
                    </div>

                    {/* Vision */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg"><Eye size={20} /></div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Visual Inspection</h3>
                                <p className="text-xs text-slate-400">Used for image analysis and character avatar description</p>
                            </div>
                        </div>
                        <AIModelSelector
                            task="vision"
                            value={vision}
                            onChange={(id) => setModel('vision', id)}
                            availableProviders={availableProviders}
                        />
                    </div>

                    {/* Research */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><BookOpen size={20} /></div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Research & Reasoning</h3>
                                <p className="text-xs text-slate-400">Used for style analysis, deep reasoning and recommendations</p>
                            </div>
                        </div>
                        <AIModelSelector
                            task="research"
                            value={research}
                            onChange={(id) => setModel('research', id)}
                            availableProviders={availableProviders}
                        />
                    </div>

                </div>

                {/* Configure Providers Button */}
                <div>
                    <button
                        onClick={() => setShowProviders(v => !v)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                        <Settings size={16} />
                        {showProviders ? 'Hide Provider Configuration' : 'Configure Providers'}
                    </button>
                </div>

                {/* Inline Provider Configuration */}
                {showProviders && (
                    <ConfigurationWizard
                        keys={keys}
                        localEndpoints={localEndpoints}
                        onComplete={() => { refreshData(); setShowProviders(false); }}
                        loadKeys={loadKeys}
                        loadLocalEndpoints={loadLocalEndpoints}
                        dynamicModels={dynamicModels}
                        setDynamicModels={setDynamicModels}
                    />
                )}

            </div>
        </ProviderHealthProvider>
    );
}
