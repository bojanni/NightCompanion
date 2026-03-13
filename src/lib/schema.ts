import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

// ─── Prompts ─────────────────────────────────────────────────────────────────

export const prompts = pgTable(
  'prompts',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    promptText: text('prompt_text').notNull(),
    negativePrompt: text('negative_prompt').default(''),
    tags: text('tags').array().default([]).notNull(),
    model: varchar('model', { length: 100 }).default('').notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    isFavorite: boolean('is_favorite').default(false).notNull(),
    rating: integer('rating'),
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
    rating: integer('rating'), // 1-5
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
    contextLength: integer('context_length'),
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
    gridRow: integer('grid_row'),
    gridColumn: integer('grid_column'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('nightcafe_presets_name_idx').on(table.presetName),
    index('nightcafe_presets_category_idx').on(table.category),
  ]
)

// ─── Characters ───────────────────────────────────────────────────────────────

export const characters = pgTable(
  'characters',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').default('').notNull(),
    imagesJson: text('images_json').default('[]').notNull(),
    detailsJson: text('details_json').default('[]').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('characters_name_idx').on(table.name),
    index('characters_created_at_idx').on(table.createdAt),
  ]
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert

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
