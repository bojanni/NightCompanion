import type { ApiKeyInfo as BaseApiKeyInfo, ModelOption as BaseModelOption } from '../types'

export type { BaseApiKeyInfo as ApiKeyInfo, BaseModelOption as ModelOption }

export interface ProviderDefinition {
  id: string
  name: string
  description: string
  docsUrl: string
  placeholder: string
}

export interface ProviderMetaStore {
  model_gen: string
  model_improve: string
  model_vision: string
  model_general: string
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
  is_active_general: boolean
}

export interface ProviderConfigCallbacks {
  setActionLoading: (id: string | null) => void
  loadKeys: () => Promise<void>
  loadLocalEndpoints: () => Promise<void>
}

export interface ProviderConfigState {
  inputValue: string
  setInputValue: (value: string) => void
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  showKey: boolean
  setShowKey: (value: boolean) => void
  selectedModelGen: string
  setSelectedModelGen: (value: string) => void
  selectedModelImprove: string
  setSelectedModelImprove: (value: string) => void
  selectedModelVision: string
  setSelectedModelVision: (value: string) => void
  selectedModelGeneral: string
  setSelectedModelGeneral: (value: string) => void
  modelSortMode: 'cheapest' | 'alphabetical'
  setModelSortMode: (value: 'cheapest' | 'alphabetical') => void
  providerMeta: ProviderMetaStore
  setProviderMeta: (value: ProviderMetaStore) => void
}

export interface ProviderAdapter {
  id: string
  saveConfig: (apiKey: string, model: string) => Promise<{ error?: string, data?: { model?: string } }>
  testConnection: (apiKey?: string, model?: string) => Promise<{ error?: string, data?: { modelCount?: number } }>
  fetchModels: (apiKey?: string, model?: string) => Promise<{ error?: string, data?: Array<{
    modelId: string
    displayName: string
    description?: string
    promptPrice?: string | null
    completionPrice?: string | null
    requestPrice?: string | null
    imagePrice?: string | null
  }> }>
  getProviderMeta: (providerId: string, defaultModel: string) => Promise<{ error?: string, data?: ProviderMetaStore }>
  saveProviderMeta: (providerId: string, meta: ProviderMetaStore) => Promise<{ error?: string, data?: ProviderMetaStore }>
  buildModelLabel: (input: { displayName: string, promptPrice: string | null, completionPrice: string | null }) => string
  buildPriceLabel: (input: { promptPrice: string | null, completionPrice: string | null }) => string
  sortModels?: (models: BaseModelOption[]) => BaseModelOption[]
}

export interface ApiKeyInputProps {
  provider: ProviderDefinition
  keyInfo: BaseApiKeyInfo | null | undefined
  inputValue: string
  setInputValue: (value: string) => void
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  showKey: boolean
  setShowKey: (value: boolean) => void
  isSaving: boolean
  isDeleting: boolean
  onSave: () => void
  onDelete: () => void
  onTest: () => void
  isTesting: boolean
}

export interface ModelSelectorSectionProps {
  selectedModelGen: string
  selectedModelImprove: string
  selectedModelVision: string
  selectedModelGeneral: string
  onModelChange: (genId: string, improveId: string, visionId: string, generalId: string) => void
  models: BaseModelOption[]
  providersInfo: Array<{ id: string, name: string, type: 'cloud' | 'local' }>
  modelSortMode: 'cheapest' | 'alphabetical'
  setModelSortMode: (value: 'cheapest' | 'alphabetical') => void
  onRefresh: () => void
  isRefreshing: boolean
  lastUpdatedAt?: string | null
}

export interface ActivationButtonsProps {
  provider: ProviderDefinition
  activeMeta: ProviderMetaStore
  actionLoading: string | null
  onSetActive: (role: 'generation' | 'improvement' | 'vision' | 'general') => void
}
