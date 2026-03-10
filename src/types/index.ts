// Re-export schema types for use in the renderer
export type { Prompt, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry } from '../lib/schema'

export type Screen =
  | 'dashboard'
  | 'library'
  | 'characters'
  | 'style-profiles'
  | 'generation-log'
  | 'generator'
  | 'settings'

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

export type PromptFilters = {
  search?: string
  tags?: string[]
  model?: string
}
