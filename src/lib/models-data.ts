export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  styleTags: string[];
  qualityRating: number;
  speedRating: number;
  keywords: string[];
  recommendedPreset?: string;
}

export const PRESET_OPTIONS = [
  'NightCafe', 'Cinematic', 'Realistic Anime', 'Artistic Portrait',
  'Detailed Gouache', 'Neo Impressionist', 'Pop Art', 'Anime',
  'Striking', '2.5D Anime', 'Anime v2', 'Hyperreal',
  'Candy v2', 'Photo', 'B&W Portrait', 'Color Portrait',
  'Vibrant', 'Epic Origami', '3D Game v2', 'Color Painting',
  'Oil Painting', 'Cosmic', 'Sinister', 'Candy',
  'Mecha', 'CGI Character', 'Epic', 'Dark Fantasy',
  'Cubist', '3D Game', 'Fantasy', 'Gouache',
  'Modern Comic', 'Abstract Curves', 'Bon Voyage', 'Cubist v2',
  'Matte', 'Charcoal', 'Horror', 'Surreal',
  'Steampunk', 'Cyberpunk', 'Synthwave', 'Heavenly'
] as const;

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
  // === Seedream ===
  {
    id: 'seedream-3-0',
    name: 'Seedream 3.0',
    provider: 'ByteDance',
    description: 'A model by ByteDance with a focus on realistic detail',
    strengths: ['High detail', 'Realistic', 'Versatile'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'illustration', 'portrait'],
    styleTags: ['photorealistic', 'artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['realistic', 'detail', 'bytedance', 'seedream'],
  },
  {
    id: 'seedream-4-0',
    name: 'Seedream 4.0',
    provider: 'ByteDance',
    description: 'Next-gen multimodal AI model for ultra-fast image generation (2K-4K)',
    strengths: ['Ultra fast', 'High resolution', 'Next-gen'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['fast', 'high resolution', '2k', '4k', 'multimodal'],
  },
  {
    id: 'seedream-4-5',
    name: 'Seedream 4.5',
    provider: 'ByteDance',
    description: 'An improved version of Seedream 4.0',
    strengths: ['High quality', 'Improved'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['improved', 'quality', 'seedream'],
  },

  // === Flux ===
  {
    id: 'flux-2-dev',
    name: 'Flux 2 Dev',
    provider: 'Black Forest Labs',
    description: 'Baseline Flux 2 good at everything and at reasonable cost',
    strengths: ['Good all-rounder', 'Reasonable cost'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'illustration', 'concept art'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['flux', 'dev', 'baseline', 'general'],
  },
  {
    id: 'flux-2-klein-9b-fast',
    name: 'Flux 2 Klein 9B Fast',
    provider: 'Black Forest Labs',
    description: 'FLUX 2 Klein 9B is a 4-step distilled image generation and editing model designed',
    strengths: ['Fast', 'Distilled', 'Good quality'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'editing'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['fast', 'distilled', 'editing', 'klein'],
  },
  {
    id: 'flux-2-klein-4b-fast',
    name: 'Flux 2 Klein 4B Fast',
    provider: 'Black Forest Labs',
    description: 'The fastest variant in the Klein family. Built for interactive applications real time',
    strengths: ['Very fast', 'Real-time', 'Interactive'],
    weaknesses: ['Medium cost'],
    bestFor: ['interactive', 'general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['fast', 'real-time', 'interactive', 'klein'],
  },
  {
    id: 'flux-2-klein-9b',
    name: 'Flux 2 Klein 9B',
    provider: 'Black Forest Labs',
    description: 'Outstanding quality at sub-second speed. Great for real-time generation while retaining',
    strengths: ['High quality', 'Sub-second speed'],
    weaknesses: ['Medium cost'],
    bestFor: ['real-time', 'general'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['quality', 'sub-second', 'real-time', 'klein'],
  },
  {
    id: 'flux',
    name: 'Flux',
    provider: 'Black Forest Labs',
    description: 'A great general-purpose model at a low cost',
    strengths: ['General purpose', 'Low cost'],
    weaknesses: ['Medium cost?'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['general', 'purpose', 'flux'],
  },
  {
    id: 'flux-pro-v1-1-ultra',
    name: 'Flux PRO v1.1 Ultra',
    provider: 'Black Forest Labs',
    description: 'An ultrahigh-resolution version of Flux by Black Forest Labs',
    strengths: ['Ultra high resolution', 'High quality'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['ultra', 'resolution', 'pro', 'flux'],
  },
  {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    provider: 'Black Forest Labs',
    description: 'Excellent at editing images using natural language prompts',
    strengths: ['Editing', 'Natural language'],
    weaknesses: ['Medium cost'],
    bestFor: ['editing', 'general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['editing', 'natural language', 'kontext'],
  },
  {
    id: 'flux-kontext-pro',
    name: 'Flux Kontext Pro',
    provider: 'Black Forest Labs',
    description: 'A more powerful version of Flux Kontext for editing images via text prompts',
    strengths: ['Powerful editing', 'Text prompts'],
    weaknesses: ['Very high cost'],
    bestFor: ['editing', 'general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['powerful', 'editing', 'pro', 'kontext'],
  },

  // === Qwen ===
  {
    id: 'qwen-image-edit-plus',
    name: 'Qwen Image Edit Plus',
    provider: 'Alibaba',
    description: 'AKA Qwen Image Edit 2509 - An enhanced version of Qwen Image-Edit that supports regeneration',
    strengths: ['Enhanced editing', 'Regeneration'],
    weaknesses: ['Medium cost'],
    bestFor: ['editing', 'general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['editing', 'enhanced', 'regeneration', 'qwen'],
  },

  // === Seedance ===
  {
    id: 'seedance-1-0-pro-fast',
    name: 'Seedance 1.0 Pro Fast',
    provider: 'ByteDance',
    description: 'Faster generated videos. Lower price. Cinematic results',
    strengths: ['Fast video', 'Cinematic', 'Lower price'],
    weaknesses: ['Video focused?'],
    bestFor: ['cinematic', 'general'],
    styleTags: ['cinematic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['fast', 'video', 'cinematic', 'seedance'],
  },

  // === Z-Image ===
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'Community',
    description: 'An affordable model with great quality and fast low cost',
    strengths: ['Affordable', 'Great quality', 'Fast'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['affordable', 'quality', 'fast', 'turbo'],
  },

  // === HiDream ===
  {
    id: 'hidream-11-dev',
    name: 'HiDream 11 Dev',
    provider: 'HiDream',
    description: 'Creates stunning artistic images with exceptional clarity and detail',
    strengths: ['Stunning art', 'Clarity', 'Detail'],
    weaknesses: ['Medium cost'],
    bestFor: ['artistic', 'illustration'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['stunning', 'artistic', 'clarity', 'detail', 'hidream'],
  },
  {
    id: 'hidream-11-fast',
    name: 'HiDream 11 Fast',
    provider: 'HiDream',
    description: 'Faster and cheaper version of HiDream great for artistic images',
    strengths: ['Fast', 'Cheaper', 'Artistic'],
    weaknesses: ['Medium cost'],
    bestFor: ['artistic', 'general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['fast', 'cheaper', 'artistic', 'hidream'],
  },

  // === Nano Banana ===
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    provider: 'Nano Banana',
    description: 'The next version of Nano Banana with improved capabilities and performance',
    strengths: ['Improved capabilities', 'Performance'],
    weaknesses: ['Very high cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['improved', 'performance', 'nano banana'],
  },
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    provider: 'Nano Banana',
    description: 'AKA Gemini Flash 2.5 - Google\'s latest model with first-class start image support',
    strengths: ['Start image support', 'Latest model'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['google', 'gemini', 'flash', 'start image'],
  },

  // === Dreamina ===
  {
    id: 'dreamina-lightning',
    name: 'Dreamina Lightning',
    provider: 'ByteDance',
    description: 'A fast low-cost model that\'s good at art and realism',
    strengths: ['Fast', 'Low cost', 'Art', 'Realism'],
    weaknesses: ['Medium cost (updated)'],
    bestFor: ['artistic', 'general'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['fast', 'art', 'realism', 'dreamina'],
  },

  // === Google Imagen ===
  {
    id: 'google-imagen-v4-ultra',
    name: 'Google Imagen v4 Ultra',
    provider: 'Google',
    description: 'A larger version of Imagen v4. Google\'s latest image model',
    strengths: ['Large model', 'Latest'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'photography'],
    styleTags: ['photorealistic', 'artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['google', 'imagen', 'ultra', 'latest'],
  },
  {
    id: 'google-imagen-3-0-fast',
    name: 'Google Imagen 3.0 Fast',
    provider: 'Google',
    description: 'A faster cheaper version of Imagen v3. Google\'s image model',
    strengths: ['Fast', 'Cheaper'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['photorealistic', 'artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['fast', 'cheaper', 'imagen', 'google'],
  },
  {
    id: 'google-imagen-3-0',
    name: 'Google Imagen 3.0',
    provider: 'Google',
    description: 'Google\'s image model. Great at prompt adherence and typography',
    strengths: ['Prompt adherence', 'Typography'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['adherence', 'typography', 'google', 'imagen'],
  },

  // === Ideogram ===
  {
    id: 'ideogram-v3-quality',
    name: 'Ideogram V3 Quality',
    provider: 'Ideogram',
    description: 'The latest & best model from Ideogram',
    strengths: ['Latest', 'Best', 'High quality'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['latest', 'best', 'ideogram', 'quality'],
  },
  {
    id: 'ideogram-v3',
    name: 'Ideogram V3',
    provider: 'Ideogram',
    description: 'The latest model from Ideogram',
    strengths: ['Latest model'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['latest', 'ideogram'],
  },
  {
    id: 'ideogram-2a',
    name: 'Ideogram 2a',
    provider: 'Ideogram',
    description: 'Created by ex Googlers. Affordable prompt adherence and typography',
    strengths: ['Affordable', 'Prompt adherence', 'Typography'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['affordable', 'adherence', 'typography', 'ideogram'],
  },
  {
    id: 'ideogram-2a-turbo',
    name: 'Ideogram 2a Turbo',
    provider: 'Ideogram',
    description: 'A faster cheaper version of Ideogram 2a',
    strengths: ['Faster', 'Cheaper'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['faster', 'cheaper', 'turbo', 'ideogram'],
  },

  // === OpenAI GPT ===
  {
    id: 'gpt1-5-medium',
    name: 'GPT1.5 Medium',
    provider: 'OpenAI',
    description: 'The latest model from OpenAI on medium quality setting. Supports prompt-to-edit and',
    strengths: ['Medium quality', 'Prompt-to-edit'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'editing'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['medium', 'quality', 'editing', 'gpt', 'openai'],
  },
  {
    id: 'gpt1-5-high',
    name: 'GPT1.5 High',
    provider: 'OpenAI',
    description: 'The latest model from OpenAI on high quality setting. Supports prompt-to-edit and',
    strengths: ['High quality', 'Prompt-to-edit'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'editing'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['high', 'quality', 'editing', 'gpt', 'openai'],
  },
  {
    id: 'gpt1-medium',
    name: 'GPT1 Medium',
    provider: 'OpenAI',
    description: 'The latest flagship image model from OpenAI on medium quality setting',
    strengths: ['Flagship', 'Medium quality'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['flagship', 'medium', 'gpt', 'openai'],
  },
  {
    id: 'gpt1-high',
    name: 'GPT1 High',
    provider: 'OpenAI',
    description: 'The latest flagship model from OpenAI on high quality setting',
    strengths: ['Flagship', 'High quality'],
    weaknesses: ['Very high cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['flagship', 'high', 'gpt', 'openai'],
  },

  {
    id: 'gpt1-5-low',
    name: 'GPT1.5 Low',
    provider: 'OpenAI',
    description: 'GPT Image 1.5 from OpenAI on low quality setting. Fast & cheap. best for prototyping',
    strengths: ['Fast', 'Cheap', 'Prototyping'],
    weaknesses: ['Low quality', 'Medium cost'],
    bestFor: ['prototyping', 'general'],
    styleTags: ['artistic'],

    qualityRating: 3,
    speedRating: 5,
    keywords: ['fast', 'cheap', 'prototyp', 'gpt'],
  },
  {
    id: 'gpt1-low',
    name: 'GPT1 Low',
    provider: 'OpenAI',
    description: 'GPT Image 1 from OpenAI on low quality setting. Fast & cheap. best for prototyping',
    strengths: ['Fast', 'Cheap', 'Prototyping'],
    weaknesses: ['Low quality', 'Medium cost'],
    bestFor: ['prototyping', 'general'],
    styleTags: ['artistic'],

    qualityRating: 3,
    speedRating: 5,
    keywords: ['fast', 'cheap', 'prototyp', 'gpt'],
  },

  // === Recraft ===
  {
    id: 'recraft-v3',
    name: 'Recraft v3',
    provider: 'Recraft',
    description: 'A model by Recraft. Great at spelling and typography. Can generate vectors',
    strengths: ['Spelling', 'Typography', 'Vector generation'],
    weaknesses: ['Very high cost'],
    bestFor: ['typography', 'vector', 'general'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['spelling', 'typography', 'vector', 'recraft'],
  },

  // === NightCafe ===
  {
    id: 'nightcafe',
    name: 'NIGHTCAFE',
    provider: 'NightCafe',
    description: 'Created by ex Googlers. Great at prompt adherence and generating text in images',
    strengths: ['Prompt adherence', 'Text in images'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'typography'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['adherence', 'text', 'nightcafe'],
  },

  // === Ideogram (Remaining) ===
  {
    id: 'ideogram-2-0-turbo',
    name: 'Ideogram 2.0 Turbo',
    provider: 'Ideogram',
    description: 'A faster cheaper version of Ideogram for typography',
    strengths: ['Faster', 'Cheaper', 'Typography'],
    weaknesses: ['Medium cost'],
    bestFor: ['typography', 'general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['faster', 'cheaper', 'typography', 'turbo', 'ideogram'],
  },
  {
    id: 'ideogram-1-0',
    name: 'Ideogram 1.0',
    provider: 'Ideogram',
    description: 'The first model from Ideogram. Good at typography',
    strengths: ['Typography', 'First model'],
    weaknesses: ['Very high cost', 'Older'],
    bestFor: ['typography', 'general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['typography', 'first', 'ideogram'],
  },
  {
    id: 'ideogram-1-0-turbo',
    name: 'Ideogram 1.0 Turbo',
    provider: 'Ideogram',
    description: 'A faster and cheaper version of Ideogram 1.0',
    strengths: ['Faster', 'Cheaper'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 5,
    keywords: ['faster', 'cheaper', 'turbo', 'ideogram'],
  },

  // === Seedance (Remaining) ===
  {
    id: 'seedance-1-5-pro',
    name: 'Seedance 1.5 Pro',
    provider: 'ByteDance',
    description: 'The next generation of AI video generation with native synchronized audio capabilities',
    strengths: ['Video', 'Audio', 'Next-gen'],
    weaknesses: ['Very high cost'],
    bestFor: ['video', 'general'],
    styleTags: ['cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['video', 'audio', 'synchronized', 'seedance'],
  },

  // === PixVerse ===
  {
    id: 'pixverse-v5',
    name: 'PixVerse V5',
    provider: 'Community',
    description: 'PixVerse v5 model delivers the latest advancements in AI video generation',
    strengths: ['Video', 'Latest advancements'],
    weaknesses: ['Cost N/A (assume medium)'],
    bestFor: ['video', 'general'],
    styleTags: ['cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['video', 'advancements', 'pixverse'],
  },

  // === Juggernaut ===
  {
    id: 'juggernaut-flux-pro',
    name: 'Juggernaut Flux Pro',
    provider: 'RunDiffusion',
    description: 'Flux but better (especially at realism). By RunDiffusion',
    strengths: ['Better realism', 'Flux based'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'flux', 'juggernaut', 'rundiffusion'],
  },
  {
    id: 'juggernaut-flux-lite',
    name: 'Juggernaut Flux Lite',
    provider: 'RunDiffusion',
    description: 'A cheaper faster but slightly less powerful version of Juggernaut Flux',
    strengths: ['Cheaper', 'Faster'],
    weaknesses: ['Less powerful', 'Medium cost'],
    bestFor: ['general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['cheaper', 'faster', 'lite', 'juggernaut'],
  },
  {
    id: 'juggernaut-xl',
    name: 'Juggernaut XL',
    provider: 'RunDiffusion',
    description: 'Juggernaut re-trained from scratch for better prompt adherence. By RunDiffusion',
    strengths: ['Prompt adherence', 'Retrained'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['adherence', 'retrained', 'xl', 'juggernaut'],
  },
  {
    id: 'juggernaut-xl-lightning',
    name: 'Juggernaut XL Lightning',
    provider: 'RunDiffusion',
    description: 'Juggernaut re-trained from scratch for better prompt adherence. By RunDiffusion',
    strengths: ['Prompt adherence', 'Fast'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['adherence', 'lightning', 'xl', 'juggernaut'],
  },
  {
    id: 'juggernaut-xl-v8',
    name: 'Juggernaut XL v8',
    provider: 'RunDiffusion',
    description: 'An SDXL model for perfect realism and cinematic styles. By kandooAI',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'xl', 'juggernaut'],
  },

  // === RealVisXL ===
  {
    id: 'realvisxl-v5',
    name: 'RealVisXL v5',
    provider: 'Community',
    description: 'An SDXL model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealism', 'faces', 'realvisxl'],
  },
  {
    id: 'realvisxl-v5-lightning',
    name: 'RealVisXL v5 Lightning',
    provider: 'Community',
    description: 'An SDXL lightning model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces', 'Fast'],
    weaknesses: ['Very high cost? (csv says $$$$$)'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['photorealism', 'faces', 'lightning', 'realvisxl'],
  },
  {
    id: 'realvisxl-v4',
    name: 'RealVisXL v4',
    provider: 'Community',
    description: 'An SDXL model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealism', 'faces', 'realvisxl'],
  },
  {
    id: 'realvisxl-v4-lightning',
    name: 'RealVisXL v4 Lightning',
    provider: 'Community',
    description: 'An SDXL model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces', 'Fast'],
    weaknesses: ['Low cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['photorealism', 'faces', 'lightning', 'realvisxl'],
  },

  // === Other Community Models ===
  {
    id: 'boltning-xl-v1-lightning',
    name: 'Boltning XL v1 Lightning',
    provider: 'Community',
    description: 'A lightning model for highly detailed aesthetic images. By geonying',
    strengths: ['Detailed', 'Aesthetic', 'Fast'],
    weaknesses: ['Low cost'],
    bestFor: ['general', 'aesthetic'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['detailed', 'aesthetic', 'lightning', 'boltning'],
  },
  {
    id: 'atomix-xl-v4-lightning',
    name: 'Atomix XL v4 Lightning',
    provider: 'Community',
    description: 'A lightning model that balances realism and CG. By AlexiAI',
    strengths: ['Realism balance', 'CG', 'Fast'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'fantasy'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['realism', 'cg', 'lightning', 'atomix'],
  },
  {
    id: 'moste-diffusion-xl-v1-6-lighten',
    name: 'Moste Diffusion XL v1.6 Lighten',
    provider: 'Community',
    description: 'A mashup of other popular SDXL models. By movie1776',
    strengths: ['Mashup', 'Popular models'],
    weaknesses: ['Very high cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['mashup', 'popular', 'moste'],
  },
  {
    id: 'stable-core',
    name: 'Stable Core',
    provider: 'Stability AI',
    description: 'Beautiful high resolution images. No need for complex prompts',
    strengths: ['High resolution', 'Simple prompts'],
    weaknesses: ['Medium cost'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['resolution', 'simple', 'stable core'],
  },
  {
    id: 'clarity-upscaler',
    name: 'Clarity Upscaler',
    provider: 'Community',
    description: 'A creative upscaler capable of adding detail and clarity while upscaling up to 4x',
    strengths: ['Upscaling', 'Detail', 'Clarity'],
    weaknesses: ['Upscaler only'],
    bestFor: ['upscaling'],
    styleTags: ['artistic', 'photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['upscaler', 'detail', 'clarity'],
  },
  {
    id: 'sdxl-1-0',
    name: 'SDXL 1.0',
    provider: 'Stability AI',
    description: 'Stable Diffusion XL. An older model that still holds up',
    strengths: ['Reliable', 'Standard'],
    weaknesses: ['Medium cost', 'Older'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['stable diffusion', 'xl', 'standard'],
  },
  {
    id: 'fluently',
    name: 'Fluently',
    provider: 'Community',
    description: 'An SDXL model for creating realistic images. By Fluently',
    strengths: ['Realistic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realistic', 'fluently'],
  },
  {
    id: 'fluently-xl-lightning',
    name: 'Fluently XL Lightning',
    provider: 'Community',
    description: 'An SDXL lightning model for creating realistic images. By Fluently',
    strengths: ['Realistic', 'Fast'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['realistic', 'lightning', 'fluently'],
  },
  {
    id: 'sdxl-cartoon-xl-v4',
    name: 'Sdxl Cartoon XL v4',
    provider: 'Community',
    description: 'An SDXL model good at realistic looking cartoons. By 7Whitefire7',
    strengths: ['Cartoons', 'Realistic cartoons'],
    weaknesses: ['Medium cost'],
    bestFor: ['illustration', 'cartoon'],
    styleTags: ['illustration', 'artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['cartoon', 'realistic', 'sdxl'],
  },
  {
    id: 'starlight-xl',
    name: 'Starlight XL',
    provider: 'Community',
    description: 'An SDXL model designed for creating fantasy concept art and illustrations. by chillpixel',
    strengths: ['Fantasy', 'Concept art', 'Illustration'],
    weaknesses: ['Medium cost'],
    bestFor: ['fantasy', 'concept art'],
    styleTags: ['fantasy', 'illustration'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['fantasy', 'concept', 'art', 'starlight'],
  },
  {
    id: 'mysterious-xl-v4',
    name: 'Mysterious XL v4',
    provider: 'Community',
    description: 'An SDXL model for fantasy art and cinematics. By LahintheFutureIsland',
    strengths: ['Fantasy', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['fantasy', 'cinematic'],
    styleTags: ['fantasy', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['fantasy', 'cinematic', 'mysterious'],
  },

  {
    id: 'dreamshaper-xl-alpha2',
    name: 'DreamShaper XL alpha2',
    provider: 'Community',
    description: 'A versatile SDXL model trained by Lykon',
    strengths: ['Versatile'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['versatile', 'dreamshaper', 'lykon'],
  },
  {
    id: 'juggernaut-xl-v5',
    name: 'Juggernaut XL v5',
    provider: 'RunDiffusion',
    description: 'An SDXL model for perfect realism and cinematic styles. By kandooAI',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'juggernaut'],
  },
  {
    id: 'juggernaut-xl-v6',
    name: 'Juggernaut XL v6',
    provider: 'RunDiffusion',
    description: 'An SDXL model for perfect realism and cinematic styles. By kandooAI',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'juggernaut'],
  },
  {
    id: 'juggernaut-xl-v7',
    name: 'Juggernaut XL v7',
    provider: 'RunDiffusion',
    description: 'An SDXL model for perfect realism and cinematic styles. By kandooAI',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'juggernaut'],
  },
  {
    id: 'juggernaut-v9-lightning',
    name: 'Juggernaut v9 Lightning',
    provider: 'RunDiffusion',
    description: 'A lightning model for perfect realism and cinematic styles. By RunDiffusion',
    strengths: ['Realism', 'Cinematic', 'Fast'],
    weaknesses: ['Very high cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['realism', 'cinematic', 'lightning', 'juggernaut'],
  },
  {
    id: 'juggernaut-v9',
    name: 'Juggernaut v9',
    provider: 'RunDiffusion',
    description: 'An SDXL model for perfect realism and cinematic styles. By RunDiffusion',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'juggernaut'],
  },
  {
    id: 'blue-pencil-xl',
    name: 'Blue Pencil XL',
    provider: 'Community',
    description: 'An SDXL Anime model by blue_pencil805',
    strengths: ['Anime'],
    weaknesses: ['Medium cost'],
    bestFor: ['anime', 'illustration'],
    styleTags: ['anime', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['anime', 'blue pencil', 'illustration'],
  },
  {
    id: 'animagine-xl-v3',
    name: 'Animagine XL v3',
    provider: 'Community',
    description: 'An SDXL model designed to generate high-quality anime. By CagliostroLab',
    strengths: ['Anime', 'High quality'],
    weaknesses: ['Medium cost'],
    bestFor: ['anime', 'illustration'],
    styleTags: ['anime', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['anime', 'high quality', 'animagine'],
  },
  {
    id: 'realmixxl-v3',
    name: 'RealMixXL v3',
    provider: 'Community',
    description: 'An SDXL model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealism', 'faces', 'realmix'],
  },
  {
    id: 'aam-xl-anime-mix-v1',
    name: 'AAM XL Anime Mix v1',
    provider: 'Community',
    description: 'A model aimed at generating anime and stylized art. By Lykon',
    strengths: ['Anime', 'Stylized'],
    weaknesses: ['Medium cost'],
    bestFor: ['anime', 'illustration'],
    styleTags: ['anime', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['anime', 'stylized', 'art', 'lykon'],
  },
  {
    id: 'virtual-utopia-xl',
    name: 'Virtual Utopia XL',
    provider: 'Community',
    description: 'Suitable for generating both authentic and fantasy worlds. By CyberBlaattt',
    strengths: ['Authentic', 'Fantasy worlds'],
    weaknesses: ['Medium cost'],
    bestFor: ['fantasy', 'general'],
    styleTags: ['fantasy', 'artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['authentic', 'fantasy', 'world', 'virtual'],
  },
  {
    id: 'cherry-picker-xl-v2-7',
    name: 'Cherry Picker XL v2.7',
    provider: 'Community',
    description: 'A photorealistic model that merges carefully selected models. By tkyter',
    strengths: ['Photorealistic', 'Merged'],
    weaknesses: ['Medium cost'],
    bestFor: ['photorealistic', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealistic', 'merged', 'cherry picker'],
  },
  {
    id: 'sdxl-lcm',
    name: 'SDXL LCM',
    provider: 'Stability AI',
    description: 'SDXL accelerated by LCM LoRA. High quality fast and cheap',
    strengths: ['Fast', 'Cheap', 'High quality'],
    weaknesses: ['Low cost (actually checked: $-$$$) -> Low'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['fast', 'cheap', 'quality', 'lcm'],
  },
  {
    id: 'sdxl-dpo',
    name: 'SDXL DPO',
    provider: 'Stability AI',
    description: 'A Direct Preference Optimization (DPO) aligned version of SDXL 1.0',
    strengths: ['DPO', 'Aligned', 'High quality'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['dpo', 'aligned', 'quality', 'sdxl'],
  },
  {
    id: 'dreamshaper-v1-8-1',
    name: 'DreamShaper v1.8.1',
    provider: 'Community',
    description: 'A "does it all" model by Lykon. Particularly good at faces',
    strengths: ['Versatile', 'Faces'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'portrait'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['versatile', 'faces', 'dreamshaper'],
  },
  {
    id: 'realistic-vision-v5-1',
    name: 'Realistic Vision V5.1',
    provider: 'Community',
    description: 'A model for photorealism. Great at faces. By SG_161222',
    strengths: ['Photorealism', 'Faces'],
    weaknesses: ['Low cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['photorealism', 'faces', 'realistic vision'],
  },
  {
    id: 'absolutereality-v1-8-1',
    name: 'AbsoluteReality v1.8.1',
    provider: 'Community',
    description: 'A model aimed at realism by Lykon',
    strengths: ['Realism'],
    weaknesses: ['Very high cost'],
    bestFor: ['photorealistic', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'lykon', 'absolute'],
  },
  {
    id: 'neverending-dream-v1-2-2',
    name: 'NeverEnding Dream v1.2.2',
    provider: 'Community',
    description: 'A DreamShaper alternative that\'s better suited. By Lykon',
    strengths: ['Alternative', 'Suited'],
    weaknesses: ['Low cost'],
    bestFor: ['general', 'fantasy'],
    styleTags: ['fantasy', 'artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['dreamshaper', 'alternative', 'neverending'],
  },
  {
    id: '3d-animation-diffusion-v10',
    name: '3D Animation Diffusion v10',
    provider: 'Community',
    description: 'Great for creating 3D cartoon characters. By Lykon',
    strengths: ['3D cartoon', 'Characters'],
    weaknesses: ['Low cost'],
    bestFor: ['illustration', 'character', '3d'],
    styleTags: ['artistic', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['3d', 'cartoon', 'character', 'animation'],
  },
  {
    id: 'rpg-v5',
    name: 'RPG v5',
    provider: 'Community',
    description: 'Aimed at creating RPG character portraits. By Anashel',
    strengths: ['RPG', 'Character portraits'],
    weaknesses: ['Low cost'],
    bestFor: ['fantasy', 'character', 'portrait'],
    styleTags: ['fantasy', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['rpg', 'character', 'portrait', 'fantasy'],
  },
  {
    id: 'blue-pencil-v10',
    name: 'Blue Pencil v10',
    provider: 'Community',
    description: 'Aimed at creating anime & fantasy art. By blue_pencil805',
    strengths: ['Anime', 'Fantasy'],
    weaknesses: ['Low cost'],
    bestFor: ['anime', 'fantasy', 'illustration'],
    styleTags: ['anime', 'fantasy', 'illustration'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['anime', 'fantasy', 'art', 'blue pencil'],
  },
  {
    id: 'arthemy-comics-v5-0',
    name: 'Arthemy Comics v5.0',
    provider: 'Community',
    description: 'Aimed at creating comic style characters. By Arthemy',
    strengths: ['Comics', 'Characters'],
    weaknesses: ['Low cost'],
    bestFor: ['illustration', 'character'],
    styleTags: ['illustration', 'artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['comic', 'character', 'arthemy'],
  },
  {
    id: 'rabbit-v7',
    name: 'Rabbit v7',
    provider: 'Community',
    description: 'Use this model born to draw cute little things. By Rabbit_YourMajesty',
    strengths: ['Cute', 'Little things'],
    weaknesses: ['Low cost'],
    bestFor: ['illustration', 'cute'],
    styleTags: ['illustration', 'artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['cute', 'drawing', 'rabbit'],
  },
  {
    id: 'nightmare-shaper-v3',
    name: 'Nightmare Shaper v3',
    provider: 'Community',
    description: 'Designed to unleash your darkest imaginations. By Yarner',
    strengths: ['Dark', 'Imagination'],
    weaknesses: ['Low cost'],
    bestFor: ['fantasy', 'dark'],
    styleTags: ['fantasy', 'artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['dark', 'imagination', 'nightmare'],
  },
  {
    id: 'wildlifefox-animals',
    name: 'WildlifeFOX Animals',
    provider: 'Community',
    description: 'A model focused on animals pets and different breeds. By lvr_fries1111',
    strengths: ['Animals', 'Pets', 'Breeds'],
    weaknesses: ['Low cost'],
    bestFor: ['photography', 'animal'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['animals', 'pets', 'breeds', 'wildlife'],
  },
  {
    id: 'realcartoon-pixar-v8',
    name: 'RealCartoon Pixar v8',
    provider: 'Community',
    description: 'An SD1.5 model good at pixar-style cartoons. By 7Whitefire7',
    strengths: ['Pixar style', 'Cartoons'],
    weaknesses: ['Very high cost'],
    bestFor: ['illustration', 'cartoon'],
    styleTags: ['illustration', 'artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['pixar', 'cartoon', 'style', 'realcartoon'],
  },
  {
    id: 'skaterbyte-v2',
    name: 'SkaterByte V2',
    provider: 'Community',
    description: 'An SD1.5 models good at 2SD art. By CameraBuddy',
    strengths: ['2SD art'],
    weaknesses: ['Very high cost'],
    bestFor: ['artistic', 'illustration'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['art', '2sd', 'skaterbyte'],
  },
  {
    id: 'juggernaut-reborn',
    name: 'Juggernaut Reborn',
    provider: 'RunDiffusion',
    description: 'An SD 1.5 model for perfect realism and cinematic styles. By kandooAI',
    strengths: ['Realism', 'Cinematic'],
    weaknesses: ['Very high cost'],
    bestFor: ['photorealistic', 'cinematic'],
    styleTags: ['photorealistic', 'cinematic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realism', 'cinematic', 'reborn', 'juggernaut'],
  },
  {
    id: 'sd1-5-dpo',
    name: 'SD1.5 DPO',
    provider: 'Stability AI',
    description: 'A Direct Preference Optimization (DPO) aligned version of SD1.5',
    strengths: ['DPO', 'Aligned', 'SD1.5'],
    weaknesses: ['Very high cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['dpo', 'aligned', 'sd1.5'],
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    provider: 'OpenAI',
    description: 'The original image generator from OpenAI',
    strengths: ['Original', 'OpenAI'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['original', 'openai', 'dalle'],
  },

  {
    id: 'stable-diffusion-1-5',
    name: 'Stable Diffusion 1.5',
    provider: 'Stability AI',
    description: 'The most popular first-generation stable-diffusion model',
    strengths: ['Popular', 'First-gen'],
    weaknesses: ['Very high cost', 'Old'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['stable diffusion', 'popular', '1.5'],
  },
  {
    id: 'stable-diffusion-1-4',
    name: 'Stable Diffusion 1.4',
    provider: 'Stability AI',
    description: 'The original Stable diffusion model',
    strengths: ['Original'],
    weaknesses: ['Very high cost', 'Old'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['stable diffusion', 'original', '1.4'],
  },
  {
    id: 'coherent',
    name: 'Coherent',
    provider: 'Community',
    description: 'CLIP-Guided Diffusion',
    strengths: ['CLIP-Guided'],
    weaknesses: ['Cost N/A'],
    bestFor: ['abstract'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['coherent', 'clip', 'diffusion'],
  },
  {
    id: 'artistic',
    name: 'Artistic',
    provider: 'Community',
    description: 'VQGAN+CLIP - the original text-to-image algorithm',
    strengths: ['Original algorithm'],
    weaknesses: ['Cost N/A'],
    bestFor: ['abstract', 'artistic'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['artistic', 'vqgan', 'clip'],
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    provider: 'Community',
    description: 'The original AI Art algorithm',
    strengths: ['Style transfer'],
    weaknesses: ['Low quality', 'Cost N/A'],
    bestFor: ['style transfer'],
    styleTags: ['artistic'],

    qualityRating: 1,
    speedRating: 1,
    keywords: ['style transfer', 'original'],
  },

  // === Qwen Additional ===
  {
    id: 'qwen-image-2512',
    name: 'Qwen Image 2512',
    provider: 'Alibaba',
    description: 'Qwen\'s Latest update with major rollout enhancements',
    strengths: ['Latest update', 'Enhancements'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['latest', 'enhancement', 'qwen'],
  },
  {
    id: 'qwen-image-edit-2511',
    name: 'Qwen Image Edit 2511',
    provider: 'Alibaba',
    description: 'It preserves people and keeps textures looking great no matter what you change. Easily',
    strengths: ['Preserves people', 'Textures'],
    weaknesses: ['Medium cost'],
    bestFor: ['editing', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['preserve', 'texture', 'editing', 'qwen'],
  },
  {
    id: 'qwen-image',
    name: 'Qwen Image',
    provider: 'Alibaba',
    description: 'A model from Alibaba that excels at typography',
    strengths: ['Typography'],
    weaknesses: ['Medium cost'],
    bestFor: ['typography', 'general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['typography', 'qwen'],
  },
  {
    id: 'qwen-image-sd',
    name: 'Qwen Image SD',
    provider: 'Alibaba',
    description: 'A cheaper and lower resolution version of Qwen Image',
    strengths: ['Cheaper'],
    weaknesses: ['Lower resolution', 'Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 4,
    speedRating: 3,
    keywords: ['cheaper', 'resolution', 'qwen'],
  },
  {
    id: 'qwen-image-edit',
    name: 'Qwen Image Edit',
    provider: 'Alibaba',
    description: 'Advanced image editing capabilities with Qwen AI',
    strengths: ['Advanced editing'],
    weaknesses: ['Medium cost'],
    bestFor: ['editing'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['editing', 'advanced', 'qwen'],
  },

  // === Flux Additional ===
  {
    id: 'flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'Black Forest Labs',
    description: 'Flux 2 with improved image quality and good speed generation',
    strengths: ['Improved quality', 'Speed'],
    weaknesses: ['Very high cost'],
    bestFor: ['general', 'illustration'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['improved', 'quality', 'speed', 'flux', 'pro'],
  },
  {
    id: 'flux-2-pro-dev',
    name: 'Flux 2 Pro Dev',
    provider: 'Black Forest Labs',
    description: 'Flux 2: better at typography and designs',
    strengths: ['Typography', 'Designs'],
    weaknesses: ['High cost'],
    bestFor: ['typography', 'design', 'general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['typography', 'design', 'flux', 'dev'],
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    provider: 'Black Forest Labs',
    description: 'Grounded generation with real-world context. Maximum quality for complex workflows',
    strengths: ['Grounded', 'Real-world context', 'Maximum quality'],
    weaknesses: ['Very high cost'],
    bestFor: ['complex', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['grounded', 'context', 'quality', 'flux', 'pro'],
  },
  {
    id: 'flux-2-lite',
    name: 'Flux 2 Lite',
    provider: 'Black Forest Labs',
    description: 'Creator realistic images with a focus on more correct human anatomy',
    strengths: ['Realistic', 'Anatomy'],
    weaknesses: ['Very high cost'],
    bestFor: ['photorealistic', 'portrait'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['realistic', 'anatomy', 'flux', 'lite'],
  },
  {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    provider: 'Black Forest Labs',
    description: 'A cheaper faster but slightly less powerful version of Flux',
    strengths: ['Cheaper', 'Faster'],
    weaknesses: ['Less powerful', 'Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['cheaper', 'faster', 'schnell', 'flux'],
  },
  {
    id: 'flux-pro-v1-1',
    name: 'Flux PRO v1.1',
    provider: 'Black Forest Labs',
    description: 'The full-power version of Flux by Black Forest Labs',
    strengths: ['Full power'],
    weaknesses: ['Very high cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['full power', 'pro', 'flux'],
  },
  {
    id: 'flux-kontext-dev',
    name: 'Flux Kontext Dev',
    provider: 'Black Forest Labs',
    description: 'Cheaper & faster version of Kontext still great at editing images using prompts',
    strengths: ['Cheaper', 'Faster', 'Editing'],
    weaknesses: ['Medium cost'],
    bestFor: ['editing'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['cheaper', 'faster', 'editing', 'kontext'],
  },

  // === Google Imagen Additional ===
  {
    id: 'google-imagen-4-0-fast',
    name: 'Google Imagen 4.0 Fast',
    provider: 'Google',
    description: 'A faster cheaper version of Imagen v4. Google\'s image model',
    strengths: ['Faster', 'Cheaper'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['photorealistic', 'artistic'],

    qualityRating: 5,
    speedRating: 5,
    keywords: ['faster', 'cheaper', 'imagen', 'google'],
  },
  {
    id: 'google-imagen-4-0',
    name: 'Google Imagen 4.0',
    provider: 'Google',
    description: 'Google\'s image model. Great at prompt adherence and typography',
    strengths: ['Prompt adherence', 'Typography'],
    weaknesses: ['Very high cost'],
    bestFor: ['typography', 'general'],
    styleTags: ['photorealistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['adherence', 'typography', 'imagen', 'google'],
  },

  // === HiDream Additional ===
  {
    id: 'hidream-11-full',
    name: 'HiDream 11 Full',
    provider: 'HiDream',
    description: 'The full power of HiDream 11 a state-of-the-art image generation model',
    strengths: ['Full power', 'State-of-the-art'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 3,
    keywords: ['full power', 'hidream'],
  },

  // === Ideogram Additional ===
  {
    id: 'ideogram-v3-turbo',
    name: 'Ideogram V3 Turbo',
    provider: 'Ideogram',
    description: 'The latest turbo model from Ideogram',
    strengths: ['Latest', 'Turbo'],
    weaknesses: ['Medium cost'],
    bestFor: ['general'],
    styleTags: ['artistic'],

    qualityRating: 5,
    speedRating: 4,
    keywords: ['latest', 'turbo', 'ideogram'],
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
      if (model.styleTags.includes('anime') || model.keywords.includes('anime')) {
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
