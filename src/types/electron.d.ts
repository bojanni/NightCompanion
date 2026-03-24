import type { Prompt, PromptVersion, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry, Greylist, GalleryItem, Collection } from '../lib/schema'

type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }
type PromptFilters = { search?: string; tags?: string[]; model?: string }
type PromptMutationInput = Omit<NewPrompt, 'createdAt' | 'updatedAt'> & {
  imageDataUrl?: string | null
  imageFileName?: string | null
  removeImage?: boolean
}
type OpenRouterSettings = { apiKey: string; model: string; siteUrl: string; appName: string }
type ProviderMetaStore = {
  model_gen: string
  model_improve: string
  model_vision: string
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
}
type AiConfigStateStore = {
  dashboardRoleRouting?: unknown
  cachedModels?: unknown
  advisorModelRoute?: unknown
  aiApiRequestLoggingEnabled?: boolean
  nativeWindowFrameEnabled?: boolean
  nightCompanionFolderPath?: string
}
type LocalEndpointStore = {
  id?: string
  provider?: string
  name?: string
  baseUrl?: string
  model_name?: string
  model_gen?: string
  model_improve?: string
  model_vision?: string
  is_active?: boolean
  is_active_gen?: boolean
  is_active_improve?: boolean
  is_active_vision?: boolean
  updated_at?: string
}
type OpenRouterModel = {
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
type NightcafeModelOption = {
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
type NightcafeModelSupport = { modelName: string; supportsNegativePrompt: boolean }
type NightcafePresetOption = { presetName: string; category: string; presetPrompt: string }
type NightcafeHuggingFaceSyncStats = {
  total: number
  processed: number
  skippedFresh: number
  matched: number
  unmatched: number
  failed: number
}
type NightcafeHuggingFaceSyncInfo = {
  lastSyncedAt: string | Date | null
  total: number
  counts: {
    matched: number
    unmatched: number
    error: number
    pending: number
  }
}
type GeneratedTagsResult = {
  tags: string[]
}
type ModelAdvisorRecommendation = { modelName: string; explanation: string }
type ModelAdvisorResult = {
  mode: 'rule' | 'ai'
  recommendation: ModelAdvisorRecommendation
  alternatives: ModelAdvisorRecommendation[]
  matchedSignals: string[]
  bestValue?: ModelAdvisorRecommendation
  fastest?: ModelAdvisorRecommendation
}
type GalleryFilters = { search?: string; collectionId?: string | null; minRating?: number; page?: number }
type CharacterImage = { id: string; url: string; isMain: boolean; createdAt: string }
type CharacterDetail = { id: string; detail: string; category: string; worksWell: boolean }
type CharacterRecord = {
  id: string
  name: string
  description: string
  images: CharacterImage[]
  details: CharacterDetail[]
  createdAt: string
  updatedAt: string
}
type IpcUnexpectedErrorPayload = {
  channel: string
  message: string
  occurredAt: string
}

declare global {
  interface Window {
    electronAPI: {
      prompts: {
        list(filters?: PromptFilters): Promise<IpcResult<Prompt[]>>
        get(id: number): Promise<IpcResult<Prompt | undefined>>
        create(data: PromptMutationInput): Promise<IpcResult<Prompt>>
        listVersions(promptId: number): Promise<IpcResult<PromptVersion[]>>
        update(id: number, data: Partial<PromptMutationInput>): Promise<IpcResult<Prompt>>
        delete(id: number): Promise<IpcResult<void>>
      }
      styleProfiles: {
        list(): Promise<IpcResult<StyleProfile[]>>
        get(id: number): Promise<IpcResult<StyleProfile | undefined>>
        create(data: NewStyleProfile): Promise<IpcResult<StyleProfile>>
        update(id: number, data: Partial<NewStyleProfile>): Promise<IpcResult<StyleProfile>>
        delete(id: number): Promise<IpcResult<void>>
      }
      generationLog: {
        list(): Promise<IpcResult<GenerationEntry[]>>
        create(data: NewGenerationEntry): Promise<IpcResult<GenerationEntry>>
        update(id: number, data: Partial<NewGenerationEntry>): Promise<IpcResult<GenerationEntry>>
        delete(id: number): Promise<IpcResult<void>>
      }
      settings: {
        getOpenRouter(): Promise<IpcResult<OpenRouterSettings>>
        getProviderMeta(providerId: string, fallbackModel: string): Promise<IpcResult<ProviderMetaStore>>
        saveProviderMeta(providerId: string, input: Partial<ProviderMetaStore>): Promise<IpcResult<ProviderMetaStore>>
        getAiConfigState(): Promise<IpcResult<AiConfigStateStore>>
        saveAiConfigState(input: AiConfigStateStore): Promise<IpcResult<AiConfigStateStore>>
        getNightCompanionFolderPath(): Promise<IpcResult<string>>
        saveNightCompanionFolderPath(input: string): Promise<IpcResult<string>>
        resetNightCompanionFolderPath(): Promise<IpcResult<string>>
        selectNightCompanionFolderPath(): Promise<IpcResult<string | null>>
        getLocalEndpoints(): Promise<IpcResult<LocalEndpointStore[]>>
        saveLocalEndpoints(input: LocalEndpointStore[]): Promise<IpcResult<LocalEndpointStore[]>>
        saveOpenRouter(input: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterSettings>>
        listOpenRouterModels(): Promise<IpcResult<OpenRouterModel[]>>
        refreshOpenRouterModels(input?: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterModel[]>>
        testOpenRouter(input?: Partial<OpenRouterSettings>): Promise<IpcResult<{ ok: boolean; modelCount: number }>>
      }
      generator: {
        magicRandom(input?: { presetName?: string; presetPrompt?: string; maxWords?: number; greylistEnabled?: boolean; greylistWords?: string[]; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description: string } }): Promise<IpcResult<{ prompt: string }>>
        improvePrompt(input?: { prompt?: string }): Promise<IpcResult<{ prompt: string }>>
        generateNegativePrompt(input?: { prompt?: string }): Promise<IpcResult<{ negativePrompt: string }>>
        improveNegativePrompt(input?: { negativePrompt?: string }): Promise<IpcResult<{ negativePrompt: string }>>
        generateTitle(input?: { prompt?: string }): Promise<IpcResult<{ title: string }>>
        generateTags(input?: { title?: string; prompt?: string; negativePrompt?: string; existingTags?: string[]; maxTags?: number }): Promise<IpcResult<GeneratedTagsResult>>
        quickExpand(input?: { idea?: string; presetName?: string; presetPrompt?: string; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description?: string } }): Promise<IpcResult<{ prompt: string }>>
        adviseModel(input?: { prompt?: string; mode?: 'rule' | 'ai'; budgetMode?: 'cheap' | 'balanced' | 'premium' }): Promise<IpcResult<ModelAdvisorResult>>
      }
      nightcafeModels: {
        list(filters?: { mediaType?: 'image' | 'video' }): Promise<IpcResult<NightcafeModelOption[]>>
        getSupport(input?: { modelName?: string }): Promise<IpcResult<NightcafeModelSupport>>
        refreshHuggingFace(input?: { force?: boolean }): Promise<IpcResult<NightcafeHuggingFaceSyncStats>>
        getHuggingFaceSyncInfo(): Promise<IpcResult<NightcafeHuggingFaceSyncInfo>>
      }
      nightcafePresets: {
        list(): Promise<IpcResult<NightcafePresetOption[]>>
      }
      characters: {
        list(): Promise<IpcResult<CharacterRecord[]>>
        create(input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord>>
        update(id: string, input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord | undefined>>
        delete(id: string): Promise<IpcResult<{ ok: boolean }>>
        saveImage(input: { dataUrl: string; fileName?: string }): Promise<IpcResult<{ fileUrl: string }>>
        deleteImage(input: { fileUrl: string }): Promise<IpcResult<{ ok: boolean }>>
      }
      greylist: {
        get(): Promise<IpcResult<Greylist>>
        save(input: { words: string[] }): Promise<IpcResult<Greylist>>
        update(input: { words: string[] }): Promise<IpcResult<Greylist>>
      }
      gallery: {
        list(filters?: GalleryFilters): Promise<IpcResult<{ items: GalleryItem[]; totalCount: number }>>
        createItem(input: Partial<GalleryItem>): Promise<IpcResult<GalleryItem>>
        updateItem(id: string, input: Partial<GalleryItem>): Promise<IpcResult<GalleryItem>>
        deleteItem(id: string): Promise<IpcResult<{ ok: boolean }>>
        listCollections(): Promise<IpcResult<Collection[]>>
        createCollection(input: { name: string; description?: string; color?: string }): Promise<IpcResult<Collection>>
        deleteCollection(id: string): Promise<IpcResult<{ ok: boolean }>>
      }
      dialog: {
        showErrorBox(title: string, content: string): Promise<void>
        showMessageBox(options: { type?: 'info' | 'warning' | 'error'; title: string; message: string; buttons?: string[] }): Promise<{ response: number; checkboxChecked?: boolean }>
      }
      onUnexpectedIpcError(listener: (payload: IpcUnexpectedErrorPayload) => void): () => void
    }
  }
}

export {}

