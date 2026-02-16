import { db } from './api';
import type { StyleAnalysis } from './ai-service';

const VOCAB: Record<string, string[]> = {
  subject: [
    'portrait', 'landscape', 'character', 'figure', 'animal', 'creature',
    'architecture', 'still life', 'woman', 'man', 'warrior', 'knight',
    'wizard', 'dragon', 'fox', 'wolf', 'deer', 'cat', 'bird', 'owl',
    'tree', 'flower', 'castle', 'city', 'robot', 'mermaid', 'fairy',
    'samurai', 'astronaut', 'witch', 'goddess', 'angel', 'demon',
    'skeleton', 'horse', 'phoenix', 'lion', 'bear', 'butterfly',
  ],
  style: [
    'photorealistic', 'cinematic', 'painterly', 'watercolor', 'oil painting',
    'digital art', 'concept art', 'illustration', 'anime', 'manga',
    'fantasy art', 'sci-fi', 'surreal', 'abstract', 'minimalist',
    'impressionist', 'gothic', 'art nouveau', 'art deco', 'steampunk',
    'cyberpunk', 'pixel art', 'low poly', 'hyper realistic', 'retro',
    'vintage', 'pop art', 'baroque', 'renaissance', 'ukiyo-e',
    'studio ghibli', 'comic book', 'pencil sketch', 'charcoal',
  ],
  mood: [
    'dreamy', 'ethereal', 'dramatic', 'peaceful', 'serene', 'moody',
    'mysterious', 'whimsical', 'dark', 'vibrant', 'melancholy', 'nostalgic',
    'epic', 'romantic', 'haunting', 'playful', 'somber', 'joyful',
    'majestic', 'eerie', 'cozy', 'tranquil', 'intense', 'magical',
    'enchanting', 'brooding', 'cheerful', 'ominous', 'sublime',
  ],
  lighting: [
    'golden hour', 'volumetric lighting', 'rim light', 'god rays',
    'neon light', 'moonlight', 'candlelight', 'backlit', 'soft light',
    'dramatic lighting', 'chiaroscuro', 'bioluminescent', 'sunlight',
    'starlight', 'diffused light', 'ambient light', 'studio lighting',
    'natural light', 'warm light', 'cool light', 'volumetric',
    'ray tracing', 'subsurface scattering', 'global illumination',
  ],
  technique: [
    'ultra detailed', 'highly detailed', '8k', '4k', 'masterpiece',
    'sharp focus', 'depth of field', 'bokeh', 'macro', 'wide angle',
    'close-up', 'tilt shift', 'long exposure', 'symmetrical',
    'rule of thirds', 'high resolution', 'intricate details',
    'fine details', 'trending on artstation', 'octane render',
    'unreal engine', 'ray traced', 'photographic', 'hdr',
  ],
  setting: [
    'forest', 'ocean', 'mountain', 'desert', 'space', 'underwater',
    'urban', 'garden', 'cave', 'ruins', 'temple', 'library',
    'meadow', 'beach', 'cliff', 'valley', 'swamp', 'glacier',
    'volcano', 'village', 'jungle', 'tundra', 'canyon', 'island',
    'cathedral', 'dungeon', 'tavern', 'marketplace', 'harbor',
  ],
  color: [
    'warm tones', 'cool tones', 'muted colors', 'vibrant colors',
    'pastel', 'monochrome', 'sepia', 'earth tones', 'neon colors',
    'high contrast', 'desaturated', 'saturated', 'dark palette',
    'color splash', 'duotone', 'complementary colors',
  ],
};

interface VocabEntry {
  keyword: string;
  category: string;
}

const SORTED_VOCAB: VocabEntry[] = [];
for (const [category, keywords] of Object.entries(VOCAB)) {
  for (const keyword of keywords) {
    SORTED_VOCAB.push({ keyword, category });
  }
}
SORTED_VOCAB.sort((a, b) => b.keyword.length - a.keyword.length);

// Word-boundary regex cache to avoid recreating for each prompt
const WORD_REGEX_CACHE = new Map<string, RegExp>();

function matchesWord(text: string, word: string): boolean {
  let regex = WORD_REGEX_CACHE.get(word);
  if (!regex) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`\\b${escaped}\\b`, 'i');
    WORD_REGEX_CACHE.set(word, regex);
  }
  return regex.test(text);
}

export function extractKeywords(text: string): VocabEntry[] {
  const found: VocabEntry[] = [];
  const seen = new Set<string>();

  for (const entry of SORTED_VOCAB) {
    const key = `${entry.category}::${entry.keyword}`;
    if (!seen.has(key) && matchesWord(text, entry.keyword)) {
      found.push(entry);
      seen.add(key);
    }
  }

  return found;
}

export interface KeywordStat {
  keyword: string;
  category: string;
  count: number;
}

export function aggregateKeywords(prompts: string[]): KeywordStat[] {
  const counts = new Map<string, KeywordStat>();

  for (const prompt of prompts) {
    const keywords = extractKeywords(prompt);
    for (const { keyword, category } of keywords) {
      const key = `${category}::${keyword}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        counts.set(key, { keyword, category, count: 1 });
      }
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

export async function trackKeywordsFromPrompt(promptContent: string) {
  const keywords = extractKeywords(promptContent);
  if (keywords.length === 0) return;

  // For local app, we can just upsert directly to style_keywords table
  // Since RPCs might not be available or needed for simple local logic

  for (const { keyword, category } of keywords) {
    const { data: existing } = await db
      .from('style_keywords')
      .select('count')
      .eq('keyword', keyword)
      .single();

    const count = (existing?.count || 0) + 1;

    await db.from('style_keywords').upsert({
      keyword,
      category,
      count
    }, { onConflict: 'keyword, category' });
  }
}

export async function rebuildAllKeywords() {
  // Fetch all prompts
  const { data: allPrompts } = await db
    .from('prompts')
    .select('id, content');

  if (!allPrompts || allPrompts.length === 0) return;

  // Fetch gallery-linked prompt IDs to filter for quality prompts
  const { data: galleryLinks } = await db
    .from('gallery_items')
    .select('prompt_id');

  const linkedIds = new Set(
    (galleryLinks ?? [])
      .map((g: { prompt_id: string | null }) => g.prompt_id)
      .filter(Boolean)
  );

  // If there are gallery-linked prompts, only use those. Otherwise fall back to all.
  const prompts = linkedIds.size > 0
    ? allPrompts.filter((p: { id: string }) => linkedIds.has(p.id))
    : allPrompts;

  // Clear existing
  await db.from('style_keywords').delete().gt('count', -1);

  const aggregated = aggregateKeywords(prompts.map((p: { content: string }) => p.content));

  const updates = aggregated.map(stat => ({
    keyword: stat.keyword,
    category: stat.category,
    count: stat.count
  }));

  if (updates.length > 0) {
    await db.from('style_keywords').upsert(updates, { onConflict: 'keyword, category' });
  }
}

export async function saveStyleProfile(
  analysis: StyleAnalysis,
  promptCount: number,
) {
  const { error } = await db.from('style_profiles').insert({
    profile: analysis.profile,
    signature: analysis.signature,
    themes: analysis.themes,
    techniques: analysis.techniques,
    suggestions: analysis.suggestions,
    prompt_count: promptCount,
  });
  if (error) throw error;
}

export interface StyleProfile {
  id: string;
  profile: string;
  signature: string;
  themes: string[];
  techniques: string[];
  suggestions: string[];
  prompt_count: number;
  created_at: string;
}

export async function getLatestProfile(): Promise<StyleProfile | null> {
  const { data } = await db
    .from('style_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getStyleHistory(): Promise<StyleProfile[]> {
  const { data } = await db
    .from('style_profiles')
    .select('*')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function getKeywordStats(): Promise<KeywordStat[]> {
  const { data } = await db
    .from('style_keywords')
    .select('keyword, category, count')
    .order('count', { ascending: false });
  return data ?? [];
}

export interface PromptForKeyword {
  id: string;
  content: string;
  title?: string;
  created_at: string;
  linked: boolean;
}

export async function getPromptsForKeyword(keyword: string): Promise<PromptForKeyword[]> {
  const { data: allPrompts } = await db
    .from('prompts')
    .select('id, content, title, created_at')
    .order('created_at', { ascending: false });

  if (!allPrompts) return [];

  // Fetch gallery links
  const { data: galleryLinks } = await db
    .from('gallery_items')
    .select('prompt_id');

  const linkedIds = new Set(
    (galleryLinks ?? [])
      .map((g: { prompt_id: string | null }) => g.prompt_id)
      .filter(Boolean)
  );

  // Filter prompts that contain the keyword (exact word boundary match)
  return allPrompts
    .filter((p: { content: string }) => matchesWord(p.content, keyword))
    .map((p: { id: string; content: string; title?: string; created_at: string }) => ({
      id: p.id,
      content: p.content.length > 80 ? p.content.substring(0, 80) + '...' : p.content,
      title: p.title,
      created_at: p.created_at,
      linked: linkedIds.has(p.id),
    }));
}

export interface TimelineEvent {
  type: 'prompt' | 'snapshot';
  id: string;
  date: string;
  label: string;
  detail?: string;
  snapshotData?: StyleProfile;
}

export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const [{ data: prompts }, { data: snapshots }] = await Promise.all([
    db.from('prompts').select('id, title, content, created_at').order('created_at', { ascending: true }),
    db.from('style_profiles').select('*').order('created_at', { ascending: true }),
  ]);

  const events: TimelineEvent[] = [];

  (prompts ?? []).forEach((p: { id: string; title?: string; content: string; created_at: string }) => {
    events.push({
      type: 'prompt',
      id: p.id,
      date: p.created_at,
      label: p.title || p.content.substring(0, 50) + (p.content.length > 50 ? '...' : ''),
    });
  });

  (snapshots ?? []).forEach((s: StyleProfile) => {
    events.push({
      type: 'snapshot',
      id: s.id,
      date: s.created_at,
      label: `Snapshot: "${s.signature}"`,
      detail: `${s.prompt_count} prompts analyzed`,
      snapshotData: s,
    });
  });

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return events;
}

export const CATEGORY_LABELS: Record<string, string> = {
  subject: 'Subject',
  style: 'Style',
  mood: 'Mood',
  lighting: 'Lighting',
  technique: 'Technique',
  setting: 'Setting',
  color: 'Color',
};

export const CATEGORY_COLORS: Record<string, string> = {
  subject: 'bg-blue-500',
  style: 'bg-teal-500',
  mood: 'bg-rose-500',
  lighting: 'bg-amber-500',
  technique: 'bg-cyan-500',
  setting: 'bg-emerald-500',
  color: 'bg-fuchsia-500',
};
