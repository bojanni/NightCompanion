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
  // === OpenAI GPT Image Models ===
  {
    id: 'gpt15-high',
    name: 'GPT1.5 High',
    provider: 'OpenAI',
    description: 'The latest model from OpenAI on high quality setting. Supports prompt-to-edit and image generation.',
    strengths: ['Excellent prompt understanding', 'Great text rendering', 'High quality output', 'Supports editing'],
    weaknesses: ['Very high credit cost', 'Slower generation'],
    bestFor: ['portrait', 'illustration', 'concept art', 'photography'],
    styleTags: ['photorealistic', 'artistic', 'cinematic', 'illustration'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['complex', 'detailed', 'text', 'typography', 'sign', 'creative', 'professional', 'portrait', 'scene', 'character'],
  },
  {
    id: 'gpt15-medium',
    name: 'GPT1.5 Medium',
    provider: 'OpenAI',
    description: 'The latest model from OpenAI on medium quality setting. Supports prompt-to-edit and image generation.',
    strengths: ['Good prompt understanding', 'Decent text rendering', 'Good balance of quality and cost'],
    weaknesses: ['Lower quality than High variant'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['photorealistic', 'artistic', 'cinematic', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['creative', 'balanced', 'text', 'sign', 'portrait', 'character', 'scene'],
  },
  {
    id: 'gpt15-low',
    name: 'GPT1.5 Low',
    provider: 'OpenAI',
    description: 'GPT Image 1.5 from OpenAI on low quality setting. Fast & cheap, best for prototyping.',
    strengths: ['Very fast', 'Low cost', 'Good for prototyping'],
    weaknesses: ['Lower quality', 'Less detail'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 5,
    keywords: ['quick', 'fast', 'draft', 'prototype', 'test', 'simple'],
  },
  {
    id: 'gpt1-high',
    name: 'GPT1 High',
    provider: 'OpenAI',
    description: 'The latest flagship image model from OpenAI on high quality setting.',
    strengths: ['Excellent prompt understanding', 'Creative interpretation', 'High quality'],
    weaknesses: ['Very high credit cost'],
    bestFor: ['illustration', 'concept art', 'character', 'general'],
    styleTags: ['illustration', 'artistic', 'cinematic', 'fantasy'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['complex', 'scene', 'story', 'narrative', 'character', 'creative', 'detailed', 'professional'],
  },
  {
    id: 'gpt1-medium',
    name: 'GPT1 Medium',
    provider: 'OpenAI',
    description: 'The latest flagship image model from OpenAI on medium quality setting.',
    strengths: ['Good prompt understanding', 'Creative interpretation', 'Balanced cost'],
    weaknesses: ['Lower quality than High variant'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['illustration', 'artistic', 'cinematic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['creative', 'balanced', 'scene', 'character', 'concept'],
  },
  {
    id: 'gpt1-low',
    name: 'GPT1 Low',
    provider: 'OpenAI',
    description: 'GPT Image 1 from OpenAI on low quality setting. Fast & cheap, best for prototyping.',
    strengths: ['Very fast', 'Low cost', 'Good for testing'],
    weaknesses: ['Lower quality'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 5,
    keywords: ['quick', 'fast', 'draft', 'prototype', 'test'],
  },
  {
    id: 'dalle3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'An image model from OpenAI. Great for creative artistic prompts.',
    strengths: ['Best prompt understanding', 'Excellent text rendering', 'Creative interpretation', 'Consistent quality'],
    weaknesses: ['Very high credit cost', 'Safety filters can be restrictive', 'No negative prompts'],
    bestFor: ['illustration', 'concept art', 'character', 'general'],
    styleTags: ['illustration', 'artistic', 'cinematic', 'fantasy'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 3,
    keywords: ['complex', 'scene', 'story', 'narrative', 'character', 'illustration', 'creative', 'whimsical', 'text', 'sign', 'poster', 'infographic'],
  },

  // === Google Imagen Models ===
  {
    id: 'imagen-4-ultra',
    name: 'Google Imagen 4.0 Ultra',
    provider: 'Google',
    description: 'A larger version of Imagen v4, Google\'s latest image model.',
    strengths: ['Highest quality from Google', 'Great prompt adherence', 'Excellent typography', 'Photorealistic'],
    weaknesses: ['Very high credit cost', 'Slower generation'],
    bestFor: ['photography', 'portrait', 'landscape', 'architecture'],
    styleTags: ['photorealistic', 'cinematic', 'artistic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['photorealistic', 'photo', 'realistic', 'text', 'typography', 'professional', 'detailed', 'sharp', 'landscape', 'portrait'],
  },
  {
    id: 'imagen-4',
    name: 'Google Imagen 4.0',
    provider: 'Google',
    description: 'Google\'s image model. Great at prompt adherence and typography.',
    strengths: ['Great prompt adherence', 'Good typography', 'Balanced quality and cost'],
    weaknesses: ['High credit cost'],
    bestFor: ['photography', 'portrait', 'general'],
    styleTags: ['photorealistic', 'cinematic', 'artistic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['photorealistic', 'photo', 'realistic', 'text', 'typography', 'professional', 'portrait'],
  },
  {
    id: 'imagen-4-fast',
    name: 'Google Imagen 4.0 Fast',
    provider: 'Google',
    description: 'A faster, cheaper version of Imagen v4, Google\'s latest image model.',
    strengths: ['Fast generation', 'Lower cost', 'Good quality for speed'],
    weaknesses: ['Lower quality than Ultra/Standard'],
    bestFor: ['general', 'photography', 'portrait'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['fast', 'quick', 'photo', 'realistic', 'portrait', 'balanced'],
  },
  {
    id: 'imagen-3',
    name: 'Google Imagen 3.0',
    provider: 'Google',
    description: 'Google\'s image model. Great at prompt adherence and typography.',
    strengths: ['Good prompt adherence', 'Typography support', 'Reliable quality'],
    weaknesses: ['Older generation', 'High cost'],
    bestFor: ['photography', 'portrait', 'general'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['photo', 'realistic', 'text', 'typography', 'portrait', 'professional'],
  },
  {
    id: 'imagen-3-fast',
    name: 'Google Imagen 3.0 Fast',
    provider: 'Google',
    description: 'A faster, cheaper version of Imagen v3, Google\'s image model.',
    strengths: ['Faster generation', 'Lower cost than full Imagen 3'],
    weaknesses: ['Lower quality than full version'],
    bestFor: ['general', 'photography'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['fast', 'quick', 'photo', 'realistic', 'balanced'],
  },

  // === Black Forest Labs Flux Models ===
  {
    id: 'flux-pro-ultra',
    name: 'Flux PRO v1.1 Ultra',
    provider: 'Black Forest Labs',
    description: 'An ultra-high resolution version of Flux, by Black Forest Labs.',
    strengths: ['Ultra-high resolution', 'Excellent detail', 'Strong aesthetics', 'Good text rendering'],
    weaknesses: ['Very high credit cost', 'Slower generation'],
    bestFor: ['concept art', 'illustration', 'portrait', 'landscape'],
    styleTags: ['artistic', 'cinematic', 'illustration', 'photorealistic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['ultra', 'high resolution', 'detailed', 'creative', 'artistic', 'beautiful', 'concept', 'illustration'],
  },
  {
    id: 'flux-pro',
    name: 'Flux PRO v1.1',
    provider: 'Black Forest Labs',
    description: 'The full-power version of Flux by Black Forest Labs.',
    strengths: ['Excellent aesthetic quality', 'Strong creative compositions', 'Good text rendering'],
    weaknesses: ['High credit cost'],
    bestFor: ['concept art', 'illustration', 'portrait', 'fantasy'],
    styleTags: ['artistic', 'cinematic', 'illustration', 'fantasy'],
    creditCost: 'high',
    qualityRating: 5,
    speedRating: 3,
    keywords: ['creative', 'artistic', 'beautiful', 'aesthetic', 'concept', 'illustration', 'fantasy', 'character', 'vibrant', 'colorful'],
  },
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'Black Forest Labs',
    description: 'Flux 2 with improved image quality and good at photorealism.',
    strengths: ['Improved quality over Flux 1', 'Good photorealism', 'Strong compositions'],
    weaknesses: ['High credit cost'],
    bestFor: ['photography', 'portrait', 'concept art', 'illustration'],
    styleTags: ['photorealistic', 'artistic', 'cinematic'],
    creditCost: 'high',
    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealistic', 'photo', 'realistic', 'detailed', 'creative', 'artistic', 'portrait'],
  },
  {
    id: 'flux-2-flex',
    name: 'Flux 2 Flex',
    provider: 'Black Forest Labs',
    description: 'Flux 2, better at typography and designs.',
    strengths: ['Better typography', 'Good for designs', 'Flexible use'],
    weaknesses: ['Very high credit cost'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'very high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['typography', 'text', 'design', 'sign', 'creative', 'flexible'],
  },
  {
    id: 'flux-2-max',
    name: 'Flux 2 Max',
    provider: 'Black Forest Labs',
    description: 'Grounded generation with real-world context. Maximum quality for complex workflows.',
    strengths: ['Maximum quality', 'Real-world grounding', 'Complex scene handling'],
    weaknesses: ['Very high credit cost', 'Slowest Flux variant'],
    bestFor: ['photography', 'architecture', 'concept art', 'portrait'],
    styleTags: ['photorealistic', 'cinematic', 'artistic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['maximum', 'quality', 'grounded', 'realistic', 'complex', 'detailed', 'professional'],
  },
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    provider: 'Black Forest Labs',
    description: 'A cheaper, faster, but slightly less powerful version of Flux.',
    strengths: ['Very fast generation', 'Low cost', 'Good for iteration'],
    weaknesses: ['Lower quality than Flux Pro', 'Less detail'],
    bestFor: ['general', 'illustration', 'concept art'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 5,
    keywords: ['fast', 'quick', 'cheap', 'iteration', 'draft', 'prototype', 'artistic'],
  },
  {
    id: 'flux-krea',
    name: 'Flux Krea',
    provider: 'Krea / Black Forest Labs',
    description: 'Creates realistic images, with a focus on more correct human anatomy.',
    strengths: ['Better human anatomy', 'Realistic output', 'Good character generation'],
    weaknesses: ['High credit cost'],
    bestFor: ['portrait', 'character', 'photography'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['anatomy', 'human', 'person', 'portrait', 'character', 'realistic', 'body', 'face', 'hands'],
  },
  {
    id: 'flux-kontext-pro',
    name: 'Flux Kontext Pro',
    provider: 'Black Forest Labs',
    description: 'Excellent at editing images using natural language prompts.',
    strengths: ['Great for image editing', 'Natural language control', 'Good understanding'],
    weaknesses: ['High credit cost', 'Best used for editing rather than generation'],
    bestFor: ['general', 'portrait', 'concept art'],
    styleTags: ['photorealistic', 'artistic', 'cinematic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['edit', 'modify', 'change', 'adjust', 'natural language', 'kontext'],
  },
  {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    provider: 'Black Forest Labs',
    description: 'For editing images using natural language prompts.',
    strengths: ['Image editing via prompts', 'Good understanding'],
    weaknesses: ['Best used for editing'],
    bestFor: ['general', 'portrait'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'medium',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['edit', 'modify', 'change', 'kontext', 'natural language'],
  },
  {
    id: 'flux-kontext-max',
    name: 'Flux Kontext Max',
    provider: 'Black Forest Labs',
    description: 'A more powerful version of Flux Kontext, for editing images via text prompts.',
    strengths: ['Most powerful Kontext variant', 'Best editing quality'],
    weaknesses: ['Very high credit cost'],
    bestFor: ['general', 'portrait', 'concept art'],
    styleTags: ['photorealistic', 'artistic', 'cinematic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 2,
    keywords: ['edit', 'modify', 'change', 'max', 'kontext', 'powerful'],
  },
  {
    id: 'flux-kontext-dev',
    name: 'Flux Kontext Dev',
    provider: 'Black Forest Labs',
    description: 'Cheaper & Faster version of Kontext, still great at editing images using prompts.',
    strengths: ['Cheaper than Pro', 'Good editing capabilities'],
    weaknesses: ['Lower quality than Pro variant'],
    bestFor: ['general', 'portrait'],
    styleTags: ['artistic', 'photorealistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['edit', 'modify', 'cheap', 'fast', 'kontext', 'dev'],
  },

  // === Ideogram Models ===
  {
    id: 'ideogram-v3-quality',
    name: 'Ideogram V3 Quality',
    provider: 'Ideogram',
    description: 'The latest & best model from Ideogram.',
    strengths: ['Excellent typography', 'Great prompt adherence', 'High quality output'],
    weaknesses: ['Very high credit cost'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['artistic', 'illustration', 'cinematic'],
    creditCost: 'very high',
    qualityRating: 5,
    speedRating: 3,
    keywords: ['text', 'typography', 'sign', 'poster', 'logo', 'creative', 'artistic', 'detailed'],
  },
  {
    id: 'ideogram-v3',
    name: 'Ideogram V3',
    provider: 'Ideogram',
    description: 'The latest model from Ideogram.',
    strengths: ['Good typography', 'Fast generation', 'Balanced quality'],
    weaknesses: ['High credit cost'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['text', 'typography', 'sign', 'creative', 'artistic'],
  },
  {
    id: 'ideogram-v3-turbo',
    name: 'Ideogram V3 Turbo',
    provider: 'Ideogram',
    description: 'The latest turbo model from Ideogram.',
    strengths: ['Fast generation', 'Good typography', 'Lower cost'],
    weaknesses: ['Lower quality than V3 Quality'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['fast', 'turbo', 'text', 'typography', 'quick'],
  },
  {
    id: 'ideogram-2',
    name: 'Ideogram 2.0',
    provider: 'Ideogram',
    description: 'Created by ex Googlers. Great at prompt adherence and generating text in images.',
    strengths: ['Excellent text in images', 'Great prompt adherence'],
    weaknesses: ['Older generation'],
    bestFor: ['illustration', 'general'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['text', 'typography', 'sign', 'poster', 'prompt adherence'],
  },
  {
    id: 'ideogram-2-turbo',
    name: 'Ideogram 2.0 Turbo',
    provider: 'Ideogram',
    description: 'A faster, cheaper version of Ideogram 2.0. Great for typography.',
    strengths: ['Faster generation', 'Good typography', 'Lower cost'],
    weaknesses: ['Lower quality than 2.0 standard'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['fast', 'turbo', 'text', 'typography'],
  },
  {
    id: 'ideogram-2a',
    name: 'Ideogram 2a',
    provider: 'Ideogram',
    description: 'Created by ex Googlers. Affordable prompt adherence and typography.',
    strengths: ['Affordable', 'Good typography'],
    weaknesses: ['Lower quality than V3'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 3,
    keywords: ['text', 'typography', 'affordable', 'sign'],
  },
  {
    id: 'ideogram-2a-turbo',
    name: 'Ideogram 2a Turbo',
    provider: 'Ideogram',
    description: 'A faster, cheaper version of Ideogram 2a.',
    strengths: ['Very fast', 'Cheap', 'Decent typography'],
    weaknesses: ['Lower quality'],
    bestFor: ['general'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'low',
    qualityRating: 2,
    speedRating: 5,
    keywords: ['fast', 'cheap', 'turbo', 'text', 'typography', 'draft'],
  },
  {
    id: 'ideogram-1',
    name: 'Ideogram 1.0',
    provider: 'Ideogram',
    description: 'The first model from Ideogram. Good at typography.',
    strengths: ['Good typography', 'Proven model'],
    weaknesses: ['Older generation', 'Less detailed'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 3,
    keywords: ['text', 'typography', 'sign', 'classic'],
  },
  {
    id: 'ideogram-1-turbo',
    name: 'Ideogram 1.0 Turbo',
    provider: 'Ideogram',
    description: 'A faster and cheaper version of Ideogram 1.0.',
    strengths: ['Fast', 'Cheap'],
    weaknesses: ['Lowest quality Ideogram'],
    bestFor: ['general'],
    styleTags: ['artistic'],
    creditCost: 'low',
    qualityRating: 2,
    speedRating: 5,
    keywords: ['fast', 'cheap', 'turbo', 'text', 'draft'],
  },

  // === Qwen Image Models ===
  {
    id: 'qwen-2512',
    name: 'Qwen Image 2512',
    provider: 'Alibaba',
    description: 'Qwen\'s latest update with major realism improvements. Photorealistic humans without artifacts.',
    strengths: ['Excellent photorealism', 'Great human anatomy', 'Latest improvements'],
    weaknesses: ['High credit cost'],
    bestFor: ['portrait', 'photography', 'character'],
    styleTags: ['photorealistic', 'artistic', 'cinematic'],
    creditCost: 'high',
    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealistic', 'human', 'person', 'portrait', 'realistic', 'anatomy', 'face', 'character'],
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image',
    provider: 'Alibaba',
    description: 'A model from Alibaba that excels at typography.',
    strengths: ['Good typography', 'Strong creative output'],
    weaknesses: ['High credit cost'],
    bestFor: ['illustration', 'general', 'portrait'],
    styleTags: ['artistic', 'photorealistic', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['text', 'typography', 'creative', 'artistic', 'portrait'],
  },
  {
    id: 'qwen-image-sd',
    name: 'Qwen Image SD',
    provider: 'Alibaba',
    description: 'A cheaper and lower resolution version of Qwen Image.',
    strengths: ['Lower cost', 'Good general quality'],
    weaknesses: ['Lower resolution', 'Less detail'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'photorealistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 4,
    keywords: ['cheap', 'balanced', 'artistic', 'general'],
  },
  {
    id: 'qwen-edit-2511',
    name: 'Qwen Image Edit 2511',
    provider: 'Alibaba',
    description: 'Preserves people and keeps textures looking great no matter what you change. Easily modify images.',
    strengths: ['Great at image editing', 'Preserves textures', 'Good at people'],
    weaknesses: ['Best for editing, not generation'],
    bestFor: ['portrait', 'photography', 'general'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['edit', 'modify', 'change', 'preserve', 'texture', 'person', 'portrait'],
  },
  {
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit',
    provider: 'Alibaba',
    description: 'Advanced image editing capabilities with Qwen AI.',
    strengths: ['Good editing capabilities', 'Balanced cost'],
    weaknesses: ['Editing focused'],
    bestFor: ['general', 'portrait'],
    styleTags: ['photorealistic', 'artistic'],
    creditCost: 'medium',
    qualityRating: 3,
    speedRating: 3,
    keywords: ['edit', 'modify', 'change', 'adjust'],
  },

  // === Stability AI / DreamShaper ===
  {
    id: 'dreamshaper-xl',
    name: 'Dreamshaper XL Lightning',
    provider: 'Community / Stability AI',
    description: 'A fast, low-cost model that\'s good at art and realism.',
    strengths: ['Very fast generation', 'Low cost', 'Good art and realism balance', 'Huge community'],
    weaknesses: ['Not the most detailed', 'Can be inconsistent'],
    bestFor: ['fantasy', 'character', 'illustration', 'anime', 'landscape'],
    styleTags: ['fantasy', 'artistic', 'anime', 'illustration', 'cinematic'],
    creditCost: 'low',
    qualityRating: 3,
    speedRating: 5,
    keywords: [
      'dream', 'dreamy', 'fantasy', 'character', 'anime', 'manga', 'elf', 'warrior', 'magical', 'enchanted',
      'fairy', 'mythical', 'dragon', 'creature', 'fast', 'cheap', 'landscape', 'art',
    ],
  },

  // === Recraft ===
  {
    id: 'recraft-v3',
    name: 'Recraft v3',
    provider: 'Recraft',
    description: 'A model by Recraft. Great at spelling and typography. Can generate vectors.',
    strengths: ['Excellent typography', 'Vector generation', 'Good at spelling'],
    weaknesses: ['Higher credit cost'],
    bestFor: ['illustration', 'concept art', 'general'],
    styleTags: ['artistic', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['text', 'typography', 'sign', 'vector', 'logo', 'spelling', 'graphic', 'design', 'poster'],
  },

  // === HiDream ===
  {
    id: 'hidream-i1',
    name: 'HiDream I1 Full',
    provider: 'HiDream',
    description: 'The full power of HiDream I1, a state-of-the-art image generation model.',
    strengths: ['High quality output', 'Good creative range'],
    weaknesses: ['High credit cost'],
    bestFor: ['concept art', 'illustration', 'portrait', 'fantasy'],
    styleTags: ['artistic', 'cinematic', 'fantasy', 'illustration'],
    creditCost: 'high',
    qualityRating: 4,
    speedRating: 3,
    keywords: ['creative', 'artistic', 'detailed', 'fantasy', 'concept', 'character'],
  },

  // === Juggernaut ===
  {
    id: 'juggernaut-flux',
    name: 'Juggernaut Flux Base',
    provider: 'Rundiffusion',
    description: 'A version of Flux trained on high-quality images. By Rundiffusion.',
    strengths: ['High detail', 'Strong cinematic compositions', 'Great with complex scenes'],
    weaknesses: ['Higher credit cost'],
    bestFor: ['portrait', 'landscape', 'concept art', 'photography', 'sci-fi'],
    styleTags: ['photorealistic', 'cinematic', 'artistic', 'fantasy'],
    creditCost: 'high',
    qualityRating: 5,
    speedRating: 3,
    keywords: [
      'cinematic', 'epic', 'detailed', 'dramatic', 'movie', 'film', 'scene', 'landscape', 'cityscape',
      'architecture', 'sci-fi', 'cyberpunk', 'futuristic', 'dark', 'moody', 'atmospheric', 'volumetric',
    ],
  },

  // === Additional Juggernaut Variants ===
  { id: 'juggernaut-flux-pro', name: 'Juggernaut Flux Pro', provider: 'Rundiffusion', description: 'The best version of Juggernaut, a Flux-based model trained on high-quality images.', strengths: ['Highest quality Juggernaut', 'Excellent detail', 'Great cinematic output'], weaknesses: ['High credit cost'], bestFor: ['portrait', 'landscape', 'concept art', 'photography'], styleTags: ['photorealistic', 'cinematic', 'artistic'], creditCost: 'high', qualityRating: 5, speedRating: 3, keywords: ['cinematic', 'epic', 'detailed', 'dramatic', 'portrait', 'landscape', 'realistic'] },
  { id: 'juggernaut-plus-lightning', name: 'Juggernaut Plus Lightning', provider: 'Rundiffusion', description: 'A faster, lighter Juggernaut. Still high quality but with much faster generation.', strengths: ['Fast generation', 'Good quality for speed'], weaknesses: ['Less detail than Pro'], bestFor: ['portrait', 'landscape', 'general'], styleTags: ['photorealistic', 'cinematic'], creditCost: 'medium', qualityRating: 4, speedRating: 4, keywords: ['fast', 'cinematic', 'portrait', 'landscape', 'lightning'] },
  { id: 'juggernaut-v9', name: 'Juggernaut V9', provider: 'Rundiffusion', description: 'Juggernaut V9 model with improved detail and scene handling.', strengths: ['Improved detail', 'Good scene composition'], weaknesses: ['Higher cost'], bestFor: ['portrait', 'landscape', 'concept art'], styleTags: ['photorealistic', 'cinematic', 'artistic'], creditCost: 'high', qualityRating: 4, speedRating: 3, keywords: ['detailed', 'cinematic', 'portrait', 'landscape', 'scene'] },
  { id: 'juggernaut-v3-lightning', name: 'Juggernaut V3 Lightning', provider: 'Rundiffusion', description: 'Juggernaut V3 with lightning-fast generation speeds.', strengths: ['Very fast', 'Consistent quality'], weaknesses: ['Older generation'], bestFor: ['portrait', 'general', 'landscape'], styleTags: ['photorealistic', 'cinematic'], creditCost: 'low', qualityRating: 3, speedRating: 5, keywords: ['fast', 'lightning', 'portrait', 'cinematic', 'quick'] },
  { id: 'juggernaut-xl-v7', name: 'Juggernaut XL v7', provider: 'Rundiffusion', description: 'A powerful SDXL-based Juggernaut fine-tune for cinematic scenes.', strengths: ['Great cinematic quality', 'Good detail'], weaknesses: ['Older SDXL base'], bestFor: ['portrait', 'landscape', 'sci-fi', 'concept art'], styleTags: ['photorealistic', 'cinematic', 'artistic'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['cinematic', 'epic', 'detailed', 'dramatic', 'sci-fi'] },

  // === Seedream Models ===
  { id: 'seedream-3', name: 'Seedream 3.0', provider: 'ByteDance', description: 'A versatile image generation model by ByteDance.', strengths: ['Good quality', 'Versatile styles'], weaknesses: ['Medium credit cost'], bestFor: ['general', 'illustration', 'portrait'], styleTags: ['artistic', 'photorealistic', 'illustration'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['versatile', 'creative', 'artistic', 'portrait'] },
  { id: 'seedream-3-pro', name: 'Seedream 3.0 Pro', provider: 'ByteDance', description: 'The pro variant of Seedream 3.0 with higher quality output.', strengths: ['Higher quality', 'Better detail'], weaknesses: ['Higher cost'], bestFor: ['portrait', 'illustration', 'concept art'], styleTags: ['artistic', 'photorealistic', 'cinematic'], creditCost: 'high', qualityRating: 5, speedRating: 3, keywords: ['pro', 'detailed', 'creative', 'portrait', 'quality'] },

  // === Community SDXL Checkpoint Models ===
  { id: 'animagine-xl', name: 'Animagine XL v4 Lightning', provider: 'Community', description: 'A fast anime-focused SDXL model with excellent anime art generation.', strengths: ['Excellent anime art', 'Fast generation', 'Low cost'], weaknesses: ['Limited to anime styles'], bestFor: ['anime', 'character', 'illustration'], styleTags: ['anime', 'illustration'], creditCost: 'low', qualityRating: 4, speedRating: 5, keywords: ['anime', 'manga', 'character', 'japanese', 'waifu', 'chibi', 'kawaii'] },
  { id: 'atomix-xl', name: 'Atomix XL v4 Lightning', provider: 'Community', description: 'A fast, versatile SDXL checkpoint model.', strengths: ['Fast generation', 'Versatile'], weaknesses: ['Less specialized'], bestFor: ['general', 'illustration', 'fantasy'], styleTags: ['artistic', 'illustration', 'fantasy'], creditCost: 'low', qualityRating: 3, speedRating: 5, keywords: ['fast', 'versatile', 'artistic', 'fantasy', 'lightning'] },
  { id: 'movie-diffusion', name: 'Movie Diffusion v1 v4 Lightning', provider: 'Community', description: 'Optimized for cinematic, movie-like image generation.', strengths: ['Cinematic aesthetic', 'Movie-like quality'], weaknesses: ['Narrow style range'], bestFor: ['photography', 'portrait', 'landscape'], styleTags: ['cinematic', 'photorealistic'], creditCost: 'low', qualityRating: 3, speedRating: 5, keywords: ['movie', 'cinematic', 'film', 'dramatic', 'scene', 'lightning'] },
  { id: 'realvisxl-v5', name: 'RealVisXL v5', provider: 'Community', description: 'Extremely photorealistic SDXL model. Latest version with best realism.', strengths: ['Extremely photorealistic', 'Natural skin textures', 'Great lighting'], weaknesses: ['Limited to photorealistic style'], bestFor: ['portrait', 'photography', 'nature'], styleTags: ['photorealistic'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['photo', 'realistic', 'portrait', 'person', 'face', 'skin', 'natural', 'stock photo'] },
  { id: 'realvisxl-v4-lightning', name: 'RealVisXL v4 Lightning', provider: 'Community', description: 'Fast photorealistic model based on RealVisXL v4.', strengths: ['Fast photorealism', 'Low cost'], weaknesses: ['Slightly lower quality than v5'], bestFor: ['portrait', 'photography'], styleTags: ['photorealistic'], creditCost: 'low', qualityRating: 3, speedRating: 5, keywords: ['photo', 'realistic', 'fast', 'portrait', 'lightning'] },
  { id: 'realvisxl-v3', name: 'RealVisXL v3', provider: 'Community', description: 'A reliable photorealistic SDXL checkpoint model.', strengths: ['Good photorealism', 'Proven quality'], weaknesses: ['Older generation'], bestFor: ['portrait', 'photography'], styleTags: ['photorealistic'], creditCost: 'low', qualityRating: 3, speedRating: 3, keywords: ['photo', 'realistic', 'portrait', 'natural'] },
  { id: 'stable-kitsune', name: 'Stable Kitsune', provider: 'Community', description: 'A creative model enabling stunning stylized and anime-inspired images.', strengths: ['Stylized output', 'Creative aesthetic'], weaknesses: ['Niche style'], bestFor: ['anime', 'illustration', 'fantasy'], styleTags: ['anime', 'artistic', 'fantasy'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['anime', 'stylized', 'creative', 'fantasy', 'kitsune'] },
  { id: 'stable-kino', name: 'Stable Kino', provider: 'Community', description: 'A model good at realistic photographic output.', strengths: ['Good photographic quality'], weaknesses: ['Limited style range'], bestFor: ['photography', 'portrait'], styleTags: ['photorealistic', 'cinematic'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['photo', 'cinematic', 'kino', 'realistic'] },
  { id: 'cherry-picker-xl', name: 'Cherry Picker XL v2', provider: 'Community', description: 'A carefully curated SDXL model optimized for quality output.', strengths: ['Great quality', 'Well curated'], weaknesses: ['Medium speed'], bestFor: ['general', 'illustration', 'portrait'], styleTags: ['artistic', 'photorealistic'], creditCost: 'low', qualityRating: 4, speedRating: 3, keywords: ['quality', 'curated', 'artistic', 'portrait'] },
  { id: 'virtual-vivid-xl', name: 'Virtual Vivid XL v6', provider: 'Community', description: 'Vibrant and vivid imagery with strong color output.', strengths: ['Vibrant colors', 'Strong aesthetic'], weaknesses: ['Can oversaturate'], bestFor: ['illustration', 'fantasy', 'landscape'], styleTags: ['artistic', 'fantasy', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 3, keywords: ['vivid', 'vibrant', 'colorful', 'bright', 'fantasy'] },
  { id: 'sdxl-spo', name: 'SDXL SPO', provider: 'Stability AI', description: 'SDXL model with self-play optimization for improved quality.', strengths: ['Improved SDXL quality', 'Good all-rounder'], weaknesses: ['Medium cost'], bestFor: ['general', 'portrait', 'landscape'], styleTags: ['photorealistic', 'artistic', 'cinematic'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['landscape', 'portrait', 'cinematic', 'detailed', 'realistic'] },
  { id: 'sdxl-1', name: 'SDXL 1.0', provider: 'Stability AI', description: 'The flagship Stable Diffusion XL model from Stability AI.', strengths: ['Strong all-rounder', 'Wide style range', 'Good composition'], weaknesses: ['Not the newest'], bestFor: ['landscape', 'portrait', 'concept art', 'photography'], styleTags: ['photorealistic', 'artistic', 'cinematic', 'fantasy'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['landscape', 'portrait', 'cinematic', 'realistic', 'natural', 'atmospheric'] },
  { id: 'dreamshaper-v8', name: 'DreamShaper v8', provider: 'Community', description: 'Classic DreamShaper model, versatile across many styles.', strengths: ['Versatile', 'Great fantasy art', 'Low cost'], weaknesses: ['Lower resolution than XL'], bestFor: ['fantasy', 'character', 'illustration', 'anime'], styleTags: ['fantasy', 'artistic', 'anime', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['dream', 'fantasy', 'character', 'anime', 'magical'] },
  { id: 'blue-pencil-v9', name: 'Blue Pencil v9', provider: 'Community', description: 'A model optimized for clean, pencil-drawing style art.', strengths: ['Clean line art', 'Good for sketches'], weaknesses: ['Narrow style'], bestFor: ['illustration', 'character'], styleTags: ['artistic', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['pencil', 'sketch', 'drawing', 'line art', 'clean'] },
  { id: 'rpg-v5', name: 'RPG v5', provider: 'Community', description: 'A model specializing in RPG-style fantasy art.', strengths: ['Great RPG/fantasy aesthetic', 'Good characters'], weaknesses: ['Limited to fantasy style'], bestFor: ['fantasy', 'character', 'concept art'], styleTags: ['fantasy', 'artistic', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['rpg', 'fantasy', 'character', 'warrior', 'medieval', 'game', 'adventure'] },
  { id: 'christy-updates', name: 'Christy Updates', provider: 'Community', description: 'Updated model with improved realism and detail.', strengths: ['Good realism', 'Detailed output'], weaknesses: ['Niche'], bestFor: ['portrait', 'photography'], styleTags: ['photorealistic', 'artistic'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['portrait', 'realistic', 'detailed', 'person'] },

  // === Nano Banana ===
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Nano Banana', description: 'A high-quality image model from Nano Banana.', strengths: ['Good quality', 'Creative output'], weaknesses: ['Medium cost'], bestFor: ['general', 'illustration', 'portrait'], styleTags: ['artistic', 'illustration', 'photorealistic'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['creative', 'artistic', 'portrait', 'quality'] },

  // === Dons Image Edit ===
  { id: 'dons-image-edit-plus', name: 'Dons Image Edit Plus', provider: 'Community', description: 'A specialized model for editing and enhancing images.', strengths: ['Good image editing', 'Preserves original style'], weaknesses: ['Editing focused'], bestFor: ['general', 'portrait'], styleTags: ['photorealistic', 'artistic'], creditCost: 'medium', qualityRating: 3, speedRating: 3, keywords: ['edit', 'modify', 'enhance', 'adjust'] },

  // === Fooocus ===
  { id: 'fooocus-genesis-pro', name: 'Fooocus Genesis Pro', provider: 'Community', description: 'A Fooocus-based model with great default quality.', strengths: ['Great defaults', 'Easy to prompt'], weaknesses: ['Less control'], bestFor: ['general', 'portrait', 'illustration'], styleTags: ['artistic', 'photorealistic', 'cinematic'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['easy', 'creative', 'portrait', 'artistic'] },

  // === Flux 2 Klein Models ===
  { id: 'flux-2-klein-9b', name: 'Flux 2 Klein 9B', provider: 'Black Forest Labs', description: 'The largest Flux 2 Klein model with best detail and aesthetics.', strengths: ['Best Klein quality', 'Great aesthetics'], weaknesses: ['Slower'], bestFor: ['concept art', 'illustration', 'portrait'], styleTags: ['artistic', 'cinematic', 'illustration'], creditCost: 'high', qualityRating: 4, speedRating: 3, keywords: ['detailed', 'aesthetic', 'creative', 'artistic'] },
  { id: 'flux-2-klein-4b', name: 'Flux 2 Klein 4B', provider: 'Black Forest Labs', description: 'Mid-size Flux 2 Klein model with balanced quality and speed.', strengths: ['Balanced quality', 'Good speed'], weaknesses: ['Less detail than 9B'], bestFor: ['general', 'illustration', 'portrait'], styleTags: ['artistic', 'illustration'], creditCost: 'medium', qualityRating: 3, speedRating: 4, keywords: ['balanced', 'artistic', 'creative'] },
  { id: 'flux-2-klein-4b-fast', name: 'Flux 2 Klein 4B Fast', provider: 'Black Forest Labs', description: 'The fastest Flux 2 Klein model for quick iterations.', strengths: ['Very fast', 'Low cost'], weaknesses: ['Lower quality'], bestFor: ['general', 'illustration'], styleTags: ['artistic'], creditCost: 'low', qualityRating: 3, speedRating: 5, keywords: ['fast', 'quick', 'draft', 'iteration'] },

  // === HiDream Fast ===
  { id: 'hidream-i1-fast', name: 'HiDream I1 Fast', provider: 'HiDream', description: 'A faster, more affordable version of HiDream I1.', strengths: ['Fast generation', 'Lower cost'], weaknesses: ['Lower quality than Full'], bestFor: ['general', 'illustration'], styleTags: ['artistic', 'illustration'], creditCost: 'medium', qualityRating: 3, speedRating: 4, keywords: ['fast', 'creative', 'artistic', 'draft'] },

  // === Additional Models from Screenshot ===
  { id: '3d-miniature', name: '3D Miniature Diffusion', provider: 'Community', description: 'A model that generates 3D miniature-style images.', strengths: ['Unique 3D miniature style', 'Great for dioramas'], weaknesses: ['Very niche style'], bestFor: ['illustration', 'concept art'], styleTags: ['artistic', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['3d', 'miniature', 'diorama', 'tiny', 'model', 'figurine'] },
  { id: 'nightshaper-axiom', name: 'Nightshaper Axiom', provider: 'Community', description: 'A creative model with dark, atmospheric outputs.', strengths: ['Great dark atmospheres', 'Moody aesthetic'], weaknesses: ['Dark style bias'], bestFor: ['fantasy', 'landscape'], styleTags: ['fantasy', 'artistic', 'cinematic'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['dark', 'moody', 'atmospheric', 'night', 'dramatic'] },
  { id: 'wildfusion-blaze', name: 'WildFusion Blaze v6', provider: 'Community', description: 'A vibrant model with bold, dynamic image generation.', strengths: ['Bold colors', 'Dynamic compositions'], weaknesses: ['Can be overly intense'], bestFor: ['illustration', 'fantasy', 'abstract'], styleTags: ['artistic', 'fantasy', 'abstract'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['vibrant', 'bold', 'dynamic', 'colorful', 'intense'] },
  { id: 'playground-v3', name: 'Playground v3', provider: 'Playground AI', description: 'A versatile model from Playground AI with good aesthetic quality.', strengths: ['Good aesthetics', 'Versatile'], weaknesses: ['Medium cost'], bestFor: ['general', 'portrait', 'illustration'], styleTags: ['artistic', 'photorealistic', 'illustration'], creditCost: 'medium', qualityRating: 4, speedRating: 3, keywords: ['aesthetic', 'creative', 'versatile', 'artistic'] },
  { id: 'ai-moxy-cosmic', name: 'AI Moxy Cosmic v5', provider: 'Community', description: 'A cosmic and sci-fi themed model.', strengths: ['Great sci-fi/cosmic aesthetic'], weaknesses: ['Niche style'], bestFor: ['sci-fi', 'abstract', 'fantasy'], styleTags: ['fantasy', 'abstract', 'cinematic'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['cosmic', 'space', 'sci-fi', 'galaxy', 'stars', 'nebula'] },
  { id: 'tom-twaddle', name: 'Tom Twaddle', provider: 'Community', description: 'A whimsical art style model for playful, cartoon-like images.', strengths: ['Whimsical style', 'Fun aesthetic'], weaknesses: ['Very niche'], bestFor: ['illustration', 'character'], styleTags: ['artistic', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 4, keywords: ['whimsical', 'fun', 'cartoon', 'playful', 'quirky'] },
  { id: 'realismengine-xl', name: 'RealismEngine XL', provider: 'Community', description: 'SDXL model focused on maximum photorealistic output.', strengths: ['Top-tier photorealism'], weaknesses: ['Limited to realism'], bestFor: ['photography', 'portrait'], styleTags: ['photorealistic'], creditCost: 'low', qualityRating: 4, speedRating: 3, keywords: ['photo', 'realistic', 'engine', 'portrait', 'person'] },
  { id: 'monstronocity-v1-xl', name: 'MonstrousDiffusion v1 XL', provider: 'Community', description: 'A model specialized in generating quality art.', strengths: ['Good art generation', 'Detailed output'], weaknesses: ['Medium speed'], bestFor: ['illustration', 'fantasy'], styleTags: ['artistic', 'fantasy', 'illustration'], creditCost: 'low', qualityRating: 3, speedRating: 3, keywords: ['art', 'detailed', 'creative', 'fantasy'] },
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
      if (model.id === 'dreamshaper-xl') {
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
      if (model.id.startsWith('ideogram') || model.id === 'dalle3' || model.id === 'recraft-v3' || model.id.startsWith('gpt')) {
        score += 30;
        reasons.push('Capable of rendering text in images');
      }
    }

    // Boost OpenAI/DALL-E models for complex prompts
    const wordCount = words.length;
    if (wordCount > 30) {
      if (model.id === 'dalle3' || model.id.startsWith('gpt')) {
        score += 15;
        reasons.push('Handles complex, detailed prompts well');
      }
    }

    score += model.qualityRating * 2;

    return { model, score, reasons: reasons.length > 0 ? reasons : ['General-purpose model'] };
  })
    .sort((a, b) => b.score - a.score);
}

export function supportsNegativePrompt(modelId: string): boolean {
  if (!modelId) return true; // Default to true if unsure
  if (modelId === 'dalle3') return false;
  if (modelId.startsWith('gpt')) return false;
  return true;
}
