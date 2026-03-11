import { contextBridge, ipcRenderer } from 'electron'
import type { Prompt, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry } from '../src/lib/schema'

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

export type OpenRouterModel = {
  modelId: string
  displayName: string
  contextLength: number | null
}

export type NightcafeModelOption = {
  modelName: string
  modelType: string
  mediaType: string
}

export type NightcafePresetOption = {
  presetName: string
  category: string
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
    magicRandom: (input?: { theme?: string; presetName?: string; greylistEnabled?: boolean; greylistWords?: string[] }): Promise<IpcResult<{ prompt: string }>> =>
      ipcRenderer.invoke('generator:magicRandom', input),
  },
  nightcafeModels: {
    list: (filters?: { mediaType?: 'image' | 'video' }): Promise<IpcResult<NightcafeModelOption[]>> =>
      ipcRenderer.invoke('nightcafeModels:list', filters),
  },
  nightcafePresets: {
    list: (): Promise<IpcResult<NightcafePresetOption[]>> =>
      ipcRenderer.invoke('nightcafePresets:list'),
  },
  characters: {
    saveImage: (input: { dataUrl: string; fileName?: string }): Promise<IpcResult<{ fileUrl: string }>> =>
      ipcRenderer.invoke('characters:saveImage', input),
    deleteImage: (input: { fileUrl: string }): Promise<IpcResult<{ ok: boolean }>> =>
      ipcRenderer.invoke('characters:deleteImage', input),
  },
})
