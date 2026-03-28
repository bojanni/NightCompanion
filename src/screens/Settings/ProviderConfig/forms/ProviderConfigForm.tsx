import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, Key, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { syncTaskModel } from '../../../../hooks/useTaskModels'
import type { ApiKeyInfo, ModelOption } from '../../types'
import type { ProviderDefinition, ProviderMetaStore } from '../types'
import { ApiKeyInput } from '../components/ApiKeyInput'
import { ModelSelectorSection, ActivationButtons } from '../components/ModelAndActivation'
import { getProviderAdapter } from '../providerRegistry'

interface ProviderConfigFormProps {
  provider: ProviderDefinition
  keyInfo: ApiKeyInfo | null | undefined
  actionLoading: string | null
  setActionLoading: (id: string | null) => void
  loadKeys: () => Promise<void>
  loadLocalEndpoints: () => Promise<void>
  dynamicModels: ModelOption[]
  setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>
  isGlobalActive: boolean
}

function getDefaultProviderMeta(modelName: string): ProviderMetaStore {
  return {
    model_gen: modelName,
    model_improve: modelName,
    model_vision: modelName,
    model_general: modelName,
    is_active: false,
    is_active_gen: false,
    is_active_improve: false,
    is_active_vision: false,
    is_active_general: false,
  }
}

function normalizeModelOption(modelId: string, providerId: string): ModelOption {
  return {
    id: modelId,
    label: modelId,
    provider: providerId,
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
  const adapter = getProviderAdapter(provider.id)

  const [inputValue, setInputValue] = useState('')
  const [modelSortMode, setModelSortMode] = useState<'cheapest' | 'alphabetical'>('cheapest')
  const [selectedModelGen, setSelectedModelGen] = useState(keyInfo?.model_gen || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [selectedModelImprove, setSelectedModelImprove] = useState(keyInfo?.model_improve || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [selectedModelVision, setSelectedModelVision] = useState(keyInfo?.model_vision || keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [selectedModelGeneral, setSelectedModelGeneral] = useState(keyInfo?.model_name || 'openai/gpt-4o-mini')
  const [showKey, setShowKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [providerMeta, setProviderMeta] = useState<ProviderMetaStore>(getDefaultProviderMeta(keyInfo?.model_name || 'openai/gpt-4o-mini'))
  const [lastModelsUpdatedAt, setLastModelsUpdatedAt] = useState<string | null>(null)

  const lastModelsUpdatedLabel = lastModelsUpdatedAt
    ? new Date(lastModelsUpdatedAt).toLocaleString()
    : null

  useEffect(() => {
    if (!adapter) return

    let active = true

    const loadProviderMeta = async () => {
      const defaultModel = keyInfo?.model_name || 'openai/gpt-4o-mini'
      const metaResult = await adapter.getProviderMeta(provider.id, defaultModel)
      const nextMeta = metaResult.error || !metaResult.data
        ? getDefaultProviderMeta(defaultModel)
        : metaResult.data

      if (!active) return

      setProviderMeta(nextMeta)
      setSelectedModelGen(keyInfo?.model_gen || nextMeta.model_gen || defaultModel)
      setSelectedModelImprove(keyInfo?.model_improve || nextMeta.model_improve || defaultModel)
      setSelectedModelVision(keyInfo?.model_vision || nextMeta.model_vision || defaultModel)
      setSelectedModelGeneral(nextMeta.model_general || defaultModel)
    }

    void loadProviderMeta()

    return () => {
      active = false
    }
  }, [provider.id, keyInfo, adapter])

  const persistProviderMeta = useCallback(async (nextMeta: ProviderMetaStore) => {
    if (!adapter) throw new Error('Provider adapter not found')

    const result = await adapter.saveProviderMeta(provider.id, nextMeta)
    if (result.error || !result.data) {
      throw new Error(result.error || 'Failed to save provider preferences')
    }

    setProviderMeta(result.data)
    return result.data
  }, [adapter, provider.id])

  const mapRawModelsToOptions = useCallback((rawModels: Array<{
    modelId: string
    displayName: string
    description?: string
    promptPrice?: string | null
    completionPrice?: string | null
    requestPrice?: string | null
    imagePrice?: string | null
  }>): ModelOption[] => {
    if (!adapter) return []

    return rawModels.map((item) => ({
      id: item.modelId,
      label: adapter.buildModelLabel({
        displayName: item.displayName,
        promptPrice: item.promptPrice ?? null,
        completionPrice: item.completionPrice ?? null,
      }),
      name: item.displayName,
      displayName: item.displayName,
      description: item.description,
      priceLabel: adapter.buildPriceLabel({
        promptPrice: item.promptPrice ?? null,
        completionPrice: item.completionPrice ?? null,
      }),
      provider: provider.id,
      capabilities: item.modelId.toLowerCase().includes('vision') ? ['vision'] : undefined,
      promptPrice: item.promptPrice,
      completionPrice: item.completionPrice,
      requestPrice: item.requestPrice,
      imagePrice: item.imagePrice,
    }))
  }, [adapter, provider.id])

  const handleSave = useCallback(async () => {
    if (!adapter) {
      toast.error('Provider adapter not found')
      return
    }

    if (!inputValue.trim()) {
      toast.error('Please enter an API key')
      return
    }

    setActionLoading(provider.id)

    try {
      let modelSyncWarning: string | null = null

      const saveResult = await adapter.saveConfig(inputValue.trim(), selectedModelGen)

      if (saveResult.error || !saveResult.data)
        throw new Error(saveResult.error)

      const nextMeta = {
        ...providerMeta,
        model_gen: selectedModelGen,
        model_improve: selectedModelImprove,
        model_vision: selectedModelVision,
        model_general: selectedModelGeneral,
      }

      await persistProviderMeta(nextMeta)

      const modelsResult = await adapter.fetchModels(inputValue.trim(), selectedModelGen)
      if (!modelsResult.error && modelsResult.data) {
        let models = mapRawModelsToOptions(modelsResult.data)
        if (adapter.sortModels) {
          models = adapter.sortModels(models)
        }

        setDynamicModels((prev) => ({
          ...prev,
          [provider.id]: models,
        }))

        setLastModelsUpdatedAt(new Date().toISOString())
      } else {
        modelSyncWarning = modelsResult.error || 'Model sync failed after saving the API key.'
      }

      await loadKeys()

      if (modelSyncWarning) {
        toast.warning(`${provider.name} key saved, but model sync failed`, {
          description: modelSyncWarning,
        })
      } else {
        toast.success(`${provider.name} key saved successfully`)
      }

      setIsEditing(false)
      setInputValue('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save key')
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider, inputValue, selectedModelGen, selectedModelImprove, selectedModelVision, selectedModelGeneral, providerMeta, persistProviderMeta, mapRawModelsToOptions, setDynamicModels, loadKeys, setActionLoading, setLastModelsUpdatedAt])

  const handleDelete = useCallback(async () => {
    if (!adapter) {
      toast.error('Provider adapter not found')
      return
    }

    setActionLoading(`${provider.id}-delete`)

    try {
      const result = await adapter.saveConfig('', 'openai/gpt-4o-mini')
      if (result.error)
        throw new Error(result.error)

      await persistProviderMeta(getDefaultProviderMeta('openai/gpt-4o-mini'))
      await loadKeys()
      toast.success(`${provider.name} key removed`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete key')
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider.id, provider.name, persistProviderMeta, loadKeys, setActionLoading])

  const handleSetActive = useCallback(async (role: 'generation' | 'improvement' | 'vision' | 'general') => {
    setActionLoading(`${provider.id}-${role}`)

    try {
      const meta = providerMeta

      const isActive = role === 'generation'
        ? meta.is_active_gen
        : role === 'improvement'
          ? meta.is_active_improve
          : role === 'vision'
            ? meta.is_active_vision
            : meta.is_active_general

      const currentModel = role === 'generation'
        ? selectedModelGen
        : role === 'improvement'
          ? selectedModelImprove
          : role === 'vision'
            ? selectedModelVision
            : selectedModelGeneral

      const nextMeta = {
        ...meta,
        is_active: true,
        is_active_gen: role === 'generation' ? !isActive : false,
        is_active_improve: role === 'improvement' ? !isActive : false,
        is_active_vision: role === 'vision' ? !isActive : false,
        is_active_general: role === 'general' ? !isActive : false,
        model_gen: selectedModelGen,
        model_improve: selectedModelImprove,
        model_vision: selectedModelVision,
        model_general: selectedModelGeneral,
      }

      await persistProviderMeta(nextMeta)
      if (!isActive) syncTaskModel(role, provider.id, currentModel)

      await loadKeys()
      await loadLocalEndpoints()
      toast.success(`${provider.name} ${role} ${isActive ? 'deactivated' : 'activated'}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to update ${provider.name}`)
    } finally {
      setActionLoading(null)
    }
  }, [provider, providerMeta, selectedModelGen, selectedModelImprove, selectedModelVision, selectedModelGeneral, persistProviderMeta, loadKeys, loadLocalEndpoints, setActionLoading])

  const handleFetchModels = useCallback(async () => {
    if (!adapter) {
      toast.error('Provider adapter not found')
      return
    }

    setActionLoading(`${provider.id}-fetch`)

    try {
      const input = inputValue.trim() ? { apiKey: inputValue.trim(), model: selectedModelGen } : undefined
      const result = await adapter.fetchModels(input?.apiKey, input?.model)
      if (result.error || !result.data)
        throw new Error(result.error)

      let models = mapRawModelsToOptions(result.data)
      if (adapter.sortModels) {
        models = adapter.sortModels(models)
      }

      setDynamicModels((prev) => ({
        ...prev,
        [provider.id]: models,
      }))

      setLastModelsUpdatedAt(new Date().toISOString())

      toast.success('Models list updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch models')
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider, inputValue, selectedModelGen, mapRawModelsToOptions, setDynamicModels, setActionLoading, setLastModelsUpdatedAt])

  const handleModelChange = useCallback(async (genId: string, improveId: string, visionId: string, generalId: string) => {
    const meta = providerMeta

    await persistProviderMeta({
      ...meta,
      model_gen: genId,
      model_improve: improveId,
      model_vision: visionId,
      model_general: generalId,
    })

    if (meta.is_active_gen) syncTaskModel('generation', provider.id, genId)
    if (meta.is_active_improve) syncTaskModel('improvement', provider.id, improveId)
    if (meta.is_active_vision) syncTaskModel('vision', provider.id, visionId)
    if (meta.is_active_general) syncTaskModel('general', provider.id, generalId)

    if (!isEditing && keyInfo)
      toast.success('Model preferences updated')
  }, [providerMeta, persistProviderMeta, provider.id, isEditing, keyInfo])

  const handleTestConnection = useCallback(async () => {
    if (!adapter) {
      toast.error('Provider adapter not found')
      return
    }

    if ((!isEditing && !keyInfo) || (isEditing && !inputValue.trim())) {
      toast.error('Please enter an API key first')
      return
    }

    setActionLoading(`${provider.id}-test`)

    try {
      const result = await adapter.testConnection(
        isEditing && inputValue.trim() ? inputValue.trim() : undefined,
        selectedModelGen
      )
      if (result.error || !result.data)
        throw new Error(result.error)

      toast.success(`Connection successful (${result.data.modelCount} models available)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed. Please check your API key.')
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider.id, isEditing, keyInfo, inputValue, selectedModelGen, setActionLoading])

  const allModels = dynamicModels.length > 0 ? dynamicModels : [normalizeModelOption(selectedModelGen, provider.id)]
  const providersInfo = [{ id: provider.id, name: provider.name, type: 'cloud' as const }]

  const isSaving = actionLoading === provider.id
  const isDeleting = actionLoading === `${provider.id}-delete`
  const isFetching = actionLoading === `${provider.id}-fetch`
  const isTesting = actionLoading === `${provider.id}-test`

  // Show unsupported message if no adapter
  if (!adapter) {
    return (
      <div className="animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key size={24} className="text-slate-500" />
          </div>
          <h4 className="text-white font-medium mb-2">Provider Not Supported</h4>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            {provider.name} configuration is not yet supported.
          </p>
        </div>
      </div>
    )
  }

  // Empty state - not configured
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
        <ApiKeyInput
          provider={provider}
          keyInfo={keyInfo}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          showKey={showKey}
          setShowKey={setShowKey}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onSave={handleSave}
          onDelete={handleDelete}
          onTest={handleTestConnection}
          isTesting={isTesting}
        />
      </div>

      <ModelSelectorSection
        selectedModelGen={selectedModelGen}
        selectedModelImprove={selectedModelImprove}
        selectedModelVision={selectedModelVision}
        selectedModelGeneral={selectedModelGeneral}
        onModelChange={handleModelChange}
        models={allModels}
        providersInfo={providersInfo}
        modelSortMode={modelSortMode}
        setModelSortMode={setModelSortMode}
        onRefresh={handleFetchModels}
        isRefreshing={isFetching}
        lastUpdatedAt={lastModelsUpdatedLabel}
      />

      {keyInfo && !isEditing && (
        <ActivationButtons
          provider={provider}
          activeMeta={providerMeta}
          actionLoading={actionLoading}
          onSetActive={handleSetActive}
        />
      )}
    </div>
  )
}
