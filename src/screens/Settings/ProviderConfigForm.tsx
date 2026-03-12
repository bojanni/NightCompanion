import { useEffect, useState } from 'react'
import { ExternalLink, Eye, EyeOff, Key, Loader2, RefreshCw, Server, Zap } from 'lucide-react'
import { toast } from 'sonner'

import ModelSelector from '../../components/ModelSelector'
import { syncTaskModel } from '../../hooks/useTaskModels'
import type { ApiKeyInfo, ModelOption } from './types'

interface ProviderConfigFormProps {
  provider: {
    id: string
    name: string
    description: string
    docsUrl: string
    placeholder: string
  }
  keyInfo: ApiKeyInfo | null | undefined
  actionLoading: string | null
  setActionLoading: (id: string | null) => void
  loadKeys: () => Promise<void>
  loadLocalEndpoints: () => Promise<void>
  dynamicModels: ModelOption[]
  setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>
  isGlobalActive: boolean
}

interface ProviderMetaStore {
  model_gen: string
  model_improve: string
  model_vision: string
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
}

function getDefaultProviderMeta(modelName: string): ProviderMetaStore {
  return {
    model_gen: modelName,
    model_improve: modelName,
    model_vision: modelName,
    is_active: false,
    is_active_gen: false,
    is_active_improve: false,
    is_active_vision: false,
  }
}

function readProviderMeta(providerId: string, fallbackModel: string): ProviderMetaStore {
  try {
    const raw = localStorage.getItem('providerMeta')
    const parsed = raw ? (JSON.parse(raw) as Record<string, ProviderMetaStore>) : {}
    return parsed[providerId] || getDefaultProviderMeta(fallbackModel)
  } catch {
    return getDefaultProviderMeta(fallbackModel)
  }
}

function writeProviderMeta(providerId: string, value: ProviderMetaStore) {
  const raw = localStorage.getItem('providerMeta')
  const parsed = raw ? (JSON.parse(raw) as Record<string, ProviderMetaStore>) : {}
  parsed[providerId] = value
  localStorage.setItem('providerMeta', JSON.stringify(parsed))
}

function normalizeModelOption(modelId: string): ModelOption {
  return {
    id: modelId,
    label: modelId,
    provider: 'openrouter',
    capabilities: modelId.toLowerCase().includes('vision') ? ['vision'] : undefined,
  }
}

export function ProviderConfigForm({
  provider,
  keyInfo,
  actionLoading,
  setActionLoading,
  loadKeys,
  loadLocalEndpoints,
  dynamicModels,
  setDynamicModels,
  isGlobalActive,
}: ProviderConfigFormProps) {
  const [inputValue, setInputValue] = useState('')
  const [selectedModelGen, setSelectedModelGen] = useState(keyInfo?.model_gen || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [selectedModelImprove, setSelectedModelImprove] = useState(keyInfo?.model_improve || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [selectedModelVision, setSelectedModelVision] = useState(keyInfo?.model_vision || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [showKey, setShowKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const defaultModel = keyInfo?.model_name || 'openai/gpt-4o-mini'
    const meta = readProviderMeta(provider.id, defaultModel)

    setSelectedModelGen(keyInfo?.model_gen || meta.model_gen || defaultModel)
    setSelectedModelImprove(keyInfo?.model_improve || meta.model_improve || defaultModel)
    setSelectedModelVision(keyInfo?.model_vision || meta.model_vision || defaultModel)
  }, [provider.id, keyInfo])

  const allModels = dynamicModels.length > 0 ? dynamicModels : [normalizeModelOption(selectedModelGen)]
  const providersInfo = [{ id: provider.id, name: provider.name, type: 'cloud' as const }]

  const isSaving = actionLoading === provider.id
  const isDeleting = actionLoading === `${provider.id}-delete`
  const isFetching = actionLoading === `${provider.id}-fetch`

  const handleSave = async () => {
    if (!inputValue.trim()) {
      toast.error('Please enter an API key')
      return
    }

    setActionLoading(provider.id)

    try {
      const saveResult = await window.electronAPI.settings.saveOpenRouter({
        apiKey: inputValue.trim(),
        model: selectedModelGen,
      })

      if (saveResult.error || !saveResult.data)
        throw new Error(saveResult.error)

      const defaultModel = saveResult.data.model || selectedModelGen
      const nextMeta = {
        ...readProviderMeta(provider.id, defaultModel),
        model_gen: selectedModelGen,
        model_improve: selectedModelImprove,
        model_vision: selectedModelVision,
      }

      writeProviderMeta(provider.id, nextMeta)
      const modelsResult = await window.electronAPI.settings.listOpenRouterModels()
      if (!modelsResult.error && modelsResult.data) {
        const models = modelsResult.data.map((item) => ({
          id: item.modelId,
          label: item.displayName,
          provider: provider.id,
          capabilities: item.modelId.toLowerCase().includes('vision') ? ['vision'] : undefined,
        }))

        setDynamicModels((prev) => ({
          ...prev,
          [provider.id]: models,
        }))
      }

      await loadKeys()
      toast.success(`${provider.name} key saved successfully`)
      setIsEditing(false)
      setInputValue('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save key')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    setActionLoading(`${provider.id}-delete`)

    try {
      const result = await window.electronAPI.settings.saveOpenRouter({ apiKey: '', model: 'openai/gpt-4o-mini' })
      if (result.error)
        throw new Error(result.error)

      writeProviderMeta(provider.id, getDefaultProviderMeta('openai/gpt-4o-mini'))
      await loadKeys()
      toast.success(`${provider.name} key removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete key')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSetActive = async (role: 'generation' | 'improvement' | 'vision') => {
    setActionLoading(`${provider.id}-${role}`)

    try {
      const defaultModel = keyInfo?.model_name || selectedModelGen
      const meta = readProviderMeta(provider.id, defaultModel)

      const isActive = role === 'generation'
        ? meta.is_active_gen
        : role === 'improvement'
          ? meta.is_active_improve
          : meta.is_active_vision

      const currentModel = role === 'generation'
        ? selectedModelGen
        : role === 'improvement'
          ? selectedModelImprove
          : selectedModelVision

      const nextMeta = {
        ...meta,
        is_active: true,
        is_active_gen: role === 'generation' ? !isActive : false,
        is_active_improve: role === 'improvement' ? !isActive : false,
        is_active_vision: role === 'vision' ? !isActive : false,
        model_gen: selectedModelGen,
        model_improve: selectedModelImprove,
        model_vision: selectedModelVision,
      }

      writeProviderMeta(provider.id, nextMeta)
      if (!isActive) syncTaskModel(role, provider.id, currentModel)

      await loadKeys()
      await loadLocalEndpoints()
      toast.success(`${provider.name} ${role} ${isActive ? 'deactivated' : 'activated'}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to update ${provider.name}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleFetchModels = async () => {
    setActionLoading(`${provider.id}-fetch`)

    try {
      const input = inputValue.trim() ? { apiKey: inputValue.trim(), model: selectedModelGen } : undefined
      const result = await window.electronAPI.settings.refreshOpenRouterModels(input)
      if (result.error || !result.data)
        throw new Error(result.error)

      const models = result.data.map((item) => ({
        id: item.modelId,
        label: item.displayName,
        provider: provider.id,
        capabilities: item.modelId.toLowerCase().includes('vision') ? ['vision'] : undefined,
      }))

      setDynamicModels((prev) => ({
        ...prev,
        [provider.id]: models,
      }))

      toast.success('Models list updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch models')
    } finally {
      setActionLoading(null)
    }
  }

  const handleModelChange = async (genId: string, improveId: string, visionId: string) => {
    const defaultModel = keyInfo?.model_name || genId
    const meta = readProviderMeta(provider.id, defaultModel)

    writeProviderMeta(provider.id, {
      ...meta,
      model_gen: genId,
      model_improve: improveId,
      model_vision: visionId,
    })

    if (meta.is_active_gen) syncTaskModel('generation', provider.id, genId)
    if (meta.is_active_improve) syncTaskModel('improvement', provider.id, improveId)
    if (meta.is_active_vision) syncTaskModel('vision', provider.id, visionId)

    if (!isEditing && keyInfo)
      toast.success('Model preferences updated')
  }

  const handleTestConnection = async () => {
    if ((!isEditing && !keyInfo) || (isEditing && !inputValue.trim())) {
      toast.error('Please enter an API key first')
      return
    }

    setActionLoading(`${provider.id}-test`)

    try {
      const input = isEditing && inputValue.trim() ? { apiKey: inputValue.trim(), model: selectedModelGen } : undefined
      const result = await window.electronAPI.settings.testOpenRouter(input)
      if (result.error || !result.data)
        throw new Error(result.error)

      toast.success(`Connection successful (${result.data.modelCount} models available)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed. Please check your API key.')
    } finally {
      setActionLoading(null)
    }
  }

  if (!keyInfo && !isEditing) {
    return (
      <div className="animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              {provider.name} Configuration
              {isGlobalActive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Zap size={10} /> Active
                </span>
              )}
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
      </div>
    )
  }

  const activeMeta = readProviderMeta(provider.id, keyInfo?.model_name || selectedModelGen)

  return (
    <div className="space-y-6 w-full animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            {provider.name} Configuration
            {isGlobalActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Zap size={10} /> Active
              </span>
            )}
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

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
        {isEditing ? (
          <div className="flex gap-2">
            <input
              type="password"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={provider.placeholder}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
            <button
              onClick={handleTestConnection}
              disabled={actionLoading === `${provider.id}-test`}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 border border-slate-700 hover:border-slate-600"
              title="Test Connection"
            >
              {actionLoading === `${provider.id}-test` ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !inputValue.trim()}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Save Key'}
            </button>
            {keyInfo && (
              <button
                onClick={() => {
                  setIsEditing(false)
                  setInputValue('')
                }}
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <div className="flex-1 font-mono text-sm text-slate-400">
              {showKey ? keyInfo?.key_hint || keyInfo?.apiKeyMasked : '••••••••••••••••••••••••'}
            </div>
            <button onClick={() => setShowKey(!showKey)} className="text-slate-500 hover:text-slate-300 p-1">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              onClick={handleTestConnection}
              disabled={actionLoading === `${provider.id}-test`}
              className="text-slate-400 hover:text-white text-xs font-medium px-2"
              title="Test Connection"
            >
              {actionLoading === `${provider.id}-test` ? <Loader2 size={12} className="animate-spin" /> : 'Test'}
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => {
                setIsEditing(true)
                setInputValue('')
              }}
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

      <div className="space-y-4 pt-4 border-t border-slate-800/50">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <Server size={14} className="text-teal-500" />
            Model Selection
          </h4>

          <button
            onClick={handleFetchModels}
            disabled={isFetching}
            className="text-xs text-slate-500 hover:text-teal-400 flex items-center gap-1.5 transition-colors"
            aria-label="Refresh Models"
          >
            {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh Models
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Generation Model</label>
            <ModelSelector
              value={selectedModelGen}
              onChange={(id) => {
                setSelectedModelGen(id)
                void handleModelChange(id, selectedModelImprove, selectedModelVision)
              }}
              models={allModels}
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
                setSelectedModelImprove(id)
                void handleModelChange(selectedModelGen, id, selectedModelVision)
              }}
              models={allModels}
              providers={providersInfo}
              placeholder="Select improvement model..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Vision Model</label>
            <ModelSelector
              value={selectedModelVision}
              onChange={(id) => {
                setSelectedModelVision(id)
                void handleModelChange(selectedModelGen, selectedModelImprove, id)
              }}
              models={allModels.filter((m) =>
                m.capabilities?.includes('vision') ||
                m.id.toLowerCase().includes('vision') ||
                m.id.toLowerCase().includes('gpt-4') ||
                m.id.toLowerCase().includes('gemini') ||
                m.id.toLowerCase().includes('claude-3')
              )}
              providers={providersInfo}
              placeholder="Select vision model..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {keyInfo && !isEditing && (
        <div className="pt-6 mt-4 border-t border-slate-800/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={() => void handleSetActive('generation')}
              disabled={actionLoading === `${provider.id}-generation`}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_gen ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Zap size={16} className={actionLoading === `${provider.id}-generation` ? 'animate-spin' : ''} />
              {activeMeta.is_active_gen ? 'Active Gen' : 'Set Gen'}
            </button>

            <button
              onClick={() => void handleSetActive('improvement')}
              disabled={actionLoading === `${provider.id}-improvement`}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_improve ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Zap size={16} className={actionLoading === `${provider.id}-improvement` ? 'animate-spin' : ''} />
              {activeMeta.is_active_improve ? 'Active Improve' : 'Set Improve'}
            </button>

            <button
              onClick={() => void handleSetActive('vision')}
              disabled={actionLoading === `${provider.id}-vision`}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_vision ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Eye size={16} className={actionLoading === `${provider.id}-vision` ? 'animate-spin' : ''} />
              {activeMeta.is_active_vision ? 'Active Vision' : 'Set Vision'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
