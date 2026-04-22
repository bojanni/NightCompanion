// Re-export schema types for use in the renderer
export type { Prompt, PromptVersion, NewPrompt, StyleProfile, NewStyleProfile, Collection, GalleryItem, NewGalleryItem, NewCollection } from '../lib/schema'

export type PromptImageMutationInput = {
  id?: string
  url?: string
  dataUrl?: string | null
  fileName?: string | null
  note?: string
  model?: string
  seed?: string
  stylePreset?: string
  createdAt?: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt?: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  durationSeconds?: number
  collectionId?: string | null
}

export type PromptMutationInput = Omit<import('../lib/schema').NewPrompt, 'createdAt' | 'updatedAt'> & {
  imageDataUrl?: string | null
  imageFileName?: string | null
  removeImage?: boolean
  images?: PromptImageMutationInput[] | null
  originalPrompt?: string
  stylePreset?: string
}

export type Screen =
  | 'dashboard'
  | 'ai-config'
  | 'library'
  | 'media'
  | 'characters'
  | 'style-profiles'
  | 'generator'
  | 'gallery'
  | 'usage'
  | 'settings'

export type IpcResult<T> = { data: T; error?: never } | { data?: never; error: string }

export type PromptFilters = {
  search?: string
  tags?: string[]
  model?: string
}
