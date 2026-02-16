export interface Prompt {
  id: string;
  title: string;
  content: string;
  notes: string;
  rating: number;
  is_template: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  gallery_item_id?: string | null;
  model?: string;
  suggested_model?: string;
  revised_prompt?: string;
  seed?: number;
  aspect_ratio?: string;
  use_custom_aspect_ratio?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string;
  created_at: string;
}

export interface PromptTag {
  prompt_id: string;
  tag_id: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  content: string;
  version_number: number;
  change_description: string | null;
  created_at: string;
  model?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  reference_image_url: string;
  created_at: string;
  updated_at: string;
  details?: CharacterDetail[];
}

export interface CharacterDetail {
  id: string;
  character_id: string;
  category: string;
  detail: string;
  works_well: boolean;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  prompt_used: string;
  prompt_id: string | null;
  character_id: string | null;
  rating: number;
  collection_id: string | null;
  notes: string;
  created_at: string;
  model?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
}

export interface ModelUsage {
  id: string;
  model_id: string;
  prompt_used: string;
  category: string;
  rating: number;
  is_keeper: boolean;
  notes: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  credit_balance: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'purchase' | 'bonus';
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type DetailCategory = 'clothing' | 'lighting' | 'pose' | 'style' | 'expression' | 'environment' | 'general';

export const DETAIL_CATEGORIES: DetailCategory[] = [
  'clothing', 'lighting', 'pose', 'style', 'expression', 'environment', 'general'
];

export const TAG_CATEGORIES = [
  'landscape', 'character', 'mood', 'style', 'technique', 'general'
] as const;

export const TAG_COLORS = [
  '#d97706', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#65a30d'
];

import { MODELS } from './models-data';

export const AI_MODELS = [
  ...MODELS.map(m => m.name),
  'Other'
] as const;
