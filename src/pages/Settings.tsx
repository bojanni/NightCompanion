import { useState, useEffect, useCallback } from 'react';
import {
  Key, ExternalLink, Loader2, Check, Trash2, Shield, Zap,
  Eye, EyeOff, RefreshCw, CircleDot, Server, Globe, TestTube2,
} from 'lucide-react';
import { db, supabase } from '../lib/api';
import { listApiKeys, saveApiKey, deleteApiKey, setActiveProvider, updateModelSelection } from '../lib/api-keys-service';
import type { ApiKeyInfo } from '../lib/api-keys-service';
import { testConnection } from '../lib/ai-service';
import { ApiKeySchema } from '../lib/validation-schemas';
import { DataManagement } from '../components/DataManagement';
import { getModelsForProvider, getDefaultModelForProvider } from '../lib/provider-models';
import type { ModelOption } from '../lib/provider-models';
import { listModels } from '../lib/ai-service';

interface SettingsProps { }

interface LocalEndpoint {
  id: string;
  provider: 'ollama' | 'lmstudio';
  endpoint_url: string;
  model_name: string;
  is_active: boolean;
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
  },
];

export default function Settings({ }: SettingsProps) {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dynamic model lists state
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>({});

  const getToken = useCallback(async () => {
    // Return a dummy token or empty string since auth is disabled
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

      const probableCauses = [];

      if (errorMsg.includes('API key') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        probableCauses.push('Invalid or expired API key');
      }
      if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('429')) {
        probableCauses.push('API quota exceeded or rate limit reached');
      }
      if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
        probableCauses.push('Network connectivity issue');
      }
      if (errorMsg.includes('model') || errorMsg.includes('404')) {
        probableCauses.push('Model not found or unavailable');
      }
      if (activeLocalEndpoint) {
        probableCauses.push('Local LLM server not running or unreachable');
      }

      if (probableCauses.length === 0) {
        probableCauses.push('Invalid API key or credentials');
        probableCauses.push('API service temporarily unavailable');
        probableCauses.push('Network or firewall blocking requests');
      }

      const detailedMessage = `${errorMsg}\n\nProbable causes:\n${probableCauses.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

      setTestResult({
        success: false,
        message: detailedMessage
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
              Keys are never exposed to the browser after saving.
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
            {testing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Testing connection...
              </>
            ) : (
              <>
                <TestTube2 size={14} />
                Test Connection
              </>
            )}
          </button>

          {testResult && (
            <div className={`border rounded-xl px-4 py-3 text-sm ${testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5">
                  {testResult.success ? <Check size={14} /> : <Trash2 size={14} />}
                </div>
                <div className="whitespace-pre-line leading-relaxed">
                  {testResult.message}
                </div>
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
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Cloud Providers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROVIDERS.map((provider) => {
                const keyInfo = keys.find((k) => k.provider === provider.id);
                return (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    keyInfo={keyInfo}
                    actionLoading={actionLoading}
                    onSave={async (apiKey, modelName) => {
                      setActionLoading(provider.id);
                      setError('');
                      try {
                        const validated = ApiKeySchema.parse({
                          provider: provider.id,
                          api_key: apiKey,
                          is_active: true,
                        });

                        const token = await getToken();
                        await saveApiKey(validated.provider, validated.api_key, modelName, token);
                        await loadKeys();
                        showSuccess(`${provider.name} key saved successfully`);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to save key');
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    onDelete={async () => {
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
                    }}
                    onSetActive={async () => {
                      setActionLoading(`${provider.id}-active`);
                      setError('');
                      try {
                        const token = await getToken();
                        const modelName = keyInfo?.model_name || getDefaultModelForProvider(provider.id);

                        // Toggle logic: if already active, set to false. Otherwise true.
                        const isCurrentlyActive = keyInfo?.is_active ?? false;
                        await setActiveProvider(provider.id, modelName, token, !isCurrentlyActive);

                        await loadKeys();
                        await loadLocalEndpoints();
                        showSuccess(isCurrentlyActive ? `${provider.name} deactivated` : `${provider.name} set as active provider`);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to set active provider');
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    onModelChange={async (modelName) => {
                      try {
                        const token = await getToken();
                        await updateModelSelection(provider.id, modelName, token);
                        await loadKeys();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to update model');
                      }
                    }}
                    onFetchModels={async (apiKey) => {
                      // Only allow fetching for supported providers
                      if (!['openrouter', 'together', 'openai', 'gemini'].includes(provider.id)) return;

                      setActionLoading(`${provider.id}-fetch`);
                      try {
                        const token = await getToken();
                        const fetched = await listModels(token, provider.id, apiKey);

                        // Transform to ModelOption
                        const options: ModelOption[] = fetched.map(m => ({
                          id: m.id,
                          name: m.name || m.id,
                          // Removed description as it's not part of ModelOption
                        }));

                        setDynamicModels(prev => ({
                          ...prev,
                          [provider.id]: options
                        }));

                        showSuccess(`Fetched ${options.length} models for ${provider.name}`);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Failed to fetch models');
                      } finally {
                        setActionLoading(null);
                      }
                    }}
                    dynamicModels={dynamicModels[provider.id]}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server size={18} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Local LLMs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocalEndpointCard
                type="ollama"
                endpoint={localEndpoints.find((e) => e.provider === 'ollama')}
                actionLoading={actionLoading}
                onSave={async (endpointUrl, modelName) => {
                  setActionLoading('ollama');
                  setError('');
                  try {
                    await db.from('user_local_endpoints').delete().eq('provider', 'ollama');
                    const { error: insertError } = await supabase
                      .from('user_local_endpoints')
                      .insert({
                        provider: 'ollama',
                        endpoint_url: endpointUrl,
                        model_name: modelName,
                        is_active: false,
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
                    const { error: deleteError } = await supabase
                      .from('user_local_endpoints')
                      .delete()
                      .eq('provider', 'ollama');
                    if (deleteError) throw deleteError;
                    await loadLocalEndpoints();
                    showSuccess('Ollama configuration removed');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to delete Ollama config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onSetActive={async () => {
                  setActionLoading('ollama-active');
                  setError('');
                  try {
                    const isCurrentlyActive = localEndpoints.find(e => e.provider === 'ollama')?.is_active;

                    if (isCurrentlyActive) {
                      // Deactivate
                      await db.from('user_local_endpoints').update({ is_active: false }).eq('provider', 'ollama');
                      showSuccess('Ollama deactivated');
                    } else {
                      // Activate (and deactivate others first)
                      await db.from('user_api_keys').update({ is_active: false }).neq('provider', '');
                      await db.from('user_local_endpoints').update({ is_active: false }).neq('provider', 'ollama');
                      const { error: updateError } = await supabase
                        .from('user_local_endpoints')
                        .update({ is_active: true })
                        .eq('provider', 'ollama');
                      if (updateError) throw updateError;
                      showSuccess('Ollama set as active provider');
                    }

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
                onSave={async (endpointUrl, modelName) => {
                  setActionLoading('lmstudio');
                  setError('');
                  try {
                    await db.from('user_local_endpoints').delete().eq('provider', 'lmstudio');
                    const { error: insertError } = await supabase
                      .from('user_local_endpoints')
                      .insert({
                        provider: 'lmstudio',
                        endpoint_url: endpointUrl,
                        model_name: modelName,
                        is_active: false,
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
                  setError('');
                  try {
                    const { error: deleteError } = await supabase
                      .from('user_local_endpoints')
                      .delete()
                      .eq('provider', 'lmstudio');
                    if (deleteError) throw deleteError;
                    await loadLocalEndpoints();
                    showSuccess('LM Studio configuration removed');
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to delete LM Studio config');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                onSetActive={async () => {
                  setActionLoading('lmstudio-active');
                  setError('');
                  try {
                    const isCurrentlyActive = localEndpoints.find(e => e.provider === 'lmstudio')?.is_active;

                    if (isCurrentlyActive) {
                      await db.from('user_local_endpoints').update({ is_active: false }).eq('provider', 'lmstudio');
                      showSuccess('LM Studio deactivated');
                    } else {
                      await db.from('user_api_keys').update({ is_active: false }).neq('provider', '');
                      await db.from('user_local_endpoints').update({ is_active: false }).neq('provider', 'lmstudio');
                      const { error: updateError } = await supabase
                        .from('user_local_endpoints')
                        .update({ is_active: true })
                        .eq('provider', 'lmstudio');
                      if (updateError) throw updateError;
                      showSuccess('LM Studio set as active provider');
                    }
                    await loadKeys();
                    await loadLocalEndpoints();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to activate LM Studio');
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

interface ProviderCardProps {
  provider: typeof PROVIDERS[number];
  keyInfo: ApiKeyInfo | undefined;
  actionLoading: string | null;
  onSave: (apiKey: string, modelName: string) => void;
  onDelete: () => void;
  onSetActive: () => void;
  onModelChange: (modelName: string) => void;
  onFetchModels: (apiKey: string) => void;
  dynamicModels: ModelOption[] | undefined;
}

interface LocalEndpointCardProps {
  type: 'ollama' | 'lmstudio';
  endpoint: LocalEndpoint | undefined;
  actionLoading: string | null;
  onSave: (endpointUrl: string, modelName: string) => void;
  onDelete: () => void;
  onSetActive: () => void;
}

function ProviderCard({ provider, keyInfo, actionLoading, onSave, onDelete, onSetActive, onModelChange, onFetchModels, dynamicModels }: ProviderCardProps) {
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Merge static and dynamic models
  const staticModels = getModelsForProvider(provider.id);
  const allModels = dynamicModels && dynamicModels.length > 0 ? dynamicModels : staticModels;

  const defaultModel = keyInfo?.model_name || getDefaultModelForProvider(provider.id);
  const [selectedModel, setSelectedModel] = useState(defaultModel);

  useEffect(() => {
    const newModel = keyInfo?.model_name || getDefaultModelForProvider(provider.id);
    setSelectedModel(newModel);
  }, [keyInfo?.model_name, provider.id]);

  const isConfigured = !!keyInfo;
  const isActive = keyInfo?.is_active ?? false;
  const isSaving = actionLoading === provider.id;
  const isDeleting = actionLoading === `${provider.id}-delete`;
  const isSettingActive = actionLoading === `${provider.id}-active`;
  const isFetching = actionLoading === `${provider.id}-fetch`;

  const canFetch = ['openrouter', 'together', 'openai', 'gemini'].includes(provider.id);

  return (
    <div
      className={`bg-slate-900/60 border rounded-2xl p-5 transition-all ${isActive
        ? `${provider.borderColor} shadow-lg`
        : 'border-slate-800 hover:border-slate-700'
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 bg-gradient-to-br ${provider.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <Key size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{provider.name}</h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 mt-0.5">
                <CircleDot size={8} />
                Active
              </span>
            )}
          </div>
        </div>

        {isConfigured && (
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${provider.bgGlow} ${provider.textColor}`}>
            Configured
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-4">{provider.description}</p>

      {isConfigured && !showInput ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
            <Key size={12} className="text-slate-500" />
            <span className="text-xs text-slate-400 font-mono flex-1">
              {showKey ? keyInfo.key_hint : '\u2022'.repeat(12)}
            </span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>

          {allModels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-slate-400">Model</label>
                {isConfigured && canFetch && (
                  <button
                    onClick={() => {
                      // If we have an API key in the input (setup mode), use it.
                      // If not, we might not have the full key in frontend state (security).
                      // But usually on saving we reload keys. 
                      // `ApiKeyInfo` from `listApiKeys` only has `key_hint`. 
                      // So we cannot fetch models for an existing key unless we use the backend's ability to use the stored key.
                      // The backend `list-models` implementation helps: 
                      // `if (payload.provider && payload.apiKey) ... else { providerConfig = await getActiveProvider(); }`
                      // This means we can only fetch for the ACTIVE provider if we don't send a key.
                      // For now, let's only support fetching if we have the input value OR if it's the active provider?
                      // No, simpler: prompt for key if not in input? Or just error if not active?
                      // Let's rely on `inputValue` if present, otherwise try without key (backend uses active).
                      // If provider is NOT active, backend will fail.

                      if (inputValue) {
                        onFetchModels(inputValue);
                      } else if (isActive) {
                        onFetchModels(''); // Signal to use active key
                      } else {
                        // Provider is not active and no key entered
                        // Show warning notification
                        import('../lib/error-handler').then(({ showWarning }) => {
                          showWarning(`Please activate ${provider.name} first or enter an API key to fetch models.`);
                        });
                      }
                    }}
                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    disabled={isFetching}
                  >
                    {isFetching ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    {isFetching ? 'Fetching...' : 'Refresh List'}
                  </button>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  onModelChange(e.target.value);
                }}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
              >
                {allModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.description && `— ${model.description}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onSetActive}
              disabled={isSettingActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : `${provider.bgGlow} ${provider.textColor} hover:opacity-80`
                } disabled:opacity-50`}
            >
              {isSettingActive ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
              {isActive ? 'Active' : 'Activate'}
            </button>
            <button
              onClick={() => { setShowInput(true); setInputValue(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 text-slate-400 text-xs rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-all"
            >
              <RefreshCw size={11} />
              Update
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 text-red-400/70 text-xs rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50 ml-auto"
            >
              {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {allModels.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs text-slate-400">Model</label>
                {/* In 'setup' mode (showInput=true), we definitely have the input value as the key! */}
                {canFetch && inputValue.length > 10 && (
                  <button
                    onClick={() => onFetchModels(inputValue)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    disabled={isFetching}
                  >
                    {isFetching ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Fetch Models
                  </button>
                )}
              </div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
              >
                {allModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.description && `— ${model.description}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={provider.placeholder}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-slate-600 pr-20"
            />
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Get key
              <ExternalLink size={9} />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (inputValue.trim()) onSave(inputValue.trim(), selectedModel);
              }}
              disabled={isSaving || !inputValue.trim()}
              className={`flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r ${provider.gradient} text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg`}
            >
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Save Key
            </button>
            {isConfigured && (
              <button
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LocalEndpointCard({ type, endpoint, actionLoading, onSave, onDelete, onSetActive }: LocalEndpointCardProps) {
  const [endpointUrl, setEndpointUrl] = useState('');
  const [modelName, setModelName] = useState('');
  const [showInput, setShowInput] = useState(false);

  const isConfigured = !!endpoint;
  const isActive = endpoint?.is_active ?? false;
  const isSaving = actionLoading === type;
  const isDeleting = actionLoading === `${type}-delete`;
  const isSettingActive = actionLoading === `${type}-active`;

  const config = type === 'ollama'
    ? {
      name: 'Ollama',
      description: 'Run LLMs locally on your machine. Free and private.',
      docsUrl: 'https://ollama.ai',
      defaultEndpoint: 'http://localhost:11434',
      gradient: 'from-violet-500 to-purple-600',
      bgGlow: 'bg-violet-500/10',
      textColor: 'text-violet-400',
      borderColor: 'border-violet-500/20',
    }
    : {
      name: 'LM Studio',
      description: 'Desktop app for running local LLMs. Easy setup with GUI.',
      docsUrl: 'https://lmstudio.ai',
      defaultEndpoint: 'http://localhost:1234',
      gradient: 'from-sky-500 to-blue-600',
      bgGlow: 'bg-sky-500/10',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
    };

  return (
    <div
      className={`bg-slate-900/60 border rounded-2xl p-5 transition-all ${isActive
        ? `${config.borderColor} shadow-lg`
        : 'border-slate-800 hover:border-slate-700'
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <Server size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{config.name}</h3>
            {isActive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 mt-0.5">
                <CircleDot size={8} />
                Active
              </span>
            )}
          </div>
        </div>

        {isConfigured && (
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${config.bgGlow} ${config.textColor}`}>
            Configured
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-4">{config.description}</p>

      {isConfigured && !showInput ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
              <Server size={12} className="text-slate-500" />
              <span className="text-xs text-slate-400 font-mono flex-1 truncate">
                {endpoint.endpoint_url}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
              <Key size={12} className="text-slate-500" />
              <span className="text-xs text-slate-400 font-mono flex-1">
                {endpoint.model_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isActive && (
              <button
                onClick={onSetActive}
                disabled={isSettingActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${config.bgGlow} ${config.textColor} hover:opacity-80 disabled:opacity-50`}
              >
                {isSettingActive ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                Set Active
              </button>
            )}
            <button
              onClick={() => {
                setShowInput(true);
                setEndpointUrl(endpoint.endpoint_url);
                setModelName(endpoint.model_name);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 text-slate-400 text-xs rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-all"
            >
              <RefreshCw size={11} />
              Update
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 text-red-400/70 text-xs rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50 ml-auto"
            >
              {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Endpoint URL</label>
              <input
                type="text"
                value={endpointUrl || config.defaultEndpoint}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder={config.defaultEndpoint}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Model Name (optional)</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. llama3, mistral"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(endpointUrl || config.defaultEndpoint, modelName)}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r ${config.gradient} text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg`}
            >
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Save Config
            </button>
            {isConfigured && (
              <button
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
