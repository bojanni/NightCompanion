import { contextBridge, ipcRenderer } from 'electron'
import type { Prompt, PromptVersion, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry } from '../src/lib/schema'

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
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
}

export type AiConfigStateStore = {
  dashboardRoleRouting?: unknown
  cachedModels?: unknown
  advisorModelRoute?: unknown
  aiApiRequestLoggingEnabled?: boolean
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
  is_active?: boolean
  is_active_gen?: boolean
  is_active_improve?: boolean
  is_active_vision?: boolean
  updated_at?: string
}

export type OpenRouterModel = {
  modelId: string
  displayName: string
  description: string
  contextLength: number | null
  promptPrice: string | null
  completionPrice: string | null
  requestPrice: string | null
  imagePrice: string | null
}

export type NightcafeModelOption = {
  modelName: string
  modelType: string
  mediaType: string
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
}

export type NightcafePresetOption = {
  presetName: string
  category: string
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

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

contextBridge.exposeInMainWorld('electronAPI', {
  prompts: {
    list: (filters?: PromptFilters): Promise<IpcResult<Prompt[]>> =>
      ipcRenderer.invoke('prompts:list', filters),
    get: (id: number): Promise<IpcResult<Prompt | undefined>> =>
      ipcRenderer.invoke('prompts:get', id),
    create: (data: NewPrompt): Promise<IpcResult<Prompt>> =>
      ipcRenderer.invoke('prompts:create', data),
    listVersions: (promptId: number): Promise<IpcResult<PromptVersion[]>> =>
      ipcRenderer.invoke('prompts:listVersions', promptId),
    update: (id: number, data: Partial<NewPrompt>): Promise<IpcResult<Prompt>> =>
      ipcRenderer.invoke('prompts:update', id, data),
    delete: (id: number): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('prompts:delete', id),
  },
  styleProfiles: {
    list: (): Promise<IpcResult<StyleProfile[]>> =>
      ipcRenderer.invoke('styleProfiles:list'),
    get: (id: number): Promise<IpcResult<StyleProfile | undefined>> =>
      ipcRenderer.invoke('styleProfiles:get', id),
    create: (data: NewStyleProfile): Promise<IpcResult<StyleProfile>> =>
      ipcRenderer.invoke('styleProfiles:create', data),
    update: (id: number, data: Partial<NewStyleProfile>): Promise<IpcResult<StyleProfile>> =>
      ipcRenderer.invoke('styleProfiles:update', id, data),
    delete: (id: number): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('styleProfiles:delete', id),
  },
  generationLog: {
    list: (): Promise<IpcResult<GenerationEntry[]>> =>
      ipcRenderer.invoke('generationLog:list'),
    create: (data: NewGenerationEntry): Promise<IpcResult<GenerationEntry>> =>
      ipcRenderer.invoke('generationLog:create', data),
    update: (id: number, data: Partial<NewGenerationEntry>): Promise<IpcResult<GenerationEntry>> =>
      ipcRenderer.invoke('generationLog:update', id, data),
    delete: (id: number): Promise<IpcResult<void>> =>
      ipcRenderer.invoke('generationLog:delete', id),
  },
  settings: {
    getOpenRouter: (): Promise<IpcResult<OpenRouterSettings>> =>
      ipcRenderer.invoke('settings:getOpenRouter'),
    getProviderMeta: (providerId: string, fallbackModel: string): Promise<IpcResult<ProviderMetaStore>> =>
      ipcRenderer.invoke('settings:getProviderMeta', providerId, fallbackModel),
    saveProviderMeta: (providerId: string, input: Partial<ProviderMetaStore>): Promise<IpcResult<ProviderMetaStore>> =>
      ipcRenderer.invoke('settings:saveProviderMeta', providerId, input),
    getAiConfigState: (): Promise<IpcResult<AiConfigStateStore>> =>
      ipcRenderer.invoke('settings:getAiConfigState'),
    saveAiConfigState: (input: AiConfigStateStore): Promise<IpcResult<AiConfigStateStore>> =>
      ipcRenderer.invoke('settings:saveAiConfigState', input),
    getLocalEndpoints: (): Promise<IpcResult<LocalEndpointStore[]>> =>
      ipcRenderer.invoke('settings:getLocalEndpoints'),
    saveLocalEndpoints: (input: LocalEndpointStore[]): Promise<IpcResult<LocalEndpointStore[]>> =>
      ipcRenderer.invoke('settings:saveLocalEndpoints', input),
    saveOpenRouter: (input: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterSettings>> =>
      ipcRenderer.invoke('settings:saveOpenRouter', input),
    listOpenRouterModels: (): Promise<IpcResult<OpenRouterModel[]>> =>
      ipcRenderer.invoke('settings:listOpenRouterModels'),
    refreshOpenRouterModels: (input?: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterModel[]>> =>
      ipcRenderer.invoke('settings:refreshOpenRouterModels', input),
    testOpenRouter: (input?: Partial<OpenRouterSettings>): Promise<IpcResult<{ ok: boolean; modelCount: number }>> =>
      ipcRenderer.invoke('settings:testOpenRouter', input),
  },
  generator: {
    magicRandom: (input?: { presetName?: string; maxWords?: number; greylistEnabled?: boolean; greylistWords?: string[] }): Promise<IpcResult<{ prompt: string }>> =>
      ipcRenderer.invoke('generator:magicRandom', input),
    improvePrompt: (input?: { prompt?: string }): Promise<IpcResult<{ prompt: string }>> =>
      ipcRenderer.invoke('generator:improvePrompt', input),
    generateNegativePrompt: (input?: { prompt?: string }): Promise<IpcResult<{ negativePrompt: string }>> =>
      ipcRenderer.invoke('generator:generateNegativePrompt', input),
    improveNegativePrompt: (input?: { negativePrompt?: string }): Promise<IpcResult<{ negativePrompt: string }>> =>
      ipcRenderer.invoke('generator:improveNegativePrompt', input),
    generateTitle: (input?: { prompt?: string }): Promise<IpcResult<{ title: string }>> =>
      ipcRenderer.invoke('generator:generateTitle', input),
    quickExpand: (input?: { idea?: string; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description?: string } }): Promise<IpcResult<{ prompt: string }>> =>
      ipcRenderer.invoke('generator:quickExpand', input),
    adviseModel: (input?: { prompt?: string; mode?: 'rule' | 'ai' }): Promise<IpcResult<ModelAdvisorResult>> =>
      ipcRenderer.invoke('generator:adviseModel', input),
  },
  nightcafeModels: {
    list: (filters?: { mediaType?: 'image' | 'video' }): Promise<IpcResult<NightcafeModelOption[]>> =>
      ipcRenderer.invoke('nightcafeModels:list', filters),
    getSupport: (input?: { modelName?: string }): Promise<IpcResult<NightcafeModelSupport>> =>
      ipcRenderer.invoke('nightcafeModels:getSupport', input),
  },
  nightcafePresets: {
    list: (): Promise<IpcResult<NightcafePresetOption[]>> =>
      ipcRenderer.invoke('nightcafePresets:list'),
  },
  characters: {
    list: (): Promise<IpcResult<CharacterRecord[]>> =>
      ipcRenderer.invoke('characters:list'),
    create: (input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord>> =>
      ipcRenderer.invoke('characters:create', input),
    update: (id: string, input: Partial<CharacterRecord>): Promise<IpcResult<CharacterRecord | undefined>> =>
      ipcRenderer.invoke('characters:update', id, input),
    delete: (id: string): Promise<IpcResult<{ ok: boolean }>> =>
      ipcRenderer.invoke('characters:delete', id),
    saveImage: (input: { dataUrl: string; fileName?: string }): Promise<IpcResult<{ fileUrl: string }>> =>
      ipcRenderer.invoke('characters:saveImage', input),
    deleteImage: (input: { fileUrl: string }): Promise<IpcResult<{ ok: boolean }>> =>
      ipcRenderer.invoke('characters:deleteImage', input),
  },
})
