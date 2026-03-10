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
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('openrouter_models_model_id_idx').on(table.modelId),
    index('openrouter_models_updated_at_idx').on(table.updatedAt),
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
