import { useState, useEffect, useCallback } from 'react';
import { Loader2, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../lib/api';
import { listApiKeys } from '../lib/api-keys-service';
import type { ApiKeyInfo, LocalEndpoint } from '../lib/api-keys-service';
import { Dashboard } from './Settings/Dashboard';
import { ConfigurationWizard } from './Settings/ConfigurationWizard';
import { toast } from 'sonner';
import type { ModelOption } from '../lib/provider-models';
import { ProviderHealthProvider } from '../lib/provider-health';
import AIModelSelector from '../components/AIModelSelector';
import { useTaskModels } from '../hooks/useTaskModels';

export default function AIConfig() {
    const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard');
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [taskModelsOpen, setTaskModelsOpen] = useState(false);

    const { generate, improve, vision, setModel } = useTaskModels();

    // Shared state for dynamic models cache to avoid refetching too often
    const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>(() => {
        try {
            const saved = localStorage.getItem('cachedModels');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Failed to load cached models', e);
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('cachedModels', JSON.stringify(dynamicModels));
        } catch (e) {
            console.error('Failed to save cached models', e);
        }
    }, [dynamicModels]);

    const getToken = useCallback(async () => {
        return 'mock-token'; // Authentication removed, using mock/passthrough
    }, []);

    const loadKeys = useCallback(async () => {
        try {
            const result = await listApiKeys();
            setKeys(result);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to load API keys');
        }
    }, []);

    const loadLocalEndpoints = useCallback(async () => {
        try {
            const { data, error: fetchError } = await db
                .from('user_local_endpoints')
                .select('*')
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;
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

    // Derive active providers
    const activeGenCloud = keys.find((k) => k.is_active_gen);
    const activeGenLocal = localEndpoints.find((e) => e.is_active_gen);
    const activeImproveCloud = keys.find((k) => k.is_active_improve);
    const activeImproveLocal = localEndpoints.find((e) => e.is_active_improve);
    const activeVisionCloud = keys.find((k) => k.is_active_vision);
    const activeVisionLocal = localEndpoints.find((e) => e.is_active_vision);

    const activeGen = activeGenCloud || activeGenLocal;
    const activeImprove = activeImproveCloud || activeImproveLocal;
    const activeVision = activeVisionCloud || activeVisionLocal;

    const configuredCount = keys.length + localEndpoints.length;

    // Collect all configured provider IDs (for greying out unavailable models)
    const availableProviders = [
        ...keys.map(k => k.provider),
        ...localEndpoints.map(e => e.provider),
    ];

    const TASK_LABELS: { task: 'generate' | 'improve' | 'vision'; label: string; desc: string; value: string }[] = [
        { task: 'generate', label: 'Generate', desc: 'Random & description-based prompt generation', value: generate },
        { task: 'improve', label: 'Improve', desc: 'Prompt enhancement and refinement', value: improve },
        { task: 'vision', label: 'Vision / Analyse', desc: 'Image analysis and character description', value: vision },
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
            <div className="max-w-5xl mx-auto px-4 py-8">
                {view === 'dashboard' ? (
                    <div className="space-y-12">
                        <Dashboard
                            activeGen={activeGen}
                            activeImprove={activeImprove}
                            activeVision={activeVision}
                            onConfigure={() => setView('wizard')}
                            configuredCount={configuredCount}
                            keys={keys}
                            localEndpoints={localEndpoints}
                            dynamicModels={dynamicModels}
                            setDynamicModels={setDynamicModels}
                            onRefreshData={refreshData}
                            getToken={getToken}
                        />

                        {/* Task Model Preferences */}
                        <div className="border border-slate-800 rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setTaskModelsOpen(v => !v)}
                                className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800/80 hover:from-slate-800/80 hover:to-slate-800/60 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
                                        <Brain size={16} className="text-amber-400" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-semibold text-white">Task Model Preferences</h3>
                                        <p className="text-[11px] text-slate-500">Choose which AI model handles each task type</p>
                                    </div>
                                </div>
                                {taskModelsOpen
                                    ? <ChevronUp size={16} className="text-slate-500" />
                                    : <ChevronDown size={16} className="text-slate-500" />}
                            </button>

                            {taskModelsOpen && (
                                <div className="p-5 bg-slate-900/50 space-y-8">
                                    {TASK_LABELS.map(({ task, label, desc, value }) => (
                                        <div key={task}>
                                            <div className="mb-3">
                                                <h4 className="text-sm font-semibold text-slate-200">{label}</h4>
                                                <p className="text-[11px] text-slate-500">{desc}</p>
                                            </div>
                                            <AIModelSelector
                                                task={task}
                                                value={value}
                                                onChange={(id) => setModel(task, id)}
                                                availableProviders={availableProviders}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <ConfigurationWizard
                        keys={keys}
                        localEndpoints={localEndpoints}
                        onComplete={() => {
                            refreshData();
                            setView('dashboard');
                        }}
                        loadKeys={loadKeys}
                        loadLocalEndpoints={loadLocalEndpoints}
                        getToken={getToken}
                        dynamicModels={dynamicModels}
                        setDynamicModels={setDynamicModels}
                    />
                )}
            </div>
        </ProviderHealthProvider>
    );
}
