import { useState, useEffect, useCallback } from 'react';
import {
  Key, ExternalLink, Loader2, Check, Trash2, Shield, Zap, Sparkles,
  Eye, EyeOff, RefreshCw, Server, Globe, TestTube2,
  Laptop, Cloud
} from 'lucide-react';
import { db, supabase } from '../lib/api';
import { listApiKeys, saveApiKey, deleteApiKey, setActiveProvider, updateModels } from '../lib/api-keys-service';
import type { ApiKeyInfo } from '../lib/api-keys-service';
import { testConnection } from '../lib/ai-service';
import { ApiKeySchema } from '../lib/validation-schemas';
import { DataManagement } from '../components/DataManagement';
import { getModelsForProvider, getDefaultModelForProvider } from '../lib/provider-models';
import type { ModelOption } from '../lib/provider-models';
import { listModels } from '../lib/ai-service';
import ModelSelector from '../components/ModelSelector';
import { LocalEndpointCard } from '../components/LocalEndpointCard';


// ... (Removing SettingsProps as it's unused now)


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

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT-4o-mini models. Great all-around choice for prompt generation and analysis.',
    docsUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-proj-...',
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    icon: <Globe size={18} />,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash model. Fast, capable, and generous free tier.',
    docsUrl: 'https://aistudio.google.com/apikey',
    placeholder: 'AIza...',
    gradient: 'from-blue-500 to-cyan-600',
    bgGlow: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    icon: <Sparkles size={18} />,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude Sonnet 4 model. Excellent at nuanced creative writing and detailed prompts.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    icon: <Zap size={18} />,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified gateway to 100+ AI models. One key, many providers.',
    docsUrl: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...',
    gradient: 'from-rose-500 to-pink-600',
    bgGlow: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    icon: <Cloud size={18} />,
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Fast inference for open-source models like Llama 3 and Mixtral.',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    placeholder: 'talk_...',
    gradient: 'from-violet-600 to-indigo-600',
    bgGlow: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    icon: <Server size={18} />,
  },
];

export default function Settings() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New state for selected cloud provider
  const [selectedProviderId, setSelectedProviderId] = useState<string>(PROVIDERS[0]?.id || 'openai');

  // Dynamic model lists state
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>(() => {
    try {
      const saved = localStorage.getItem('cachedModels');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load cached models', e);
      return {};
    }
  });

  // Save to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cachedModels', JSON.stringify(dynamicModels));
    } catch (e) {
      console.error('Failed to save cached models', e);
    }
  }, [dynamicModels]);

  const getToken = useCallback(async () => {
    return 'mock-token';
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const token = await getToken();
      const result = await listApiKeys(token);
      setKeys(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadLocalEndpoints = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_local_endpoints')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLocalEndpoints(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load local endpoints');
    }
  }, []);

  useEffect(() => {
    loadKeys();
    loadLocalEndpoints();
  }, [loadKeys, loadLocalEndpoints]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      const token = await getToken();
      await testConnection(token);
      setTestResult({ success: true, message: 'Connection successful! Your AI provider is configured correctly.' });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Connection failed';
      setTestResult({
        success: false,
        message: errorMsg // Detailed error handling omitted for brevity, keeping existing logic in mind
      });
    } finally {
      setTesting(false);
    }
  }

  const activeProvider = keys.find((k) => k.is_active);
  const activeLocalEndpoint = localEndpoints.find((e) => e.is_active);
  const configuredCount = keys.length + localEndpoints.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure your AI provider credentials for smart prompt features.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield size={20} className="text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">How it works</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your API keys are encrypted with AES-256-GCM before storage and never leave the server unencrypted.
              Only the AI processing functions can decrypt them to make requests on your behalf.
            </p>
          </div>
        </div>
      </div>

      {(activeProvider || activeLocalEndpoint) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3">
            <Zap size={16} className="text-amber-400" />
            <p className="text-sm text-slate-300">
              Active provider: <span className="font-medium text-white">
                {activeLocalEndpoint
                  ? `${activeLocalEndpoint.provider === 'ollama' ? 'Ollama' : 'LM Studio'} (${activeLocalEndpoint.model_name})`
                  : PROVIDERS.find((p) => p.id === activeProvider?.provider)?.name}
              </span>
            </p>
            <span className="text-xs text-slate-500 ml-auto">{configuredCount} provider{configuredCount !== 1 ? 's' : ''} configured</span>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
            {testing ? 'Testing connection...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={`border rounded-xl px-4 py-3 text-sm ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <div className="flex items-start gap-2">
                {testResult.success ? <Check size={14} className="mt-0.5" /> : <Trash2 size={14} className="mt-0.5" />}
                <div className="whitespace-pre-line leading-relaxed">{testResult.message}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
          <Check size={14} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-slate-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Cloud Providers Manager */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Cloud Providers</h2>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl relative z-10">
              {/* Provider Selector Tabs */}
              <div className="flex items-center overflow-x-auto border-b border-slate-800 no-scrollbar rounded-t-2xl">
                {PROVIDERS.map(p => {
                  const isConfigured = keys.some(k => k.provider === p.id);
                  const isActive = activeProvider?.provider === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProviderId(p.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${selectedProviderId === p.id
                        ? 'text-teal-400 border-teal-500 bg-slate-800/50'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
                        }`}
                    >
                      <span className={isActive ? 'text-amber-400' : ''}>{p.name}</span>
                      {isConfigured && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                  )
                })}
              </div>

              {/* Selected Provider Config */}
              <div className="p-6">
                {PROVIDERS.map(provider => {
                  if (provider.id !== selectedProviderId) return null;

                  const keyInfo = keys.find((k) => k.provider === provider.id);

                  return (
                    <div key={provider.id} className="animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-base font-semibold text-white flex items-center gap-2">
                            {provider.name} Configuration
                          </h3>
                          <p className="text-sm text-slate-400 mt-1">{provider.description}</p>
                          <a
                            href={provider.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mt-2 transition-colors"
                          >
                            Get API Key <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>

                      <ProviderConfigForm
                        provider={provider}
                        keyInfo={keyInfo}
                        actionLoading={actionLoading}
                        setActionLoading={setActionLoading}
                        setError={setError}
                        showSuccess={showSuccess}
                        getToken={getToken}
                        loadKeys={loadKeys}
                        loadLocalEndpoints={loadLocalEndpoints}
                        dynamicModels={dynamicModels[provider.id]}
                        setDynamicModels={setDynamicModels}
                        isGlobalActive={activeProvider?.provider === provider.id}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            {/* Local LLMs Section - kept separate and pinned */}
            <div className="flex items-center gap-2 mb-4 mt-8">
              <Laptop size={18} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Local LLMs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocalEndpointCard
                type="ollama"
                endpoint={localEndpoints.find((e) => e.provider === 'ollama')}
                actionLoading={actionLoading}
                onSave={async (endpointUrl, modelGen, modelImprove) => {
                  setActionLoading('ollama');
                  setError('');
                  try {
                    const existing = localEndpoints.find(e => e.provider === 'ollama');
                    await db.from('user_local_endpoints').delete().eq('provider', 'ollama');
                    const { error: insertError } = await supabase
                      .from('user_local_endpoints')
                      .insert({
                        provider: 'ollama',
                        endpoint_url: endpointUrl,
                        model_name: modelGen,
                        model_gen: modelGen,
                        model_improve: modelImprove,
                        is_active: existing?.is_active ?? false,
                        is_active_gen: existing?.is_active_gen ?? false,
                        is_active_improve: existing?.is_active_improve ?? false,
                      });
                    if (insertError) throw insertError;
                    await loadLocalEndpoints();
                    showSuccess('Ollama configuration saved');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to save Ollama config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onDelete={async () => {
                  setActionLoading('ollama-delete');
                  setError('');
                  try {
                    await db.from('user_local_endpoints').delete().eq('provider', 'ollama');
                    await loadLocalEndpoints();
                    showSuccess('Ollama configuration removed');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to delete Ollama config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onSetActive={async (role) => {
                  setActionLoading(`ollama-${role}`);
                  setError('');
                  try {
                    const token = await getToken();
                    const endpoint = localEndpoints.find(e => e.provider === 'ollama');
                    const isRoleActive = role === 'generation' ? (endpoint?.is_active_gen ?? false) : (endpoint?.is_active_improve ?? false);
                    await setActiveProvider('ollama', endpoint?.model_name || '', token, !isRoleActive, role);
                    showSuccess(`Ollama ${role} ${isRoleActive ? 'deactivated' : 'activated'}`);
                    await loadKeys();
                    await loadLocalEndpoints();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to activate Ollama');
                  } finally {
                    setActionLoading(null);
                  }
                }}
              />
              <LocalEndpointCard
                type="lmstudio"
                endpoint={localEndpoints.find((e) => e.provider === 'lmstudio')}
                actionLoading={actionLoading}
                onSave={async (endpointUrl, modelGen, modelImprove) => {
                  setActionLoading('lmstudio');
                  setError('');
                  try {
                    const existing = localEndpoints.find(e => e.provider === 'lmstudio');
                    await db.from('user_local_endpoints').delete().eq('provider', 'lmstudio');
                    const { error: insertError } = await supabase
                      .from('user_local_endpoints')
                      .insert({
                        provider: 'lmstudio',
                        endpoint_url: endpointUrl,
                        model_name: modelGen,
                        model_gen: modelGen,
                        model_improve: modelImprove,
                        is_active: existing?.is_active ?? false,
                        is_active_gen: existing?.is_active_gen ?? false,
                        is_active_improve: existing?.is_active_improve ?? false,
                      });
                    if (insertError) throw insertError;
                    await loadLocalEndpoints();
                    showSuccess('LM Studio configuration saved');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to save LM Studio config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onDelete={async () => {
                  setActionLoading('lmstudio-delete');
                  try {
                    await db.from('user_local_endpoints').delete().eq('provider', 'lmstudio');
                    await loadLocalEndpoints();
                    showSuccess('LM Studio configuration removed');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to delete config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onSetActive={async (role) => {
                  setActionLoading(`lmstudio-${role}`);
                  try {
                    const token = await getToken();
                    const endpoint = localEndpoints.find(e => e.provider === 'lmstudio');
                    const isRoleActive = role === 'generation' ? (endpoint?.is_active_gen ?? false) : (endpoint?.is_active_improve ?? false);
                    await setActiveProvider('lmstudio', endpoint?.model_name || '', token, !isRoleActive, role);
                    showSuccess(`LM Studio ${role} ${isRoleActive ? 'deactivated' : 'activated'}`);
                    await loadKeys();
                    await loadLocalEndpoints();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed active toggle');
                  } finally {
                    setActionLoading(null);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      <DataManagement />
    </div>
  );
}

interface ProviderConfigFormProps {
  provider: any;
  keyInfo?: ApiKeyInfo | null;
  actionLoading: string | null;
  setActionLoading: (id: string | null) => void;
  setError: (err: string) => void;
  showSuccess: (msg: string) => void;
  getToken: () => Promise<string>;
  loadKeys: () => Promise<void>;
  loadLocalEndpoints: () => Promise<void>;
  dynamicModels?: ModelOption[];
  setDynamicModels: any;
  isGlobalActive: boolean;
}

function ProviderConfigForm({
  provider, keyInfo, actionLoading, setActionLoading, setError, showSuccess, getToken, loadKeys, loadLocalEndpoints, dynamicModels, setDynamicModels
}: ProviderConfigFormProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedModelGen, setSelectedModelGen] = useState(
    keyInfo?.model_gen || keyInfo?.model_name || getDefaultModelForProvider(provider.id)
  );
  const [selectedModelImprove, setSelectedModelImprove] = useState(
    keyInfo?.model_improve || keyInfo?.model_name || getDefaultModelForProvider(provider.id)
  );
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (keyInfo) {
      const serverGen = keyInfo.model_gen || keyInfo.model_name || getDefaultModelForProvider(provider.id);
      const serverImprove = keyInfo.model_improve || keyInfo.model_name || getDefaultModelForProvider(provider.id);
      setSelectedModelGen(serverGen);
      setSelectedModelImprove(serverImprove);
    } else {
      // Reset if no key info (e.g. removed)
      setSelectedModelGen(getDefaultModelForProvider(provider.id));
      setSelectedModelImprove(getDefaultModelForProvider(provider.id));
    }
  }, [keyInfo?.model_gen, keyInfo?.model_improve, keyInfo?.model_name, provider.id, keyInfo]); // Added keyInfo to satisfy lint

  const staticModels = getModelsForProvider(provider.id);
  const allModels = dynamicModels && dynamicModels.length > 0 ? dynamicModels : staticModels;

  // Create providerInfo for ModelSelector - we only pass THIS provider
  const providersInfo = [{ id: provider.id, name: provider.name, type: 'cloud' as const }];
  // Filter models to only this provider's models (redundant if allModels is correct but safe)
  const selectorModels = allModels.filter((m: any) => m.provider === provider.id || !m.provider).map((m: any) => ({ ...m, provider: provider.id }));

  const isSaving = actionLoading === provider.id;
  const isDeleting = actionLoading === `${provider.id}-delete`;
  const isFetching = actionLoading === `${provider.id}-fetch`;
  const canFetch = ['openrouter', 'together', 'openai', 'gemini'].includes(provider.id);

  const handleSave = async () => {
    setActionLoading(provider.id);
    setError('');
    try {
      const validated = ApiKeySchema.parse({
        provider: provider.id,
        api_key: inputValue,
        is_active: true,
      });

      const token = await getToken();
      await saveApiKey(validated.provider, validated.api_key, selectedModelGen, token); // Pass gen model as default for now
      // We also need to save the specific gen/improve preferences if the API supports it in one go, 
      // but `saveApiKey` might only take one model. 
      // We should call `updateModels` after saving key if needed, or update `saveApiKey` to handle both.
      // For now, let's assume saveApiKey handles the key and then we update models.
      await updateModels(provider.id, selectedModelGen, selectedModelImprove, token);

      await loadKeys();
      showSuccess(`${provider.name} key saved successfully`);
      setIsEditing(false);
      setInputValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setActionLoading(`${provider.id}-delete`);
    setError('');
    try {
      const token = await getToken();
      await deleteApiKey(provider.id, token);
      await loadKeys();
      showSuccess(`${provider.name} key removed`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete key');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetActive = async (role: 'generation' | 'improvement') => {
    setActionLoading(`${provider.id}-${role}`);
    setError('');
    try {
      const token = await getToken();
      const isRoleActive = role === 'generation' ? (keyInfo?.is_active_gen ?? false) : (keyInfo?.is_active_improve ?? false);
      await setActiveProvider(provider.id, keyInfo?.model_name || '', token, !isRoleActive, role);
      showSuccess(`${provider.name} ${role} ${isRoleActive ? 'deactivated' : 'activated'}`);
      await loadKeys();
      await loadLocalEndpoints();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to update ${provider.name}`);
    } finally {
      setActionLoading(null);
    }
  }

  const handleFetchModels = async () => {
    setActionLoading(`${provider.id}-fetch`);
    setError('');
    try {
      // If editing, use input value. If configured, we can try without key (backend uses active)
      const token = await getToken();
      // If we are editing and have input, use it.
      const apiKeyToUse = (isEditing && inputValue) ? inputValue : undefined;

      const models = await listModels(token, provider.id, apiKeyToUse);
      setDynamicModels((prev: any) => ({
        ...prev,
        [provider.id]: models
      }));
      showSuccess('Models list updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch models');
    } finally {
      setActionLoading(null);
    }
  }

  // Effect to save model changes if already configured and just changing dropdowns
  const handleModelChange = async (genId: string, improveId: string) => {
    // Only auto-save if we are NOT in editing mode (i.e. key is already saved)
    if (!isEditing && keyInfo) {
      try {
        const token = await getToken();
        await updateModels(provider.id, genId, improveId, token);
        showSuccess('Model preferences updated');
        await loadKeys();
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (!keyInfo && !isEditing) {
    // Initial state: Not configured
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key size={24} className="text-slate-500" />
        </div>
        <h4 className="text-white font-medium mb-2">Not Configured</h4>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          Enter your API key to start using {provider.name} for prompt generation and improvement.
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-lg transition-colors"
        >
          Configure {provider.name}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Key Input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
        {isEditing ? (
          <div className="flex gap-2">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={provider.placeholder}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !inputValue}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Save Key'}
            </button>
            {keyInfo && (
              <button
                onClick={() => { setIsEditing(false); setInputValue(''); }}
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <div className="flex-1 font-mono text-sm text-slate-400">
              {showKey ? keyInfo?.key_hint : '••••••••••••••••••••••••'}
            </div>
            <button onClick={() => setShowKey(!showKey)} className="text-slate-500 hover:text-slate-300 p-1">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => { setIsEditing(true); setInputValue(''); }}
              className="text-teal-400 hover:text-teal-300 text-xs font-medium px-2"
            >
              Change
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 text-xs font-medium px-2 disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Remove'}
            </button>
          </div>
        )}
      </div>

      {/* Models Configuration */}
      {(keyInfo || isEditing) && (
        <div className="space-y-4 pt-4 border-t border-slate-800/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <Server size={14} className="text-teal-500" />
              Model Selection
            </h4>

            {canFetch && (
              <button
                onClick={handleFetchModels}
                disabled={isFetching}
                className="text-xs text-slate-500 hover:text-teal-400 flex items-center gap-1.5 transition-colors"
              >
                {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Refresh Models
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-slate-400 mb-2">Generation Model</label>
              <ModelSelector
                value={selectedModelGen}
                onChange={(id) => {
                  setSelectedModelGen(id);
                  handleModelChange(id, selectedModelImprove);
                }}
                models={selectorModels}
                providers={providersInfo}
                placeholder="Select generation model..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">Improvement Model</label>
              <ModelSelector
                value={selectedModelImprove}
                onChange={(id) => {
                  setSelectedModelImprove(id);
                  handleModelChange(selectedModelGen, id);
                }}
                models={selectorModels}
                providers={providersInfo}
                placeholder="Select improvement model..."
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Split Active Buttons */}
      {keyInfo && !isEditing && (
        <div className="pt-6 mt-4 border-t border-slate-800/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleSetActive('generation')}
              disabled={actionLoading === `${provider.id}-generation`}
              className={`py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${keyInfo?.is_active_gen
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
            >
              {actionLoading === `${provider.id}-generation` ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {keyInfo?.is_active_gen ? 'Active Generator AI' : 'Set as Generator AI'}
            </button>

            <button
              onClick={() => handleSetActive('improvement')}
              disabled={actionLoading === `${provider.id}-improvement`}
              className={`py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${keyInfo?.is_active_improve
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
            >
              {actionLoading === `${provider.id}-improvement` ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {keyInfo?.is_active_improve ? 'Active Improvement AI' : 'Set as Improvement AI'}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center italic">
            You can use one provider for generation and another for improvement.
          </p>
        </div>
      )}
    </div>
  );
}
