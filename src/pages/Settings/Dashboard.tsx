import { useState } from 'react';
import { Zap, Sparkles, Eye, Settings, AlertTriangle, ChevronDown, RefreshCw, BadgeDollarSign } from 'lucide-react';

import type { ApiKeyInfo, LocalEndpoint } from '../../lib/api-keys-service';
import type { ModelOption } from '../../lib/provider-models';
import { setActiveProvider } from '../../lib/api-keys-service';
import { listModels } from '../../lib/ai-service';
import { getDefaultModelForProvider } from '../../lib/provider-models';
import { toast } from 'sonner';
import { useTaskModels } from '../../hooks/useTaskModels';
import AIModelSelector from '../../components/AIModelSelector';


interface DashboardProps {
    activeGen: ApiKeyInfo | LocalEndpoint | undefined;
    activeImprove: ApiKeyInfo | LocalEndpoint | undefined;
    activeVision: ApiKeyInfo | LocalEndpoint | undefined;
    onConfigure: () => void;
    configuredCount: number;
    keys: ApiKeyInfo[];
    localEndpoints: LocalEndpoint[];
    dynamicModels: Record<string, ModelOption[]>;
    setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>;
    onRefreshData: () => Promise<void>;
    getToken: () => Promise<string>;
}

export function Dashboard({
    activeGen, activeImprove, activeVision, onConfigure, configuredCount,
    keys, localEndpoints, dynamicModels, setDynamicModels, onRefreshData, getToken
}: DashboardProps) {

    const allProviders = [...keys, ...localEndpoints];
    const availableProviderIds = Array.from(new Set(allProviders.map(p => p.provider)));

    const taskModels = useTaskModels();

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
                <ProviderStatusCard
                    role="generation"
                    label="Generation"
                    description="Creates prompts from your ideas using advanced reasoning."
                    icon={Zap}
                    activeProvider={activeGen}
                    allProviders={allProviders}
                    dynamicModels={dynamicModels}
                    setDynamicModels={setDynamicModels}
                    onRefreshData={onRefreshData}
                    getToken={getToken}
                    colorClass="amber"
                />
                <ProviderStatusCard
                    role="improvement"
                    label="Improvement"
                    description="Refines and enhances your prompts with expert techniques."
                    icon={Sparkles}
                    activeProvider={activeImprove}
                    allProviders={allProviders}
                    dynamicModels={dynamicModels}
                    setDynamicModels={setDynamicModels}
                    onRefreshData={onRefreshData}
                    getToken={getToken}
                    colorClass="teal"
                />
                <ProviderStatusCard
                    role="vision"
                    label="Vision"
                    description="Analyzes characters and images for style replication."
                    icon={Eye}
                    activeProvider={activeVision}
                    allProviders={allProviders}
                    dynamicModels={dynamicModels}
                    setDynamicModels={setDynamicModels}
                    onRefreshData={onRefreshData}
                    getToken={getToken}
                    colorClass="violet"
                />
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

            {/* Task Model Preferences Section */}
            {configuredCount > 0 && (
                <div className="pt-12 space-y-8 border-t border-slate-800/50">
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Per-Task AI Model Selection</h2>
                        <p className="text-slate-400 max-w-lg mx-auto text-sm">
                            Fine-tune which AI model is used for specific tasks to optimize for creativity, speed, or cost.
                            These selections override the default global provider automatically.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Prompt Generation Task */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Prompt Generation</h3>
                                    <p className="text-xs text-slate-400">Used for Random and Guided generation tools.</p>
                                </div>
                            </div>
                            <AIModelSelector
                                task="generate"
                                value={taskModels.generate}
                                onChange={(id) => taskModels.setModel('generate', id)}
                                availableProviders={availableProviderIds}
                            />
                        </div>

                        {/* Prompt Improvement Task */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Prompt Improvement</h3>
                                    <p className="text-xs text-slate-400">Used for the magic enhancer and diagnostic tools.</p>
                                </div>
                            </div>
                            <AIModelSelector
                                task="improve"
                                value={taskModels.improve}
                                onChange={(id) => taskModels.setModel('improve', id)}
                                availableProviders={availableProviderIds}
                            />
                        </div>

                        {/* Visual Inspection Task */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Visual Inspection</h3>
                                    <p className="text-xs text-slate-400">Used for image analysis and character avatar description.</p>
                                </div>
                            </div>
                            <AIModelSelector
                                task="vision"
                                value={taskModels.vision}
                                onChange={(id) => taskModels.setModel('vision', id)}
                                availableProviders={availableProviderIds}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

interface ProviderStatusCardProps {
    role: 'generation' | 'improvement' | 'vision';
    label: string;
    description: string;
    icon: React.ElementType;
    activeProvider: ApiKeyInfo | LocalEndpoint | undefined;
    allProviders: (ApiKeyInfo | LocalEndpoint)[];
    dynamicModels: Record<string, ModelOption[]>;
    setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>;
    onRefreshData: () => Promise<void>;
    getToken: () => Promise<string>;
    colorClass: 'amber' | 'teal' | 'violet';
}

import { useEffect } from 'react';
import { useProviderHealth } from '../../lib/provider-health';

// ... imports remain the same

// ... Dashboard component remains mostly the same, just props passthrough if needed

function ProviderStatusCard({
    role, label, description, icon: Icon, activeProvider, allProviders,
    dynamicModels, setDynamicModels, onRefreshData, getToken, colorClass
}: ProviderStatusCardProps) {
    const [loading, setLoading] = useState(false);
    const { health, checkHealth } = useProviderHealth();

    // Helper to determine the unique ID of a provider entry
    const getProviderId = (p: ApiKeyInfo | LocalEndpoint) => {
        if ('endpoint_url' in p) return `local-${p.provider}-${p.id}`; // Local endpoints need unique ID
        return `cloud-${p.provider}`;
    };

    const currentProviderId = activeProvider ? getProviderId(activeProvider) : '';
    const providerHealth = activeProvider ? health[currentProviderId] : undefined;

    // Check health on mount or when active provider changes
    useEffect(() => {
        if (activeProvider && !providerHealth) {
            checkHealth(currentProviderId, activeProvider);
        }
    }, [activeProvider, currentProviderId, providerHealth, checkHealth]);

    const handleHealthCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeProvider) {
            checkHealth(currentProviderId, activeProvider);
        }
    };

    const getModels = (p: ApiKeyInfo | LocalEndpoint) => {
        // ... (existing implementation)
        const providerKey = p.provider;
        return dynamicModels[providerKey] || [];
    };

    // ... handleProviderChange and handleModelChange remain the same
    const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        if (!newId) return; // distinct "none" case?

        const newProvider = allProviders.find(p => getProviderId(p) === newId);
        if (!newProvider) return;

        setLoading(true);
        try {
            // When switching provider, we need to pick a default model for this role
            // 1. Check if this provider already has a model set for this role
            let modelToUse = '';
            if (role === 'generation') modelToUse = newProvider.model_gen || newProvider.model_name || '';
            else if (role === 'improvement') modelToUse = newProvider.model_improve || newProvider.model_name || '';
            else if (role === 'vision') modelToUse = newProvider.model_vision || newProvider.model_name || '';

            if (!modelToUse) {
                modelToUse = getDefaultModelForProvider(newProvider.provider);
            }

            await setActiveProvider(newProvider.provider, modelToUse, true, role);
            await onRefreshData();

            // Trigger health check for new provider
            const newProviderId = getProviderId(newProvider);
            checkHealth(newProviderId, newProvider);

            toast.success(`${label} provider changed to ${newProvider.provider}`);
        } catch (err) {
            toast.error('Failed to change provider');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!activeProvider) return;
        const newModel = e.target.value;
        setLoading(true);
        try {
            await setActiveProvider(activeProvider.provider, newModel, true, role);
            await onRefreshData();
            toast.success(`${label} model updated`);
        } catch (err) {
            toast.error('Failed to update model');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTestPricing = async () => {
        // ... (existing implementation)
        if (!activeProvider) return;
        setLoading(true);
        try {
            const token = await getToken();
            const models = await listModels(token, activeProvider.provider);

            // Check for pricing
            const modelsWithPricing = models.filter(m => m.pricing);

            if (modelsWithPricing.length > 0) {
                const sample = modelsWithPricing.find(m => m.id === activeModelName) || modelsWithPricing[0];

                if (sample) {
                    const pricingInfo = sample.pricing ?
                        `Prompt: ${sample.pricing.prompt}, Completion: ${sample.pricing.completion}` :
                        'Pricing available';

                    toast.success(`Pricing verified! Found ${modelsWithPricing.length} models with pricing.`, {
                        description: `${sample.name}: ${pricingInfo}`
                    });
                }
            } else {
                toast.warning('No pricing data found for this provider.', {
                    description: 'The provider may not support pricing info or it is not configured.'
                });
            }

            // Update state to reflect any new data
            setDynamicModels(prev => ({
                ...prev,
                [activeProvider.provider]: models
            }));
        } catch (err) {
            toast.error('Failed to test pricing');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshModels = async () => {
        // ... (existing implementation)
        if (!activeProvider) return;
        setLoading(true);
        try {
            const token = await getToken();
            // If it's a cloud provider, we might need an API key if not waiting for backend proxy
            // For security we rely on backend having the key.
            // listModels(token, providerId)
            const models = await listModels(token, activeProvider.provider);
            setDynamicModels(prev => ({
                ...prev,
                [activeProvider.provider]: models
            }));

            // Also refresh health
            checkHealth(currentProviderId, activeProvider);

            toast.success('Models refreshed');
        } catch (err) {
            toast.error('Failed to refresh models');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    // Color mappings
    // ... (existing mappings)
    const bgColors = {
        amber: 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
        teal: 'bg-teal-500/5 border-teal-500/20 hover:border-teal-500/40',
        violet: 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
    };
    const iconBgColors = {
        amber: 'bg-amber-500/10 text-amber-400',
        teal: 'bg-teal-500/10 text-teal-400',
        violet: 'bg-violet-500/10 text-violet-400',
    };
    const activeBadgeColors = {
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
        violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    };

    // Active Model Display Logic
    let activeModelName = '';
    if (role === 'generation') activeModelName = activeProvider?.model_gen || activeProvider?.model_name || '';
    else if (role === 'improvement') activeModelName = activeProvider?.model_improve || activeProvider?.model_name || '';
    else if (role === 'vision') activeModelName = activeProvider?.model_vision || activeProvider?.model_name || '';

    const activeModelsList = activeProvider ? getModels(activeProvider) : [];

    return (
        <div className={`relative group overflow-visible rounded-2xl border p-6 transition-all duration-300 ${activeProvider ? bgColors[colorClass] : 'bg-slate-900/40 border-slate-800 border-dashed'}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${activeProvider ? iconBgColors[colorClass] : 'bg-slate-800 text-slate-500'}`}>
                    <Icon size={24} />
                </div>
                {activeProvider && (
                    <div className="flex flex-col items-end gap-1">
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${activeBadgeColors[colorClass]}`}>Active</div>

                        {/* Health Status Indicator */}
                        {providerHealth && (
                            <div
                                onClick={handleHealthCheck}
                                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium cursor-pointer transition-colors hover:bg-slate-800/50 ${providerHealth.status === 'ok' ? 'text-green-500' :
                                    providerHealth.status === 'error' ? 'text-red-500' :
                                        'text-slate-500'
                                    }`}
                                title={providerHealth.error || 'Click to re-check health'}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${providerHealth.status === 'ok' ? 'bg-green-500' :
                                    providerHealth.status === 'error' ? 'bg-red-500' :
                                        'bg-slate-500 animate-pulse'
                                    }`} />

                                {providerHealth.status === 'loading' ? (
                                    <span>checking...</span>
                                ) : providerHealth.status === 'error' ? (
                                    <span>error</span>
                                ) : (
                                    <span>{providerHealth.latency}ms</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">{label}</h3>
            {/* ... rest of the component */}
            <p className="text-sm text-slate-400 mb-6 h-10">{description}</p>

            <div className="space-y-4">
                {/* Provider Selection */}
                <div className="space-y-1.5">
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
                        <span>Provider</span>
                    </div>
                    <div className="relative">
                        <select
                            value={currentProviderId}
                            onChange={handleProviderChange}
                            disabled={loading}
                            className="w-full appearance-none bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 transition-colors disabled:opacity-50"
                        >
                            {allProviders.length === 0 && <option value="">No Configured Providers</option>}
                            {allProviders.map(p => {
                                const id = getProviderId(p);
                                const name = p.provider === 'ollama' ? 'Ollama' : (p.provider === 'lmstudio' ? 'LM Studio' : (p.provider.charAt(0).toUpperCase() + p.provider.slice(1)));
                                const label = 'endpoint_url' in p ? `${name} (Local)` : name;
                                return (
                                    <option key={id} value={id}>{label}</option>
                                );
                            })}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>

                {/* Model Selection */}
                {activeProvider && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center justify-between">
                            <span>Model</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleTestPricing}
                                    disabled={loading}
                                    className="text-slate-500 hover:text-green-400 transition-colors"
                                    title="Test Pricing Retrieval"
                                >
                                    <BadgeDollarSign size={12} className={loading ? "animate-pulse" : ""} />
                                </button>
                                <button
                                    onClick={handleRefreshModels}
                                    disabled={loading}
                                    className="text-slate-500 hover:text-white transition-colors"
                                    title="Refresh Models"
                                >
                                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>

                        {activeModelsList.length > 0 ? (
                            <div className="relative">
                                <select
                                    value={activeModelName}
                                    onChange={handleModelChange}
                                    disabled={loading}
                                    className="w-full appearance-none bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 transition-colors disabled:opacity-50"
                                >
                                    {activeModelsList.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name || m.id} {m.pricing ? '($)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={activeModelName}
                                    disabled
                                    className="w-full bg-slate-900/30 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 italic"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button onClick={handleTestPricing} className="p-1 hover:bg-slate-700 rounded transition-colors" title="Test Pricing">
                                        <BadgeDollarSign size={12} className="text-slate-500 hover:text-green-400" />
                                    </button>
                                    <button onClick={handleRefreshModels} className="p-1 hover:bg-slate-700 rounded transition-colors">
                                        <RefreshCw size={12} className={loading ? "animate-spin text-teal-500" : "text-slate-500"} />
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
