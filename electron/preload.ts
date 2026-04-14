import { contextBridge, ipcRenderer } from 'electron'
import type { Prompt, PromptVersion, NewPrompt, StyleProfile, NewStyleProfile, Greylist, GalleryItem, Collection } from '../src/lib/schema'

type PromptImageMutationInput = {
  id?: string
  url?: string
  dataUrl?: string | null
  fileName?: string | null
  note?: string
  model?: string
  seed?: string
  createdAt?: string
}

type PromptMutationInput = Omit<NewPrompt, 'createdAt' | 'updatedAt'> & {
  imageDataUrl?: string | null
  imageFileName?: string | null
  removeImage?: boolean
  images?: PromptImageMutationInput[] | null
  originalPrompt?: string
  stylePreset?: string
}

type GreylistEntry = { word: string; weight: 1 | 2 | 3 | 4 | 5 }

export type PromptFilters = {
  search?: string
  tags?: string[]
  model?: string
}

export type OpenRouterSettings = {
  apiKey: string
  model: string
  siteUrl: string
  appName: string
}

export type ProviderMetaStore = {
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

export type AiConfigStateStore = {
  dashboardRoleRouting?: unknown
  cachedModels?: unknown
  advisorModelRoute?: unknown
  aiApiRequestLoggingEnabled?: boolean
  nativeWindowFrameEnabled?: boolean
  nightCompanionFolderPath?: string
  usageCurrency?: 'usd' | 'eur'
  eurRate?: number
  storeAiPromptResponseForUsage?: boolean
}

export type LocalEndpointStore = {
  id?: string
  provider?: string
  name?: string
  baseUrl?: string
  model_name?: string
  model_gen?: string
  model_improve?: string
  model_vision?: string
  model_general?: string
  is_active?: boolean
  is_active_gen?: boolean
  is_active_improve?: boolean
  is_active_vision?: boolean
  is_active_general?: boolean
  updated_at?: string
}

type GeneratedTagsResult = {
  tags: string[]
}

export type OpenRouterModel = {
  modelId: string
  displayName: string
  description: string
  contextLength: number | null
  capabilities: Array<'vision' | 'reasoning' | 'web_search' | 'code' | 'audio' | 'video' | 'text'>
  promptPrice: string | null
  completionPrice: string | null
  requestPrice: string | null
  imagePrice: string | null
}

export type NightcafeModelOption = {
  modelName: string
  modelType: string
  mediaType: string
  hfModelId?: string | null
  hfCardSummary?: string
  hfDownloads?: number | null
  hfLikes?: number | null
  hfLastModified?: string | Date | null
  hfSyncStatus?: string
}

export type NightcafeHuggingFaceSyncStats = {
  total: number
  processed: number
  skippedFresh: number
  matched: number
  unmatched: number
  failed: number
}

export type NightcafeHuggingFaceSyncInfo = {
  lastSyncedAt: string | Date | null
  total: number
  counts: {
    matched: number
    unmatched: number
    error: number
    pending: number
  }
}

export type NightcafeModelSupport = {
  modelName: string
  supportsNegativePrompt: boolean
}

export type ModelAdvisorRecommendation = {
  modelName: string
  explanation: string
}

export type ModelAdvisorResult = {
  mode: 'rule' | 'ai'
  recommendation: ModelAdvisorRecommendation
  alternatives: ModelAdvisorRecommendation[]
  matchedSignals: string[]
  cheapPick?: string
  balancedPick?: string
  premiumPick?: string
}

export type NightcafePresetOption = {
  presetName: string
  category: string
  presetPrompt: string
}

export type GeneratorUiStateStore = {
  tab?: 'generator' | 'builder'
  selectedPreset?: string
  maxWords?: number
  generatedPrompt?: string
  negativePrompt?: string
  negativePromptViewTab?: 'final' | 'diff'
  negativeImprovementDiff?: { originalPrompt: string; improvedPrompt: string } | null
  savedTitle?: string
  promptViewTab?: 'final' | 'diff'
  improvementDiff?: { originalPrompt: string; improvedPrompt: string } | null
  quickStartIdea?: string
  quickStartCreativity?: 'focused' | 'balanced' | 'wild'
  magicRandomCreativity?: 'focused' | 'balanced' | 'wild'
  quickStartCharacterId?: string | null
  recommendedModel?: string
  recommendedModelReason?: string
  recommendedModelMode?: 'rule' | 'ai' | null
  advisorBestValue?: string
  advisorFastest?: string
  supportsNegativePrompt?: boolean | null
  budgetMode?: 'cheap' | 'balanced' | 'premium'
}

export type PromptBuilderUiStateStore = {
  parts?: Array<{ id: string; value: string }>
  separator?: ', ' | '. ' | ' | '
  savedTitle?: string
  selectedStyleProfileId?: number | ''
  generatedPrompt?: string
  generatedPromptViewTab?: 'final' | 'diff'
  generatedImprovementDiff?: { originalPrompt: string; improvedPrompt: string } | null
}

export type GalleryFilters = {
  search?: string
  collectionId?: string | null
  minRating?: number
  page?: number
}

export type CharacterImage = {
  id: string
  url: string
  isMain: boolean
  createdAt: string
}

export type CharacterDetail = {
  id: string
  detail: string
  category: string
  worksWell: boolean
}

export type CharacterRecord = {
  id: string
  name: string
  description: string
  images: CharacterImage[]
  details: CharacterDetail[]
  createdAt: string
  updatedAt: string
}

export type UsageTotals = {
  calls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
}

export type UsageEventSummary = UsageTotals & {
  providerId: string
  modelId: string
  endpoint: string
  createdAt: string
}

export type UsageSummary = {
  session: UsageTotals
  today: UsageTotals
  lastAction: UsageEventSummary | null
}

export type UsageDailyTotals = UsageTotals & {
  day: string
}

export type UsageCategory = 'generation' | 'improvement' | 'vision' | 'research_reasoning'

export type UsageBreakdownModelRow = UsageTotals & {
  providerId: string
  modelId: string
  displayName: string
}

export type UsageBreakdown = {
  categories: Record<UsageCategory, UsageTotals>
  topModels: UsageBreakdownModelRow[]
}

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

export type IpcUnexpectedErrorPayload = {
  channel: string
  message: string
  occurredAt: string
}

type IpcUnexpectedErrorListener = (payload: IpcUnexpectedErrorPayload) => void

const ipcUnexpectedErrorListeners = new Set<IpcUnexpectedErrorListener>()

const toIpcErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message?.trim()
    if (message) return message
  }

  return String(error)
}

const notifyUnexpectedIpcError = (payload: IpcUnexpectedErrorPayload) => {
  console.error(
    `[preload] Unexpected IPC invoke failure on "${payload.channel}": ${payload.message}`,
  )

  for (const listener of ipcUnexpectedErrorListeners) {
    try {
      listener(payload)
    } catch (error) {
      console.error('[preload] Unexpected IPC error listener failure', error)
    }
  }
}

const invokeWithFallback = async <T>(channel: string, ...args: unknown[]): Promise<T> => {
  try {
    return await ipcRenderer.invoke(channel, ...args) as T
  } catch (error) {
    notifyUnexpectedIpcError({
      channel,
      message: toIpcErrorMessage(error),
      occurredAt: new Date().toISOString(),
    })

    throw error
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  prompts: {
    list: (filters?: PromptFilters): Promise<IpcResult<Prompt[]>> =>
      invokeWithFallback('prompts:list', filters),
    get: (id: number): Promise<IpcResult<Prompt | undefined>> =>
      invokeWithFallback('prompts:get', id),
    create: (data: PromptMutationInput): Promise<IpcResult<Prompt>> =>
      invokeWithFallback('prompts:create', data),
    listVersions: (promptId: number): Promise<IpcResult<PromptVersion[]>> =>
      invokeWithFallback('prompts:listVersions', promptId),
    updateRating: (id: number, rating: number | null): Promise<IpcResult<Prompt>> =>
      invokeWithFallback('prompts:updateRating', id, rating),
    update: (id: number, data: Partial<PromptMutationInput>): Promise<IpcResult<Prompt>> =>
      invokeWithFallback('prompts:update', id, data),
    delete: (id: number): Promise<IpcResult<void>> =>
      invokeWithFallback('prompts:delete', id),
  },
  styleProfiles: {
    list: (): Promise<IpcResult<StyleProfile[]>> =>
      invokeWithFallback('styleProfiles:list'),
    get: (id: number): Promise<IpcResult<StyleProfile | undefined>> =>
      invokeWithFallback('styleProfiles:get', id),
    create: (data: NewStyleProfile): Promise<IpcResult<StyleProfile>> =>
      invokeWithFallback('styleProfiles:create', data),
    update: (id: number, data: Partial<NewStyleProfile>): Promise<IpcResult<StyleProfile>> =>
      invokeWithFallback('styleProfiles:update', id, data),
    delete: (id: number): Promise<IpcResult<void>> =>
      invokeWithFallback('styleProfiles:delete', id),
  },
  settings: {
    getOpenRouter: (): Promise<IpcResult<OpenRouterSettings>> =>
      invokeWithFallback('settings:getOpenRouter'),
    getProviderMeta: (providerId: string, fallbackModel: string): Promise<IpcResult<ProviderMetaStore>> =>
      invokeWithFallback('settings:getProviderMeta', providerId, fallbackModel),
    saveProviderMeta: (providerId: string, input: Partial<ProviderMetaStore>): Promise<IpcResult<ProviderMetaStore>> =>
      invokeWithFallback('settings:saveProviderMeta', providerId, input),
    getAiConfigState: (): Promise<IpcResult<AiConfigStateStore>> =>
      invokeWithFallback('settings:getAiConfigState'),
    saveAiConfigState: (input: AiConfigStateStore): Promise<IpcResult<AiConfigStateStore>> =>
      invokeWithFallback('settings:saveAiConfigState', input),
    getNightCompanionFolderPath: (): Promise<IpcResult<string>> =>
      invokeWithFallback('settings:getNightCompanionFolderPath'),
    saveNightCompanionFolderPath: (input: string): Promise<IpcResult<string>> =>
      invokeWithFallback('settings:saveNightCompanionFolderPath', input),
    resetNightCompanionFolderPath: (): Promise<IpcResult<string>> =>
      invokeWithFallback('settings:resetNightCompanionFolderPath'),
    selectNightCompanionFolderPath: (): Promise<IpcResult<string | null>> =>
      invokeWithFallback('settings:selectNightCompanionFolderPath'),
    getLocalEndpoints: (): Promise<IpcResult<LocalEndpointStore[]>> =>
      invokeWithFallback('settings:getLocalEndpoints'),
    saveLocalEndpoints: (input: LocalEndpointStore[]): Promise<IpcResult<LocalEndpointStore[]>> =>
      invokeWithFallback('settings:saveLocalEndpoints', input),
    saveOpenRouter: (input: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterSettings>> =>
      invokeWithFallback('settings:saveOpenRouter', input),
    listOpenRouterModels: (): Promise<IpcResult<OpenRouterModel[]>> =>
      invokeWithFallback('settings:listOpenRouterModels'),
    refreshOpenRouterModels: (input?: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterModel[]>> =>
      invokeWithFallback('settings:refreshOpenRouterModels', input),
    testOpenRouter: (input?: Partial<OpenRouterSettings>): Promise<IpcResult<{ ok: boolean; modelCount: number }>> =>
      invokeWithFallback('settings:testOpenRouter', input),

    getGeneratorUiState: (): Promise<IpcResult<GeneratorUiStateStore>> =>
      invokeWithFallback('settings:getGeneratorUiState'),
    saveGeneratorUiState: (state: GeneratorUiStateStore): Promise<IpcResult<GeneratorUiStateStore>> =>
      invokeWithFallback('settings:saveGeneratorUiState', state),
    getPromptBuilderUiState: (): Promise<IpcResult<PromptBuilderUiStateStore>> =>
      invokeWithFallback('settings:getPromptBuilderUiState'),
    savePromptBuilderUiState: (state: PromptBuilderUiStateStore): Promise<IpcResult<PromptBuilderUiStateStore>> =>
      invokeWithFallback('settings:savePromptBuilderUiState', state),
  },
  generator: {
    magicRandom: (input?: { presetName?: string; presetPrompt?: string; maxWords?: number; greylistEnabled?: boolean; greylistWords?: string[]; greylistEntries?: GreylistEntry[]; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description: string } }): Promise<IpcResult<{ prompt: string }>> =>
      invokeWithFallback('generator:magicRandom', input),
    improvePrompt: (input?: { prompt?: string }): Promise<IpcResult<{ prompt: string; providerId: string; modelId: string }>> =>
      invokeWithFallback('generator:improvePrompt', input),
    generateNegativePrompt: (input?: { prompt?: string }): Promise<IpcResult<{ negativePrompt: string }>> =>
      invokeWithFallback('generator:generateNegativePrompt', input),
    improveNegativePrompt: (input?: { negativePrompt?: string }): Promise<IpcResult<{ negativePrompt: string }>> =>
      invokeWithFallback('generator:improveNegativePrompt', input),
    generateTitle: (input?: { prompt?: string }): Promise<IpcResult<{ title: string }>> =>
      invokeWithFallback('generator:generateTitle', input),
    generateTags: (input?: { title?: string; prompt?: string; negativePrompt?: string; existingTags?: string[]; maxTags?: number }): Promise<IpcResult<GeneratedTagsResult>> =>
      invokeWithFallback('generator:generateTags', input),
    quickExpand: (input?: { idea?: string; presetName?: string; presetPrompt?: string; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description?: string } }): Promise<IpcResult<{ prompt: string }>> =>
      invokeWithFallback('generator:quickExpand', input),
    simpleGenerate: (input?: { fieldType?: 'subject' | 'style' | 'lighting' | 'mood' | 'artist' | 'technical'; maxWords?: number }): Promise<IpcResult<{ text: string }>> =>
      invokeWithFallback('generator:simpleGenerate', input),
    generatePromptFromFields: (input?: { subject?: string; style?: string; lighting?: string; mood?: string; artist?: string; technical?: string; creativity?: 'focused' | 'balanced' | 'wild'; maxWords?: number }): Promise<IpcResult<{ prompt: string }>> =>
      invokeWithFallback('generator:generatePromptFromFields', input),
    fillAllFields: (input?: { subject?: string; style?: string; lighting?: string; mood?: string; artist?: string; technical?: string }): Promise<IpcResult<{ fields: Record<string, string> }>> =>
      invokeWithFallback('generator:fillAllFields', input),
    adviseModel: (input?: { prompt?: string; mode?: 'rule' | 'ai'; budgetMode?: 'cheap' | 'balanced' | 'premium' }): Promise<IpcResult<ModelAdvisorResult>> =>
      invokeWithFallback('generator:adviseModel', input),
  },
  ai: {
    testChatCompletion: (input: { providerId: string; modelId: string; role: 'generation' | 'improvement' | 'vision' | 'general' }): Promise<IpcResult<{ ok: boolean; content: string }>> =>
      invokeWithFallback('ai:testChatCompletion', input),
  },
  usage: {
    getSummary: (): Promise<IpcResult<UsageSummary>> =>
      invokeWithFallback('usage:getSummary'),
    getBreakdown: (input?: { days?: number; topModelsLimit?: number }): Promise<IpcResult<UsageBreakdown>> =>
      invokeWithFallback('usage:getBreakdown', input),
    listDaily: (input?: { days?: number }): Promise<IpcResult<UsageDailyTotals[]>> =>
      invokeWithFallback('usage:listDaily', input),
    reset: (input?: { clearHistory?: boolean }): Promise<IpcResult<void>> =>
      invokeWithFallback('usage:reset', input),
  },
  nightcafeModels: {
    list: (filters?: { mediaType?: 'image' | 'video' }): Promise<IpcResult<NightcafeModelOption[]>> =>
      invokeWithFallback('nightcafeModels:list', filters),
    getSupport: (input?: { modelName?: string }): Promise<IpcResult<NightcafeModelSupport>> =>
      invokeWithFallback('nightcafeModels:getSupport', input),
    refreshHuggingFace: (input?: { force?: boolean }): Promise<IpcResult<NightcafeHuggingFaceSyncStats>> =>
      invokeWithFallback('nightcafeModels:refreshHuggingFace', input),
    getHuggingFaceSyncInfo: (): Promise<IpcResult<NightcafeHuggingFaceSyncInfo>> =>
      invokeWithFallback('nightcafeModels:getHuggingFaceSyncInfo'),
  },
  nightcafePresets: {
    list: (): Promise<IpcResult<NightcafePresetOption[]>> =>
      invokeWithFallback('nightcafePresets:list'),
  },
  characters: {
    list: (): Promise<IpcResult<CharacterRecord[]>> =>
      invokeWithFallback('characters:list'),
    create: (input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord>> =>
      invokeWithFallback('characters:create', input),
    update: (id: string, input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord | undefined>> =>
      invokeWithFallback('characters:update', id, input),
    delete: (id: string): Promise<IpcResult<{ ok: boolean }>> =>
      invokeWithFallback('characters:delete', id),
    saveImage: (input: { dataUrl: string; fileName?: string }): Promise<IpcResult<{ fileUrl: string }>> =>
      invokeWithFallback('characters:saveImage', input),
    deleteImage: (input: { fileUrl: string }): Promise<IpcResult<{ ok: boolean }>> =>
      invokeWithFallback('characters:deleteImage', input),
  },
  greylist: {
    get: (): Promise<IpcResult<Greylist>> =>
      invokeWithFallback('greylist:get'),
    save: (input: { words?: string[]; entriesJson?: GreylistEntry[] }): Promise<IpcResult<Greylist>> =>
      invokeWithFallback('greylist:save', input),
    update: (input: { words?: string[]; entriesJson?: GreylistEntry[] }): Promise<IpcResult<Greylist>> =>
      invokeWithFallback('greylist:update', input),
  },
  gallery: {
    list: (filters?: GalleryFilters): Promise<IpcResult<{ items: GalleryItem[]; totalCount: number }>> =>
      invokeWithFallback('gallery:list', filters),
    saveImage: (input: { dataUrl: string; fileName?: string }): Promise<IpcResult<{ fileUrl: string }>> =>
      invokeWithFallback('gallery:saveImage', input),
    createItem: (input: Partial<GalleryItem>): Promise<IpcResult<GalleryItem>> =>
      invokeWithFallback('gallery:createItem', input),
    updateItem: (id: string, input: Partial<GalleryItem>): Promise<IpcResult<GalleryItem>> =>
      invokeWithFallback('gallery:updateItem', id, input),
    deleteItem: (id: string): Promise<IpcResult<{ ok: boolean }>> =>
      invokeWithFallback('gallery:deleteItem', id),
    listCollections: (): Promise<IpcResult<Collection[]>> =>
      invokeWithFallback('gallery:listCollections'),
    createCollection: (input: { name: string; description?: string; color?: string }): Promise<IpcResult<Collection>> =>
      invokeWithFallback('gallery:createCollection', input),
    deleteCollection: (id: string): Promise<IpcResult<{ ok: boolean }>> =>
      invokeWithFallback('gallery:deleteCollection', id),
  },
  dialog: {
    showErrorBox: (title: string, content: string): Promise<void> =>
      invokeWithFallback('dialog:showErrorBox', { title, content }),
    showMessageBox: (options: { type?: 'info' | 'warning' | 'error'; title: string; message: string; buttons?: string[] }): Promise<{ response: number; checkboxChecked?: boolean }> =>
      invokeWithFallback('dialog:showMessageBox', options),
  },
  onUnexpectedIpcError: (listener: IpcUnexpectedErrorListener): (() => void) => {
    ipcUnexpectedErrorListeners.add(listener)

    return () => {
      ipcUnexpectedErrorListeners.delete(listener)
    }
  },
})

