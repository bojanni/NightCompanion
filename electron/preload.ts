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
  },
  generator: {
    magicRandom: (input?: { theme?: string }): Promise<IpcResult<{ prompt: string }>> =>
      ipcRenderer.invoke('generator:magicRandom', input),
  },
})
