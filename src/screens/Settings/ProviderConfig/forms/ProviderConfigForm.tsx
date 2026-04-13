import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, Key, Zap } from 'lucide-react'
import { notifications } from '@mantine/notifications'

import type { ApiKeyInfo, ModelOption } from '../../types'
import type { ProviderDefinition, ProviderMetaStore } from '../types'
import { ApiKeyInput } from '../components/ApiKeyInput'
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
  dynamicModels,
  setDynamicModels,
  isGlobalActive,
}: ProviderConfigFormProps) {
  const adapter = getProviderAdapter(provider.id)

  const [inputValue, setInputValue] = useState('')
  const selectedModelGen = keyInfo?.model_name || 'openai/gpt-4o-mini'
  const [showKey, setShowKey] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

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

      void nextMeta
    }

    void loadProviderMeta()

    return () => {
      active = false
    }
  }, [provider.id, keyInfo, adapter])

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
      notifications.show({ message: 'Provider adapter not found', color: 'red' })
      return
    }

    if (!inputValue.trim()) {
      notifications.show({ message: 'Please enter an API key', color: 'red' })
      return
    }

    setActionLoading(provider.id)

    try {
      let modelSyncWarning: string | null = null

      const saveResult = await adapter.saveConfig(inputValue.trim(), selectedModelGen)

      if (saveResult.error || !saveResult.data)
        throw new Error(saveResult.error)

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

        void 0
      } else {
        modelSyncWarning = modelsResult.error || 'Model sync failed after saving the API key.'
      }

      await loadKeys()

      if (modelSyncWarning) {
        notifications.show({
          title: `${provider.name} key saved, but model sync failed`,
          message: modelSyncWarning,
          color: 'yellow',
        })
      } else {
        notifications.show({ message: `${provider.name} key saved successfully`, color: 'green' })
      }

      setIsEditing(false)
      setInputValue('')
    } catch (error) {
      notifications.show({ message: error instanceof Error ? error.message : 'Failed to save key', color: 'red' })
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider, inputValue, selectedModelGen, mapRawModelsToOptions, setDynamicModels, loadKeys, setActionLoading])

  const handleDelete = useCallback(async () => {
    if (!adapter) {
      notifications.show({ message: 'Provider adapter not found', color: 'red' })
      return
    }

    setActionLoading(`${provider.id}-delete`)

    try {
      const result = await adapter.saveConfig('', 'openai/gpt-4o-mini')
      if (result.error)
        throw new Error(result.error)
      await loadKeys()
      notifications.show({ message: `${provider.name} key removed`, color: 'green' })
    } catch (error) {
      notifications.show({ message: error instanceof Error ? error.message : 'Failed to delete key', color: 'red' })
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider.id, provider.name, loadKeys, setActionLoading])

  const handleTestConnection = useCallback(async () => {
    if (!adapter) {
      notifications.show({ message: 'Provider adapter not found', color: 'red' })
      return
    }

    if ((!isEditing && !keyInfo) || (isEditing && !inputValue.trim())) {
      notifications.show({ message: 'Please enter an API key first', color: 'red' })
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

      notifications.show({
        message: `Connection successful (${result.data.modelCount} models available)`,
        color: 'green',
      })
    } catch (error) {
      notifications.show({
        message: error instanceof Error ? error.message : 'Connection failed. Please check your API key.',
        color: 'red',
      })
    } finally {
      setActionLoading(null)
    }
  }, [adapter, provider.id, isEditing, keyInfo, inputValue, selectedModelGen, setActionLoading])

  const allModels = dynamicModels.length > 0 ? dynamicModels : [normalizeModelOption(selectedModelGen, provider.id)]
  void allModels

  const isSaving = actionLoading === provider.id
  const isDeleting = actionLoading === `${provider.id}-delete`
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
    </div>
  )
}
