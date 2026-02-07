export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  styleTags: string[];
  creditCost: 'low' | 'medium' | 'high' | 'very high';
  qualityRating: number;
  speedRating: number;
  keywords: string[];
}

export const STYLE_FILTERS = [
  'photorealistic',
  'artistic',
  'anime',
  'abstract',
  'illustration',
  'cinematic',
  'fantasy',
  'painterly',
] as const;

export const CATEGORY_OPTIONS = [
  'landscape',
  'character',
  'portrait',
  'abstract',
  'architecture',
  'concept art',
  'illustration',
  'photography',
  'anime',
  'fantasy',
  'sci-fi',
  'nature',
  'general',
] as const;

export const MODELS: ModelInfo[] = [
  {
    id: 'sdxl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    description: 'The flagship model from Stability AI. Excellent all-rounder with strong composition, natural lighting, and detailed outputs at high resolution.',
    strengths: [
      'High resolution output (1024x1024 native)',
      'Strong natural lighting and composition',
      'Good prompt adherence',
      'Wide style range',
      'Great for landscapes and environments',
    ],
    weaknesses: [
      'Hands can still be inconsistent',
      'Text rendering is limited',
      'Higher credit cost than SD 1.5',
    ],
    bestFor: ['landscape', 'portrait', 'concept art', 'photography', 'fantasy'],
    styleTags: ['photorealistic', 'artistic', 'cinematic', 'fantasy', 'painterly'],
    creditCost: 'medium',
    qualityRating: 4,
    speedRating: 3,
    keywords: [
      'landscape', 'portrait', 'cinematic', 'detailed', 'realistic', 'natural',
      'forest', 'mountain', 'ocean', 'sunset', 'golden hour', 'dramatic',
      'environment', 'scene', 'composition', 'lighting', 'atmospheric',
      'dreamy', 'soft', 'ethereal', 'fantasy', 'epic',
    ],
  },
  {
    id: 'sd3',
    name: 'Stable Diffusion 3',
    provider: 'Stability AI',
    description: 'Latest generation model with improved text rendering, better prompt understanding, and enhanced photorealism. Uses MMDiT architecture.',
    strengths: [
      'Best-in-class text rendering',
      'Excellent prompt understanding',
      'Superior photorealism',
      'Better anatomy and hands',
      'Advanced composition control',
    ],
    weaknesses: [
      'Highest credit cost',
      'Slower generation times',
      'Can over-smooth artistic styles',
    ],
    bestFor: ['portrait', 'photography', 'concept art', 'architecture'],
    styleTags: ['photorealistic', 'cinematic', 'artistic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: [
      'photorealistic', 'photo', 'realistic', 'text', 'typography', 'sign',
      'person', 'face', 'portrait', 'hands', 'anatomy', 'human',
      'professional', 'high quality', 'detailed', 'sharp', 'crisp',
      'architecture', 'building', 'interior', 'product',
    ],
  },
  {
    id: 'flux',
    name: 'Flux',
    provider: 'Black Forest Labs',
    description: 'High-quality open model from ex-Stability AI researchers. Excels at creative compositions and has strong aesthetic appeal.',
    strengths: [
      'Excellent aesthetic quality',
      'Strong creative compositions',
      'Good text rendering',
      'Fast generation',
      'Handles complex scenes well',
    ],
    weaknesses: [
      'Newer model, less community knowledge',
      'Can be unpredictable with niche styles',
    ],
    bestFor: ['concept art', 'illustration', 'portrait', 'fantasy'],
    styleTags: ['artistic', 'cinematic', 'illustration', 'fantasy'],
    creditCost: 'high',
    qualityRating: 5,
    speedRating: 3,
    keywords: [
      'creative', 'artistic', 'beautiful', 'aesthetic', 'concept',
      'illustration', 'fantasy', 'character', 'scene', 'composition',
      'vibrant', 'colorful', 'detailed', 'intricate', 'stylized',
      'digital art', 'concept art',
    ],
  },
  {
    id: 'sd15',
    name: 'Stable Diffusion 1.5',
    provider: 'Stability AI',
    description: 'The classic workhorse model. Lower resolution but extremely fast and well-understood. Massive ecosystem of fine-tuned variants.',
    strengths: [
      'Very fast generation',
      'Lowest credit cost',
      'Huge community and fine-tune ecosystem',
      'Predictable and well-documented',
      'Great for rapid iteration',
    ],
    weaknesses: [
      'Lower native resolution (512x512)',
      'Less detail than newer models',
      'Weaker anatomy',
      'Limited prompt understanding',
    ],
    bestFor: ['illustration', 'anime', 'abstract', 'general'],
    styleTags: ['artistic', 'anime', 'illustration', 'abstract'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 5,
    keywords: [
      'quick', 'fast', 'simple', 'basic', 'anime', 'cartoon', 'sketch',
      'iteration', 'test', 'draft', 'abstract', 'pattern', 'texture',
      'style transfer', 'artistic',
    ],
  },
  {
    id: 'dalle3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'OpenAI\'s latest image generation model. Exceptional at understanding complex and nuanced prompts with creative interpretation.',
    strengths: [
      'Best prompt understanding overall',
      'Excellent text rendering',
      'Creative interpretation of concepts',
      'Great with complex scenes',
      'Consistent quality',
    ],
    weaknesses: [
      'Very high credit cost',
      'Less control over exact style',
      'Safety filters can be restrictive',
      'No negative prompts',
    ],
    bestFor: ['illustration', 'concept art', 'character', 'general'],
    styleTags: ['illustration', 'artistic', 'cinematic', 'fantasy'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 3,
    keywords: [
      'complex', 'scene', 'story', 'narrative', 'character', 'illustration',
      'creative', 'whimsical', 'imaginative', 'text', 'sign', 'poster',
      'infographic', 'diagram', 'concept', 'idea',
    ],
  },
  {
    id: 'dalle2',
    name: 'DALL-E 2',
    provider: 'OpenAI',
    description: 'Previous generation OpenAI model. Still useful for simpler compositions and has a distinctive clean aesthetic.',
    strengths: [
      'Clean, distinctive aesthetic',
      'Good for simple compositions',
      'Lower cost than DALL-E 3',
      'Reliable and consistent',
    ],
    weaknesses: [
      'Limited detail and resolution',
      'Weaker prompt understanding',
      'Less creative than DALL-E 3',
      'Outdated compared to newer models',
    ],
    bestFor: ['illustration', 'abstract', 'general'],
    styleTags: ['illustration', 'abstract', 'artistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: [
      'simple', 'clean', 'minimal', 'illustration', 'icon', 'logo',
      'basic', 'flat', 'graphic',
    ],
  },
  {
    id: 'artistic-v3',
    name: 'NightCafe Artistic',
    provider: 'NightCafe',
    description: 'NightCafe\'s own artistic model fine-tuned for creative and painterly outputs. Great for artistic transformations.',
    strengths: [
      'Beautiful painterly effects',
      'Strong artistic style transfer',
      'Good for moody atmospheres',
      'Unique NightCafe aesthetic',
    ],
    weaknesses: [
      'Not ideal for photorealism',
      'Limited control over fine details',
      'Can over-stylize subjects',
    ],
    bestFor: ['abstract', 'landscape', 'fantasy'],
    styleTags: ['painterly', 'artistic', 'abstract', 'fantasy'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 4,
    keywords: [
      'painting', 'oil', 'watercolor', 'artistic', 'impressionist',
      'van gogh', 'monet', 'painterly', 'brush', 'canvas', 'abstract',
      'dreamy', 'surreal', 'psychedelic', 'colorful', 'mood', 'atmosphere',
    ],
  },
  {
    id: 'realvisxl',
    name: 'RealVisXL',
    provider: 'Community',
    description: 'Community fine-tune of SDXL focused on photorealism. Produces stunningly realistic photos with proper skin textures and lighting.',
    strengths: [
      'Extremely photorealistic output',
      'Natural skin textures and tones',
      'Accurate lighting simulation',
      'Great for stock photo style',
    ],
    weaknesses: [
      'Limited to photorealistic style',
      'Can struggle with fantasy/artistic styles',
      'Sometimes too realistic for stylized needs',
    ],
    bestFor: ['portrait', 'photography', 'nature'],
    styleTags: ['photorealistic'],
    creditCost: 'medium',
    qualityRating: 4,
    speedRating: 3,
    keywords: [
      'photo', 'realistic', 'real', 'photograph', 'stock photo', 'portrait',
      'person', 'face', 'skin', 'natural', 'documentary', 'editorial',
      'product', 'food', 'nature', 'wildlife',
    ],
  },
  {
    id: 'dreamshaper-xl',
    name: 'DreamShaper XL',
    provider: 'Community',
    description: 'Versatile community model balancing realism and artistic style. Excellent for fantasy art, characters, and dreamy aesthetics.',
    strengths: [
      'Great balance of realism and style',
      'Excellent for fantasy and characters',
      'Beautiful dreamy aesthetics',
      'Good at anime-influenced art',
      'Versatile across many styles',
    ],
    weaknesses: [
      'Not the best for pure photorealism',
      'Can be inconsistent with complex prompts',
    ],
    bestFor: ['fantasy', 'character', 'illustration', 'anime', 'concept art'],
    styleTags: ['fantasy', 'artistic', 'anime', 'illustration', 'cinematic'],
    creditCost: 'medium',
    qualityRating: 4,
    speedRating: 3,
    keywords: [
      'dream', 'dreamy', 'fantasy', 'character', 'anime', 'manga',
      'elf', 'warrior', 'magical', 'enchanted', 'fairy', 'mythical',
      'dragon', 'creature', 'hero', 'villain', 'boy', 'girl', 'deer',
      'animal', 'companion', 'adventure', 'story',
    ],
  },
  {
    id: 'juggernaut-xl',
    name: 'Juggernaut XL',
    provider: 'Community',
    description: 'Powerful all-purpose SDXL fine-tune known for high detail, strong composition, and cinematic quality across diverse subjects.',
    strengths: [
      'Exceptional detail rendering',
      'Strong cinematic compositions',
      'Great with complex scenes',
      'Good anatomy and hands',
      'Versatile style range',
    ],
    weaknesses: [
      'Higher VRAM requirements',
      'Can be overly detailed for simple subjects',
    ],
    bestFor: ['portrait', 'landscape', 'concept art', 'photography', 'sci-fi'],
    styleTags: ['photorealistic', 'cinematic', 'artistic', 'fantasy'],
    creditCost: 'medium',
    qualityRating: 5,
    speedRating: 3,
    keywords: [
      'cinematic', 'epic', 'detailed', 'dramatic', 'movie', 'film',
      'scene', 'landscape', 'cityscape', 'architecture', 'sci-fi',
      'cyberpunk', 'futuristic', 'war', 'battle', 'action', 'intense',
      'dark', 'moody', 'atmospheric', 'volumetric',
    ],
  },
];

export function analyzePrompt(prompt: string): { model: ModelInfo; score: number; reasons: string[] }[] {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);

  return MODELS.map((model) => {
    let score = 0;
    const reasons: string[] = [];

    const keywordMatches = model.keywords.filter((kw) => lower.includes(kw));
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 10;
      reasons.push(`Matches keywords: ${keywordMatches.slice(0, 4).join(', ')}`);
    }

    if (lower.includes('dreamy') || lower.includes('ethereal') || lower.includes('soft')) {
      if (model.id === 'dreamshaper-xl' || model.id === 'artistic-v3') {
        score += 25;
        reasons.push('Excels at dreamy/ethereal aesthetics');
      }
    }

    if (lower.includes('photo') || lower.includes('realistic') || lower.includes('real')) {
      if (model.styleTags.includes('photorealistic')) {
        score += 20;
        reasons.push('Strong photorealistic capabilities');
      }
    }

    if (lower.includes('anime') || lower.includes('manga')) {
      if (model.styleTags.includes('anime')) {
        score += 25;
        reasons.push('Trained for anime/manga styles');
      }
    }

    if (lower.includes('painting') || lower.includes('oil') || lower.includes('watercolor') || lower.includes('impressionist')) {
      if (model.styleTags.includes('painterly')) {
        score += 25;
        reasons.push('Specialized in painterly effects');
      }
    }

    if (lower.includes('landscape') || lower.includes('forest') || lower.includes('mountain') || lower.includes('ocean')) {
      if (model.bestFor.includes('landscape')) {
        score += 15;
        reasons.push('Well-suited for landscape compositions');
      }
    }

    if (lower.includes('character') || lower.includes('person') || lower.includes('portrait') || lower.includes('boy') || lower.includes('girl')) {
      if (model.bestFor.includes('character') || model.bestFor.includes('portrait')) {
        score += 15;
        reasons.push('Good at character/portrait generation');
      }
    }

    if (lower.includes('text') || lower.includes('sign') || lower.includes('typography')) {
      if (model.id === 'sd3' || model.id === 'dalle3' || model.id === 'flux') {
        score += 30;
        reasons.push('Capable of rendering text in images');
      }
    }

    const wordCount = words.length;
    if (wordCount > 30) {
      if (model.id === 'dalle3') {
        score += 15;
        reasons.push('Handles complex, detailed prompts well');
      }
    }

    score += model.qualityRating * 2;

    return { model, score, reasons: reasons.length > 0 ? reasons : ['General-purpose model'] };
  })
    .sort((a, b) => b.score - a.score);
}
