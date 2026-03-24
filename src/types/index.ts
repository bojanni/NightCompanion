// Re-export schema types for use in the renderer
export type { Prompt, PromptVersion, NewPrompt, StyleProfile, NewStyleProfile, GenerationEntry, NewGenerationEntry, Collection, GalleryItem, NewGalleryItem, NewCollection } from '../lib/schema'

export type PromptMutationInput = Omit<import('../lib/schema').NewPrompt, 'createdAt' | 'updatedAt'> & {
  imageDataUrl?: string | null
  imageFileName?: string | null
  removeImage?: boolean
}

export type Screen =
  | 'dashboard'
  | 'ai-config'
  | 'library'
  | 'characters'
  | 'style-profiles'
  | 'generation-log'
  | 'generator'
  | 'gallery'
  | 'settings'

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

export type PromptFilters = {
  search?: string
  tags?: string[]
  model?: string
}
