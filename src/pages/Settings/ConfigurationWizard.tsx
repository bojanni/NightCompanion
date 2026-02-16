import { useState, useEffect } from 'react';
import {
    ArrowRight, ArrowLeft, Check, Zap, Sparkles, Eye,
    Cpu, LayoutDashboard, Database, Loader2
} from 'lucide-react';
import { PROVIDERS } from '../../lib/providers';
import { ProviderConfigForm } from './ProviderConfigForm';
import { LocalEndpointCard } from '../../components/LocalEndpointCard'; // Adjust path if moved
import type { ApiKeyInfo, LocalEndpoint } from '../../lib/api-keys-service';
import { setActiveProvider } from '../../lib/api-keys-service';
import type { ModelOption } from '../../lib/provider-models';
import { toast } from 'sonner';

interface ConfigurationWizardProps {
    keys: ApiKeyInfo[];
    localEndpoints: LocalEndpoint[];
    onComplete: () => void;
    loadKeys: () => Promise<void>;
    loadLocalEndpoints: () => Promise<void>;
    getToken: () => Promise<string>;
    dynamicModels: Record<string, ModelOption[]>;
    setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>;
}

type SetupType = 'quick' | 'advanced' | 'local';

export function ConfigurationWizard({
    keys, localEndpoints, onComplete, loadKeys, loadLocalEndpoints, getToken, dynamicModels, setDynamicModels
}: ConfigurationWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [setupType, setSetupType] = useState<SetupType | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // ROLES STATE for Step 3
    const [roleGen, setRoleGen] = useState<string>('');
    const [roleImprove, setRoleImprove] = useState<string>('');
    const [roleVision, setRoleVision] = useState<string>('');

    // Initialize roles based on current active providers
    useEffect(() => {
        const activeGen = keys.find(k => k.is_active_gen) || localEndpoints.find(e => e.is_active_gen);
        const activeImprove = keys.find(k => k.is_active_improve) || localEndpoints.find(e => e.is_active_improve);
        const activeVision = keys.find(k => k.is_active_vision) || localEndpoints.find(e => e.is_active_vision);

        if (activeGen) setRoleGen(activeGen.provider);
        if (activeImprove) setRoleImprove(activeImprove.provider);
        if (activeVision) setRoleVision(activeVision.provider);
    }, [keys, localEndpoints]);

    const handleNext = () => {
        setStep(prev => Math.min(prev + 1, 3) as 1 | 2 | 3);
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 1) as 1 | 2 | 3);
    };

    const handleFinish = () => {
        onComplete();
    };

    const handleSaveRoles = async () => {
        setActionLoading('saving-roles');
        try {
            // Save Generation Role
            if (roleGen) {
                const provider = keys.find(k => k.provider === roleGen) || localEndpoints.find(e => e.provider === roleGen);
                if (provider) {
                    const model = 'endpoint_url' in provider
                        ? (provider.model_gen || provider.model_name)
                        : (provider.model_gen || provider.model_name);
                    await setActiveProvider(roleGen, model || '', true, 'generation');
                }
            }

            // Save Improvement Role
            if (roleImprove) {
                const provider = keys.find(k => k.provider === roleImprove) || localEndpoints.find(e => e.provider === roleImprove);
                if (provider) {
                    const model = 'endpoint_url' in provider
                        ? (provider.model_improve || provider.model_name)
                        : (provider.model_improve || provider.model_name);
                    await setActiveProvider(roleImprove, model || '', true, 'improvement');
                }
            }

            // Save Vision Role
            if (roleVision) {
                // For vision, model might not be strictly required yet in backend logic if using default, but pass empty str
                await setActiveProvider(roleVision, '', true, 'vision');
            }

            await loadKeys();
            await loadLocalEndpoints();
            toast.success('AI Roles updated successfully');
            handleFinish();

        } catch (e) {
            toast.error('Failed to save role preferences');
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };


    // Filtering providers based on setup type
    const getVisibleProviders = () => {
        if (setupType === 'quick') return PROVIDERS.filter(p => p.id === 'openai'); // Just OpenAI for quick start
        if (setupType === 'local') return []; // Only local endpoints
        return PROVIDERS; // advanced shows all
    };

    const getModelDisplay = (providerId: string, role: 'generation' | 'improvement' | 'vision') => {
        if (!providerId) return null;
        const provider = keys.find(k => k.provider === providerId) || localEndpoints.find(e => e.provider === providerId);
        if (!provider) return null;

        let model = '';
        if ('endpoint_url' in provider) {
            // Local Endpoint
            if (role === 'generation') model = provider.model_gen || provider.model_name || '';
            else if (role === 'improvement') model = provider.model_improve || provider.model_name || '';
            else if (role === 'vision') model = provider.model_vision || provider.model_name || '';
        } else {
            // Cloud Provider (ApiKeyInfo)
            if (role === 'generation') model = provider.model_gen || provider.model_name || '';
            else if (role === 'improvement') model = provider.model_improve || provider.model_name || '';
            else if (role === 'vision') model = provider.model_vision || provider.model_name || '';
        }
        return model;
    };

    const showLocal = setupType === 'local' || setupType === 'advanced';
    const showCloud = setupType !== 'local';

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-800 -z-10" />
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        onClick={() => setStep(s as 1 | 2 | 3)}
                        className={`flex flex-col items-center gap-2 bg-slate-950 px-2 relative z-0 transition-colors duration-300 cursor-pointer hover:opacity-80`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300
                ${step >= s ? 'bg-teal-500 border-teal-500 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-500'}
             `}>
                            {step > s ? <Check size={16} /> : s}
                        </div>
                        <span className={`text-xs font-medium ${step >= s ? 'text-teal-400' : 'text-slate-500'}`}>
                            {s === 1 ? 'Setup Type' : s === 2 ? 'Configure' : 'Roles'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step 1: Setup Type */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={() => { setSetupType('quick'); handleNext(); }}
                        className={`cursor-pointer group relative p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]
                ${setupType === 'quick' ? 'bg-teal-500/10 border-teal-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
            `}
                    >
                        <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl w-fit mb-4">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Quick Start</h3>
                        <p className="text-sm text-slate-400">
                            Get started instantly with OpenAI. Best for new users who want a reliable, high-quality experience.
                        </p>
                    </button>

                    <button
                        onClick={() => { setSetupType('advanced'); handleNext(); }}
                        className={`cursor-pointer group relative p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]
                ${setupType === 'advanced' ? 'bg-violet-500/10 border-violet-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
            `}
                    >
                        <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl w-fit mb-4">
                            <LayoutDashboard size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Advanced Setup</h3>
                        <p className="text-sm text-slate-400">
                            Mix and match multiple providers (Cloud & Local) for different tasks. Full control over your AI stack.
                        </p>
                    </button>

                    <button
                        onClick={() => { setSetupType('local'); handleNext(); }}
                        className={`cursor-pointer group relative p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]
                ${setupType === 'local' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
            `}
                    >
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl w-fit mb-4">
                            <Database size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Local / Private</h3>
                        <p className="text-sm text-slate-400">
                            Run everything locally using Ollama or LM Studio. Maximum privacy, no API keys required.
                        </p>
                    </button>
                </div>
            )}

            {/* Step 2: Configure Providers */}
            {step === 2 && (
                <div className="space-y-8">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Configure your Providers</h2>
                        <p className="text-slate-400 text-sm mt-2">Enter API keys or connection details for your chosen providers.</p>
                    </div>

                    {showCloud && (
                        <div className="space-y-4">
                            {getVisibleProviders().map(provider => {
                                const keyInfo = keys.find(k => k.provider === provider.id);
                                // In Quick mode, always show OpenAI form. In Advanced, show all forms (collapsed handling inside form handled by "Not Configured" state)
                                // Actually ProviderConfigForm handles "Not Configured" state nicely.
                                return (
                                    <div key={provider.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                                        <ProviderConfigForm
                                            provider={provider}
                                            keyInfo={keyInfo}
                                            actionLoading={actionLoading}
                                            setActionLoading={setActionLoading}
                                            loadKeys={loadKeys}
                                            loadLocalEndpoints={loadLocalEndpoints}
                                            dynamicModels={dynamicModels[provider.id] || []}
                                            setDynamicModels={setDynamicModels}
                                            getToken={getToken}
                                            isGlobalActive={keyInfo?.is_active || false}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showLocal && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Cpu size={20} className="text-amber-400" /> Local Providers
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <LocalEndpointCard
                                    type="ollama"
                                    endpoint={localEndpoints.find(e => e.provider === 'ollama')}
                                    actionLoading={actionLoading}
                                    onSave={async (url, mGen, mImp, mVis) => {
                                        // Re-using logic from Settings.tsx via duplication for now or we should pass handler
                                        // Ideally we should pass a specific handler or move the logic to a hook/service
                                        // For simplicity/speed in this refactor, I'll allow inline definition or require props.
                                        // ConfigurationWizard props expects standard handlers but LocalEndpointCard expects onSave signature.
                                        // I will implement a wrapper here.

                                        // Actually, let's keep it simple. LocalEndpointCard expects onSaveUrl...
                                        // Wait, LocalEndpointCard prop onSave signature is (url, gen, imp) => void.
                                        // I need to implement the API call here.
                                        setActionLoading('ollama');
                                        try {
                                            // Should import db? Or move this logic to service? 
                                            // I'll import DB for now as it's quick.
                                            // Wait, ConfigurationWizard shouldn't have direct DB access ideally, but Settings.tsx does.
                                            // I'll assume DB import is available or we should import it.
                                            // Let's import { db } from '../../lib/api';
                                            const { db } = await import('../../lib/api'); // Dynamic import or top level
                                            const existing = localEndpoints.find(e => e.provider === 'ollama');
                                            await db.from('user_local_endpoints').delete().eq('provider', 'ollama');
                                            await db.from('user_local_endpoints').insert({
                                                provider: 'ollama', endpoint_url: url, model_name: mGen,
                                                model_gen: mGen, model_improve: mImp, model_vision: mVis,
                                                is_active: existing?.is_active ?? false,
                                                is_active_gen: existing?.is_active_gen ?? false,
                                                is_active_improve: existing?.is_active_improve ?? false,
                                                is_active_vision: existing?.is_active_vision ?? false
                                            });
                                            await loadLocalEndpoints();
                                            toast.success('Ollama config saved');
                                        } catch (_) { toast.error('Failed to save Ollama'); }
                                        finally { setActionLoading(null); }
                                    }}
                                    onDelete={async () => {
                                        setActionLoading('ollama-delete');
                                        try {
                                            const { db } = await import('../../lib/api');
                                            await db.from('user_local_endpoints').delete().eq('provider', 'ollama');
                                            await loadLocalEndpoints();
                                            toast.success('Ollama removed');
                                        } catch (_) { toast.error('Failed to remove'); }
                                        finally { setActionLoading(null); }
                                    }}
                                    onSetActive={async (role) => {
                                        // Similar wrapper
                                        setActionLoading(`ollama-${role}`);
                                        try {
                                            const endpoint = localEndpoints.find(e => e.provider === 'ollama');
                                            const model = role === 'generation'
                                                ? (endpoint?.model_gen || endpoint?.model_name)
                                                : role === 'improvement'
                                                    ? (endpoint?.model_improve || endpoint?.model_name)
                                                    : (endpoint?.model_vision || endpoint?.model_name); // Vision
                                            // Vision check
                                            const isRoleActive = role === 'generation' ? endpoint?.is_active_gen : role === 'improvement' ? endpoint?.is_active_improve : endpoint?.is_active_vision;
                                            await setActiveProvider('ollama', model || '', !isRoleActive, role);
                                            await loadKeys(); await loadLocalEndpoints();
                                        } catch (_) { toast.error('Failed toggle'); }
                                        finally { setActionLoading(null); }
                                    }}
                                />
                                <LocalEndpointCard
                                    type="lmstudio"
                                    endpoint={localEndpoints.find(e => e.provider === 'lmstudio')}
                                    actionLoading={actionLoading}
                                    onSave={async (url, mGen, mImp, mVis) => {
                                        setActionLoading('lmstudio');
                                        try {
                                            const { db } = await import('../../lib/api');
                                            const existing = localEndpoints.find(e => e.provider === 'lmstudio');
                                            await db.from('user_local_endpoints').delete().eq('provider', 'lmstudio');
                                            await db.from('user_local_endpoints').insert({
                                                provider: 'lmstudio', endpoint_url: url, model_name: mGen,
                                                model_gen: mGen, model_improve: mImp, model_vision: mVis,
                                                is_active: existing?.is_active ?? false,
                                                is_active_gen: existing?.is_active_gen ?? false,
                                                is_active_improve: existing?.is_active_improve ?? false,
                                                is_active_vision: existing?.is_active_vision ?? false
                                            });
                                            await loadLocalEndpoints();
                                            toast.success('LM Studio config saved');
                                        } catch (_) { toast.error('Failed to save LM Studio'); }
                                        finally { setActionLoading(null); }
                                    }}
                                    onDelete={async () => {
                                        setActionLoading('lmstudio-delete');
                                        try {
                                            const { db } = await import('../../lib/api');
                                            await db.from('user_local_endpoints').delete().eq('provider', 'lmstudio');
                                            await loadLocalEndpoints();
                                            toast.success('LM Studio removed');
                                        } catch (_) { toast.error('Failed to remove'); }
                                        finally { setActionLoading(null); }
                                    }}
                                    onSetActive={async (role) => {
                                        setActionLoading(`lmstudio-${role}`);
                                        try {
                                            const endpoint = localEndpoints.find(e => e.provider === 'lmstudio');
                                            const model = role === 'generation'
                                                ? (endpoint?.model_gen || endpoint?.model_name)
                                                : role === 'improvement'
                                                    ? (endpoint?.model_improve || endpoint?.model_name)
                                                    : (endpoint?.model_vision || endpoint?.model_name);
                                            const isRoleActive = role === 'generation' ? endpoint?.is_active_gen : role === 'improvement' ? endpoint?.is_active_improve : endpoint?.is_active_vision;
                                            await setActiveProvider('lmstudio', model || '', !isRoleActive, role);
                                            await loadKeys(); await loadLocalEndpoints();
                                        } catch (_) { toast.error('Failed toggle'); }
                                        finally { setActionLoading(null); }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                        <button onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button onClick={handleNext} className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold px-6 py-2 rounded-xl flex items-center gap-2 transition-colors">
                            Next Step <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Role Assignment */}
            {step === 3 && (
                <div className="space-y-8 max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Assign AI Roles</h2>
                        <p className="text-slate-400 text-sm mt-2">Choose which provider handles each task.</p>
                    </div>

                    <div className="space-y-6">
                        {/* Generation Role */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"> <Zap size={20} /> </div>
                                <div>
                                    <h3 className="text-base font-semibold text-white">Generation AI</h3>
                                    <p className="text-xs text-slate-500">Creates new prompts and expands concepts.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Primary Provided</label>
                                <select
                                    value={roleGen}
                                    onChange={(e) => setRoleGen(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                                >
                                    <option value="">Select a provider...</option>
                                    {/* Combine keys and localEndpoints */}
                                    {[...keys, ...localEndpoints].map(p => (
                                        <option key={p.provider} value={p.provider}>
                                            {'endpoint_url' in p
                                                ? (p.provider === 'ollama' ? 'Ollama (Local)' : 'LM Studio (Local)')
                                                : PROVIDERS.find(prom => prom.id === p.provider)?.name || p.provider
                                            }
                                        </option>
                                    ))}
                                </select>
                                {roleGen && getModelDisplay(roleGen, 'generation') && (
                                    <div className="mt-2 px-3 py-2 bg-slate-950/30 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Selected Model</span>
                                        <span className="text-teal-400 font-mono truncate max-w-[180px]" title={getModelDisplay(roleGen, 'generation') || ''}>
                                            {getModelDisplay(roleGen, 'generation')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Improvement Role */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg"> <Sparkles size={20} /> </div>
                                <div>
                                    <h3 className="text-base font-semibold text-white">Improvement AI</h3>
                                    <p className="text-xs text-slate-500">Refines prompts and enhances detail.</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Primary Provided</label>
                                <select
                                    value={roleImprove}
                                    onChange={(e) => setRoleImprove(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500"
                                >
                                    <option value="">Select a provider...</option>
                                    {[...keys, ...localEndpoints].map(p => (
                                        <option key={p.provider} value={p.provider}>
                                            {'endpoint_url' in p
                                                ? (p.provider === 'ollama' ? 'Ollama (Local)' : 'LM Studio (Local)')
                                                : PROVIDERS.find(prom => prom.id === p.provider)?.name || p.provider
                                            }
                                        </option>
                                    ))}
                                </select>
                                {roleImprove && getModelDisplay(roleImprove, 'improvement') && (
                                    <div className="mt-2 px-3 py-2 bg-slate-950/30 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Selected Model</span>
                                        <span className="text-teal-400 font-mono truncate max-w-[180px]" title={getModelDisplay(roleImprove, 'improvement') || ''}>
                                            {getModelDisplay(roleImprove, 'improvement')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vision Role */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg"> <Eye size={20} /> </div>
                                <div>
                                    <h3 className="text-base font-semibold text-white">Vision AI</h3>
                                    <p className="text-xs text-slate-500">Analyzes images for style referencing (new).</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Primary Provided</label>
                                <select
                                    value={roleVision}
                                    onChange={(e) => setRoleVision(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                                >
                                    <option value="">Select a provider...</option>
                                    {[...keys, ...localEndpoints].map(p => (
                                        <option key={p.provider} value={p.provider}>
                                            {'endpoint_url' in p
                                                ? (p.provider === 'ollama' ? 'Ollama (Local)' : 'LM Studio (Local)')
                                                : PROVIDERS.find(prom => prom.id === p.provider)?.name || p.provider
                                            }
                                        </option>
                                    ))}
                                </select>
                                {roleVision && getModelDisplay(roleVision, 'vision') && (
                                    <div className="mt-2 px-3 py-2 bg-slate-950/30 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Selected Model</span>
                                        <span className="text-teal-400 font-mono truncate max-w-[180px]" title={getModelDisplay(roleVision, 'vision') || ''}>
                                            {getModelDisplay(roleVision, 'vision')}
                                        </span>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-500 mt-2 italic">
                                    Vision requires a provider that supports image inputs (e.g. GPT-4o, Claude 3, Gemini 1.5).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                        <button onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-2 px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <button
                            onClick={handleSaveRoles}
                            disabled={actionLoading === 'saving-roles'}
                            className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
                        >
                            {actionLoading === 'saving-roles' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            Complete Setup
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
