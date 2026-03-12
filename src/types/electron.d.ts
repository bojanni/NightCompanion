import type { Prompt, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry } from '../lib/schema'

type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }
type PromptFilters = { search?: string; tags?: string[]; model?: string }
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
}
type OpenRouterModel = { modelId: string; displayName: string; contextLength: number | null }
type NightcafeModelOption = { modelName: string; modelType: string; mediaType: string }
type NightcafePresetOption = { presetName: string; category: string }
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

declare global {
  interface Window {
    electronAPI: {
      prompts: {
        list(filters?: PromptFilters): Promise<IpcResult<Prompt[]>>
        get(id: number): Promise<IpcResult<Prompt | undefined>>
        create(data: NewPrompt): Promise<IpcResult<Prompt>>
        update(id: number, data: Partial<NewPrompt>): Promise<IpcResult<Prompt>>
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
        saveOpenRouter(input: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterSettings>>
        listOpenRouterModels(): Promise<IpcResult<OpenRouterModel[]>>
        refreshOpenRouterModels(input?: Partial<OpenRouterSettings>): Promise<IpcResult<OpenRouterModel[]>>
        testOpenRouter(input?: Partial<OpenRouterSettings>): Promise<IpcResult<{ ok: boolean; modelCount: number }>>
      }
      generator: {
        magicRandom(input?: { theme?: string; presetName?: string; greylistEnabled?: boolean; greylistWords?: string[] }): Promise<IpcResult<{ prompt: string }>>
      }
      nightcafeModels: {
        list(filters?: { mediaType?: 'image' | 'video' }): Promise<IpcResult<NightcafeModelOption[]>>
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
    }
  }
}

export {}
