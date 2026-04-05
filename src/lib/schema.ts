import {
  pgTable,
  serial,
  text,
  jsonb,
  uuid,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ─── Prompts ─────────────────────────────────────────────────────────────────

export const prompts = pgTable(
  'prompts',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    imageUrl: text('image_url').default('').notNull(),
    imagesJson: jsonb('images_json').$type<Array<{
      id: string
      url: string
      note: string
      model: string
      seed: string
      createdAt: string
    }>>().default([]).notNull(),
    promptText: text('prompt_text').notNull(),
    negativePrompt: text('negative_prompt').default(''),
    tags: text('tags').array().default([]).notNull(),
    model: varchar('model', { length: 100 }).default('').notNull(),
    suggestedModel: varchar('suggested_model', { length: 100 }).default('').notNull(),
    seed: varchar('seed', { length: 64 }).default('').notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    rating: real('rating'),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('prompts_model_idx').on(table.model),
    index('prompts_created_at_idx').on(table.createdAt),
    index('prompts_tags_idx').on(table.tags),
  ]
)

// ─── Prompt Versions ─────────────────────────────────────────────────────────

export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: serial('id').primaryKey(),
    promptId: integer('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    imageUrl: text('image_url').default('').notNull(),
    imagesJson: jsonb('images_json').$type<Array<{
      id: string
      url: string
      note: string
      model: string
      seed: string
      createdAt: string
    }>>().default([]).notNull(),
    promptText: text('prompt_text').notNull(),
    negativePrompt: text('negative_prompt').default('').notNull(),
    tags: text('tags').array().default([]).notNull(),
    model: varchar('model', { length: 100 }).default('').notNull(),
    suggestedModel: varchar('suggested_model', { length: 100 }).default('').notNull(),
    seed: varchar('seed', { length: 64 }).default('').notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    rating: real('rating'),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('prompt_versions_prompt_id_idx').on(table.promptId),
    index('prompt_versions_created_at_idx').on(table.createdAt),
    uniqueIndex('prompt_versions_prompt_version_unique').on(table.promptId, table.versionNumber),
  ]
)

// ─── Style Profiles ───────────────────────────────────────────────────────────

export const styleProfiles = pgTable(
  'style_profiles',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    basePromptSnippet: text('base_prompt_snippet').default('').notNull(),
    preferredModel: varchar('preferred_model', { length: 100 }).default('').notNull(),
    commonNegativePrompts: text('common_negative_prompts').default('').notNull(),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('style_profiles_created_at_idx').on(table.createdAt),
  ]
)

// ─── Generation Log ───────────────────────────────────────────────────────────

export const generationLog = pgTable(
  'generation_log',
  {
    id: serial('id').primaryKey(),
    nightcafeUrl: text('nightcafe_url').default('').notNull(),
    thumbnailUrl: text('thumbnail_url').default('').notNull(),
    promptId: integer('prompt_id').references(() => prompts.id, { onDelete: 'set null' }),
    promptSnapshot: text('prompt_snapshot').default('').notNull(),
    rating: real('rating'), // 0-5 (supports 0.5 steps)
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('generation_log_rating_idx').on(table.rating),
    index('generation_log_created_at_idx').on(table.createdAt),
    index('generation_log_prompt_id_idx').on(table.promptId),
  ]
)

// ─── OpenRouter Models Cache ─────────────────────────────────────────────────

export const openRouterModels = pgTable(
  'openrouter_models',
  {
    id: serial('id').primaryKey(),
    modelId: varchar('model_id', { length: 255 }).notNull().unique(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    description: text('description').default('').notNull(),
    contextLength: integer('context_length'),
    capabilities: jsonb('capabilities').$type<Array<'vision' | 'reasoning' | 'web_search' | 'code' | 'audio' | 'video' | 'text'>>().default([]).notNull(),
    promptPrice: varchar('prompt_price', { length: 32 }),
    completionPrice: varchar('completion_price', { length: 32 }),
    requestPrice: varchar('request_price', { length: 32 }),
    imagePrice: varchar('image_price', { length: 32 }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('openrouter_models_model_id_idx').on(table.modelId),
    index('openrouter_models_updated_at_idx').on(table.updatedAt),
  ]
)

// ─── NightCafe Models Cache ─────────────────────────────────────────────────

export const nightcafeModels = pgTable(
  'nightcafe_models',
  {
    id: serial('id').primaryKey(),
    modelKey: varchar('model_key', { length: 300 }).notNull().unique(),
    modelName: varchar('model_name', { length: 255 }).notNull(),
    description: text('description').default('').notNull(),
    modelType: varchar('model_type', { length: 20 }).notNull(),
    mediaType: varchar('media_type', { length: 20 }).notNull(),
    artScore: varchar('art_score', { length: 16 }).default('').notNull(),
    promptingScore: varchar('prompting_score', { length: 16 }).default('').notNull(),
    realismScore: varchar('realism_score', { length: 16 }).default('').notNull(),
    typographyScore: varchar('typography_score', { length: 16 }).default('').notNull(),
    costTier: varchar('cost_tier', { length: 16 }).default('').notNull(),
    supportsNegativePrompt: boolean('supports_negative_prompt').default(false).notNull(),
    hfModelId: varchar('hf_model_id', { length: 255 }),
    hfCardSummary: text('hf_card_summary').default('').notNull(),
    hfDownloads: integer('hf_downloads'),
    hfLikes: integer('hf_likes'),
    hfLastModified: timestamp('hf_last_modified'),
    hfSyncedAt: timestamp('hf_synced_at'),
    hfSyncStatus: varchar('hf_sync_status', { length: 24 }).default('pending').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nightcafe_models_model_type_idx').on(table.modelType),
    index('nightcafe_models_media_type_idx').on(table.mediaType),
    index('nightcafe_models_model_name_idx').on(table.modelName),
  ]
)

// ─── NightCafe Presets Cache ────────────────────────────────────────────────

export const nightcafePresets = pgTable(
  'nightcafe_presets',
  {
    id: serial('id').primaryKey(),
    presetKey: varchar('preset_key', { length: 300 }).notNull().unique(),
    presetName: varchar('preset_name', { length: 255 }).notNull(),
    category: varchar('category', { length: 120 }).default('').notNull(),
    presetPrompt: text('preset_prompt').default('').notNull(),
    gridRow: integer('grid_row'),
    gridColumn: integer('grid_column'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nightcafe_presets_name_idx').on(table.presetName),
    index('nightcafe_presets_category_idx').on(table.category),
  ]
)

export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 64 }).notNull(),
    modelId: varchar('model_id', { length: 255 }).notNull(),
    promptTokens: integer('prompt_tokens').default(0).notNull(),
    completionTokens: integer('completion_tokens').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),
    costUsd: real('cost_usd').default(0).notNull(),
    promptText: text('prompt_text'),
    responseText: text('response_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_usage_events_created_at_idx').on(table.createdAt),
    index('ai_usage_events_provider_id_idx').on(table.providerId),
    index('ai_usage_events_model_id_idx').on(table.modelId),
  ]
)

// ─── Characters ───────────────────────────────────────────────────────────────

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').default('').notNull(),
    imagesJson: jsonb('images_json').$type<Array<{
      id: string
      url: string
      isMain: boolean
      createdAt: string
    }>>().default([]).notNull(),
    detailsJson: jsonb('details_json').$type<Array<{
      id: string
      detail: string
      category: string
      worksWell: boolean
    }>>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('characters_name_idx').on(table.name),
    index('characters_created_at_idx').on(table.createdAt),
  ]
)

// ─── Greylist ────────────────────────────────────────────────────────────────────

export const greylistTable = pgTable(
  'greylist',
  {
    id: serial('id').primaryKey(),
    words: text('words').array().default([]).notNull(),
    userId: varchar('user_id', { length: 255 }).default('').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('greylist_user_id_idx').on(table.userId),
    index('greylist_created_at_idx').on(table.createdAt),
  ]
)

// ─── Collections ─────────────────────────────────────────────────────────────

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').default('#6366f1'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('collections_created_at_idx').on(table.createdAt),
  ]
)

// ─── Gallery Items ───────────────────────────────────────────────────────────

export const galleryItems = pgTable(
  'gallery_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title'),
    imageUrl: text('image_url'),
    videoUrl: text('video_url'),
    thumbnailUrl: text('thumbnail_url'),
    mediaType: text('media_type').default('image'),
    promptUsed: text('prompt_used'),
    promptId: uuid('prompt_id'),
    model: text('model'),
    aspectRatio: text('aspect_ratio'),
    rating: integer('rating').default(0),
    notes: text('notes'),
    collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'set null' }),
    storageMode: text('storage_mode').default('url'),
    durationSeconds: integer('duration_seconds'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('gallery_items_collection_id_idx').on(table.collectionId),
    index('gallery_items_rating_idx').on(table.rating),
    index('gallery_items_media_type_idx').on(table.mediaType),
    index('gallery_items_created_at_idx').on(table.createdAt),
  ]
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert
export type PromptVersion = typeof promptVersions.$inferSelect
export type NewPromptVersion = typeof promptVersions.$inferInsert

export type StyleProfile = typeof styleProfiles.$inferSelect
export type NewStyleProfile = typeof styleProfiles.$inferInsert

export type GenerationEntry = typeof generationLog.$inferSelect
export type NewGenerationEntry = typeof generationLog.$inferInsert

export type OpenRouterModel = typeof openRouterModels.$inferSelect
export type NewOpenRouterModel = typeof openRouterModels.$inferInsert

export type NightcafeModel = typeof nightcafeModels.$inferSelect
export type NewNightcafeModel = typeof nightcafeModels.$inferInsert

export type NightcafePreset = typeof nightcafePresets.$inferSelect
export type NewNightcafePreset = typeof nightcafePresets.$inferInsert

export type Character = typeof characters.$inferSelect
export type NewCharacter = typeof characters.$inferInsert

export type Greylist = typeof greylistTable.$inferSelect
export type NewGreylist = typeof greylistTable.$inferInsert

export type Collection = typeof collections.$inferSelect
export type NewCollection = typeof collections.$inferInsert

export type GalleryItem = typeof galleryItems.$inferSelect
export type NewGalleryItem = typeof galleryItems.$inferInsert
