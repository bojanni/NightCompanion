import { z } from 'zod';

export const PromptSchema = z.object({
  content: z.string().min(1, 'Prompt content is required').max(5000, 'Prompt too long'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  is_template: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([])
});

export const CharacterSchema = z.object({
  name: z.string().min(1, 'Character name is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  attributes: z.record(z.string(), z.unknown()).optional()
});

export const ApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'replicate', 'stability', 'midjourney', 'gemini', 'openrouter', 'together', 'deepinfra']),
  api_key: z.string().min(10, 'API key too short').max(500, 'API key too long'),
  is_active: z.boolean().default(true)
});

export const LocalEndpointSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  endpoint_url: z.string().url('Invalid URL').max(500, 'URL too long'),
  api_key: z.string().max(500, 'API key too long').optional().nullable(),
  is_active: z.boolean().default(true)
});

export const StyleProfileSchema = z.object({
  image_url: z.string().url('Invalid URL').max(1000, 'URL too long'),
  analysis_data: z.record(z.string(), z.unknown())
});

export const BatchTestSchema = z.object({
  name: z.string().min(1, 'Test name is required').max(200, 'Name too long'),
  base_prompt: z.string().min(1, 'Base prompt is required').max(5000, 'Prompt too long'),
  variations: z.array(z.string().max(5000)).min(1, 'At least one variation required').max(50, 'Too many variations')
});

export const ModelUsageSchema = z.object({
  model_id: z.string().min(1, 'Model ID is required').max(100),
  prompt: z.string().max(5000, 'Prompt too long'),
  image_url: z.string().url('Invalid URL').max(1000, 'URL too long').optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable()
});

export type PromptInput = z.infer<typeof PromptSchema>;
export type CharacterInput = z.infer<typeof CharacterSchema>;
export type ApiKeyInput = z.infer<typeof ApiKeySchema>;
export type LocalEndpointInput = z.infer<typeof LocalEndpointSchema>;
export type StyleProfileInput = z.infer<typeof StyleProfileSchema>;
export type BatchTestInput = z.infer<typeof BatchTestSchema>;
export type ModelUsageInput = z.infer<typeof ModelUsageSchema>;
