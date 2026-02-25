import { API_BASE_URL } from './constants';

export interface NCModel {
  id: number;
  name: string;
  description: string;
  art_rating: number;
  prompting_rating: number;
  realism_rating: number;
  typography_rating: number;
  cost_level: number;
  model_type: 'Image' | 'Edit' | 'Video';
}

export interface PromptAnalysis {
  hasPeople: boolean;
  hasFaces: boolean;
  hasTypography: boolean;
  hasRealism: boolean;
  hasArtistic: boolean;
  hasAnime: boolean;
  hasAbstract: boolean;
  isComplex: boolean;
  detectedKeywords: string[];
}

export interface ModelRecommendation {
  model: NCModel;
  score: number;
  reasons: string[];
}

// Keywords that indicate specific content types
const KEYWORD_PATTERNS = {
  people: ['person', 'people', 'human', 'man', 'woman', 'child', 'portrait', 'selfie', 'crowd', 'crowds', 'group'],
  faces: ['face', 'faces', 'portrait', 'portraits', 'headshot', 'selfie', 'person', 'people', 'human face', 'close-up', 'profile'],
  typography: ['text', 'typography', 'letter', 'letters', 'word', 'words', 'sign', 'logo', 'branding', 'font', 'type'],
  realism: ['photo', 'photograph', 'realistic', 'realism', 'real', 'photo-realistic', 'camera', 'dslr', 'portrait photo', 'landscape photo'],
  artistic: ['art', 'artistic', 'painting', 'painterly', 'illustration', 'draw', 'drawing', 'sketch', 'oil painting', 'watercolor', 'abstract art'],
  anime: ['anime', 'manga', 'cartoon', 'comic', 'animation', 'animated', 'japanese', 'stylized', 'chibi'],
  abstract: ['abstract', 'pattern', 'texture', 'geometric', 'minimalist', 'surreal', 'dreamlike', 'psychedelic'],
  video: ['video', 'animation', 'animated', 'motion', 'moving', 'gif', 'cinematic'],
  edit: ['edit', 'enhance', 'upscale', 'improve', 'retouch', 'color grade', 'filter'],
};

// Analyze prompt content to detect key features
export function analyzePromptContent(prompt: string): PromptAnalysis {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  
  const detectedKeywords: string[] = [];
  
  // Check for keyword matches
  for (const keywords of Object.values(KEYWORD_PATTERNS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }
  }

  return {
    hasPeople: detectedKeywords.some(k => KEYWORD_PATTERNS.people.includes(k)),
    hasFaces: detectedKeywords.some(k => KEYWORD_PATTERNS.faces.includes(k)),
    hasTypography: detectedKeywords.some(k => KEYWORD_PATTERNS.typography.includes(k)),
    hasRealism: detectedKeywords.some(k => KEYWORD_PATTERNS.realism.includes(k)),
    hasArtistic: detectedKeywords.some(k => KEYWORD_PATTERNS.artistic.includes(k)),
    hasAnime: detectedKeywords.some(k => KEYWORD_PATTERNS.anime.includes(k)),
    hasAbstract: detectedKeywords.some(k => KEYWORD_PATTERNS.abstract.includes(k)),
    isComplex: words.length > 15,
    detectedKeywords: [...new Set(detectedKeywords)].slice(0, 5)
  };
}

// Score a model based on prompt analysis
function scoreModel(model: NCModel, analysis: PromptAnalysis, prompt: string): { score: number; reasons: string[] } {
  const lower = prompt.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Typography - prioritize typography_rating
  if (analysis.hasTypography) {
    if (model.typography_rating >= 4) {
      score += 40;
      reasons.push('Excellent typography support');
    } else if (model.typography_rating >= 3) {
      score += 20;
      reasons.push('Good typography support');
    }
  }

  // Realism - prioritize realism_rating
  if (analysis.hasRealism) {
    if (model.realism_rating >= 4) {
      score += 35;
      reasons.push('Strong photorealistic capabilities');
    } else if (model.realism_rating >= 3) {
      score += 15;
      reasons.push('Good realism');
    }
  }

  // Faces/People - boost realism and art
  if (analysis.hasFaces || analysis.hasPeople) {
    if (model.realism_rating >= 4) {
      score += 25;
      reasons.push('Good for portraits');
    }
    if (model.art_rating >= 4) {
      score += 15;
      reasons.push('Artistic portraits');
    }
  }

  // Artistic - prioritize art_rating
  if (analysis.hasArtistic) {
    if (model.art_rating >= 4) {
      score += 35;
      reasons.push('High artistic quality');
    } else if (model.art_rating >= 3) {
      score += 15;
      reasons.push('Good artistic capabilities');
    }
  }

  // Anime - check model name/description for anime-related terms
  if (analysis.hasAnime) {
    const modelDesc = `${model.name} ${model.description}`.toLowerCase();
    if (modelDesc.includes('anime') || modelDesc.includes('manga') || modelDesc.includes('illustrate')) {
      score += 40;
      reasons.push('Specialized for anime/manga');
    } else if (model.art_rating >= 4) {
      score += 20;
      reasons.push('Artistic style suitable');
    }
  }

  // Abstract - generally good with artistic models
  if (analysis.hasAbstract && model.art_rating >= 4) {
    score += 20;
    reasons.push('Good for abstract/creative');
  }

  // Video content
  if (model.model_type === 'Video') {
    if (analysis.hasAbstract || lower.includes('motion') || lower.includes('moving')) {
      score += 30;
      reasons.push('Video model for motion');
    }
  }

  // Edit content
  if (model.model_type === 'Edit') {
    if (lower.includes('edit') || lower.includes('enhance') || lower.includes('improve')) {
      score += 30;
      reasons.push('Edit model for enhancements');
    }
  }

  // Complex prompts - prefer high prompting_rating
  if (analysis.isComplex) {
    score += model.prompting_rating * 3;
    if (model.prompting_rating >= 4) {
      reasons.push('Handles complex prompts well');
    }
  }

  // Base score from overall ratings
  score += (model.art_rating + model.prompting_rating + model.realism_rating + model.typography_rating) / 2;

  // Cost consideration (prefer mid-range unless specified otherwise)
  // Lower cost preference for simple prompts
  if (!analysis.isComplex && model.cost_level <= 2) {
    score += 5;
    reasons.push('Cost-effective for this prompt');
  }

  return { score, reasons: reasons.length > 0 ? reasons : ['General-purpose model'] };
}

// Fetch NC models from API
let cachedModels: NCModel[] | null = null;

export async function fetchNCModels(forceRefresh = false): Promise<NCModel[]> {
  if (cachedModels && !forceRefresh) {
    return cachedModels;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/nc-models`);
    if (!res.ok) {
      throw new Error('Failed to fetch NC models');
    }
    cachedModels = await res.json();
    return cachedModels || [];
  } catch (error) {
    console.error('Error fetching NC models:', error);
    return [];
  }
}

// Main recommendation function
export async function recommendNCModel(prompt: string): Promise<ModelRecommendation | null> {
  const models = await fetchNCModels();
  if (models.length === 0) {
    return null;
  }

  const analysis = analyzePromptContent(prompt);

  // Score all models
  const scoredModels = models.map(model => {
    const { score, reasons } = scoreModel(model, analysis, prompt);
    return { model, score, reasons };
  });

  // Sort by score descending
  scoredModels.sort((a, b) => b.score - a.score);

  // Return top recommendation
  const top = scoredModels[0];
  if (top && top.score > 0) {
    return top;
  }

  // Fallback to highest-rated general model
  const fallback = models
    .filter(m => m.model_type === 'Image')
    .sort((a, b) => (b.art_rating + b.prompting_rating) - (a.art_rating + a.prompting_rating))[0];

  if (fallback) {
    return {
      model: fallback,
      score: 10,
      reasons: ['Recommended general-purpose model']
    };
  }

  return null;
}

// Get multiple recommendations
export async function recommendNCModels(prompt: string, count: number = 3): Promise<ModelRecommendation[]> {
  const models = await fetchNCModels();
  if (models.length === 0) {
    return [];
  }

  const analysis = analyzePromptContent(prompt);

  // Score all models
  const scoredModels = models.map(model => {
    const { score, reasons } = scoreModel(model, analysis, prompt);
    return { model, score, reasons };
  });

  // Sort by score descending and take top N
  scoredModels.sort((a, b) => b.score - a.score);

  return scoredModels.slice(0, count).filter(s => s.score > 0);
}

// Clear cache (useful when models are updated)
export function clearNCModelCache(): void {
  cachedModels = null;
}
