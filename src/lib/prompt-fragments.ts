export interface StepOption {
  id: string;
  label: string;
  fragments: string[];
}

export interface BuilderStep {
  id: string;
  title: string;
  description: string;
  options: StepOption[];
}

export const SUBJECTS: string[] = [
  'a mystical deer standing',
  'a lone wanderer walking',
  'an ancient twisted tree',
  'a forgotten temple ruins',
  'a child with a lantern',
  'a wolf howling',
  'a samurai in meditation',
  'a girl reading under a tree',
  'a boy and his deer companion',
  'a dragon perched on a cliff',
  'an old lighthouse',
  'a mysterious hooded figure',
  'a pair of dancing fireflies',
  'a phoenix rising',
  'an astronaut floating',
  'a vintage train arriving',
  'a sleeping fox curled up',
  'a witch in her garden',
  'a knight facing a storm',
  'a mermaid on the rocks',
];

export const SETTINGS: string[] = [
  'in a misty redwood forest',
  'on dramatic ocean cliffs',
  'in a neon-lit cyberpunk alley',
  'in a vast desert with sand dunes',
  'on a snow-covered mountain peak',
  'in an enchanted mushroom grove',
  'in an abandoned cathedral',
  'by a crystal-clear lake',
  'in a floating sky city',
  'in a cherry blossom garden',
  'on a crumbling ancient bridge',
  'in a cozy candlelit library',
  'in a sprawling wildflower meadow',
  'beneath a massive aurora borealis',
  'in a dark bamboo forest',
  'on the deck of a ghost ship',
  'in a steampunk workshop',
  'at the edge of a waterfall',
  'in an overgrown greenhouse',
  'on a moonlit rooftop',
];

export const TIMES_OF_DAY: string[] = [
  'at dawn',
  'during golden hour',
  'at midnight under stars',
  'at sunset',
  'in the blue hour before sunrise',
  'during a thunderstorm',
  'on a misty morning',
  'under a full moon',
  'at twilight',
  'during an eclipse',
];

export const ATMOSPHERES: string[] = [
  'ethereal god rays piercing through',
  'volumetric fog swirling gently',
  'dramatic storm clouds gathering',
  'soft rain falling',
  'fireflies illuminating the darkness',
  'cherry blossoms drifting in the wind',
  'snow gently falling',
  'dust particles floating in light beams',
  'northern lights dancing overhead',
  'embers and sparks rising',
];

export const LIGHTING: string[] = [
  'soft golden light',
  'dramatic chiaroscuro lighting',
  'neon glow reflections',
  'bioluminescent ambient light',
  'candlelight warmth',
  'cold blue moonlight',
  'dappled sunlight through leaves',
  'backlit silhouette',
  'volumetric light rays',
  'warm sunset tones',
];

export const STYLES: string[] = [
  'photorealistic, 8k',
  'oil painting style, rich textures',
  'cinematic film still',
  'watercolor illustration',
  'dreamy ethereal atmosphere',
  'anime style, detailed',
  'dark fantasy art',
  'impressionist brushwork',
  'hyper-detailed digital art',
  'minimalist composition',
];

export const QUALITY_BOOSTERS: string[] = [
  'ultra detailed',
  'intricate details',
  'masterpiece quality',
  'award winning',
  'highly detailed textures',
  'sharp focus',
  'professional photograph',
  'trending on artstation',
  '8k resolution',
  'octane render',
];

export const DREAMY_MODIFIERS: string[] = [
  'dreamy atmosphere',
  'ethereal glow',
  'soft focus bokeh',
  'pastel color palette',
  'magical shimmer',
  'gentle mist',
  'otherworldly ambiance',
  'fairytale mood',
];

export const CHARACTER_ADDITIONS: string[] = [
  'a mysterious figure in the distance',
  'a child with a glowing lantern',
  'a boy walking with a deer companion',
  'a lone traveler with a cloak',
  'a girl with flowing hair',
  'a silhouetted warrior',
  'a small fairy hovering nearby',
  'an old sage with a staff',
];

export const CINEMATIC_MODIFIERS: string[] = [
  'cinematic composition',
  'anamorphic lens flare',
  'shallow depth of field',
  'color graded like a Terrence Malick film',
  'widescreen aspect ratio',
  'film grain texture',
  'dramatic camera angle',
  'blockbuster movie still',
];

export const GUIDED_STEPS: BuilderStep[] = [
  {
    id: 'base',
    title: 'Choose your subject',
    description: 'What is the main focus of your image?',
    options: [
      { id: 'landscape', label: 'Landscape', fragments: ['a sweeping landscape of', 'a panoramic view of', 'a vast expanse of'] },
      { id: 'character', label: 'Character', fragments: ['a mysterious figure', 'a lone wanderer', 'a young adventurer', 'a wise old sage'] },
      { id: 'creature', label: 'Creature', fragments: ['a mystical deer', 'a majestic dragon', 'a ethereal phoenix', 'a wise old owl'] },
      { id: 'architecture', label: 'Architecture', fragments: ['an ancient temple', 'a towering castle', 'a forgotten ruins', 'a cozy cottage'] },
      { id: 'portrait', label: 'Portrait', fragments: ['a close-up portrait of a', 'a detailed face study of a', 'an expressive portrait of a'] },
      { id: 'stilllife', label: 'Still Life', fragments: ['an arrangement of', 'a collection of', 'a detailed study of'] },
    ],
  },
  {
    id: 'environment',
    title: 'Set the scene',
    description: 'Where does this take place?',
    options: [
      { id: 'forest', label: 'Forest', fragments: ['in a dense misty forest', 'in an ancient redwood grove', 'in an enchanted woodland'] },
      { id: 'ocean', label: 'Ocean', fragments: ['on dramatic ocean cliffs', 'by a tranquil shore', 'on a stormy sea'] },
      { id: 'mountain', label: 'Mountain', fragments: ['on a snow-capped peak', 'in a mountain valley', 'on a windswept ridge'] },
      { id: 'urban', label: 'Urban', fragments: ['in a neon-lit city', 'in rain-soaked streets', 'on a quiet rooftop at night'] },
      { id: 'desert', label: 'Desert', fragments: ['in vast golden sand dunes', 'in a red rock canyon', 'in a blooming desert oasis'] },
      { id: 'space', label: 'Space', fragments: ['floating in deep space', 'on an alien planet surface', 'orbiting a distant nebula'] },
      { id: 'interior', label: 'Interior', fragments: ['in a candlelit library', 'in an overgrown greenhouse', 'in a steampunk workshop'] },
      { id: 'garden', label: 'Garden', fragments: ['in a cherry blossom garden', 'in a wildflower meadow', 'in an enchanted mushroom grove'] },
    ],
  },
  {
    id: 'time',
    title: 'Time of day',
    description: 'When does this scene happen?',
    options: [
      { id: 'dawn', label: 'Dawn', fragments: ['at dawn', 'as the first light breaks', 'in the early morning mist'] },
      { id: 'golden', label: 'Golden Hour', fragments: ['during golden hour', 'bathed in warm sunset light', 'in soft golden light'] },
      { id: 'midday', label: 'Midday', fragments: ['under bright midday sun', 'in harsh overhead light', 'under clear blue skies'] },
      { id: 'overcast', label: 'Overcast', fragments: ['under moody overcast skies', 'on a grey drizzly day', 'beneath heavy clouds'] },
      { id: 'sunset', label: 'Sunset', fragments: ['at sunset', 'as the sky turns orange and purple', 'with the last rays of sun'] },
      { id: 'twilight', label: 'Twilight', fragments: ['at twilight', 'during the blue hour', 'as stars begin to appear'] },
      { id: 'night', label: 'Night', fragments: ['under a starry night sky', 'beneath a full moon', 'in the dead of night'] },
      { id: 'storm', label: 'Storm', fragments: ['during a thunderstorm', 'with lightning splitting the sky', 'in driving rain'] },
    ],
  },
  {
    id: 'mood',
    title: 'Mood & atmosphere',
    description: 'What feeling should it evoke?',
    options: [
      { id: 'dreamy', label: 'Dreamy', fragments: ['dreamy ethereal atmosphere', 'soft magical glow', 'otherworldly ambiance'] },
      { id: 'dramatic', label: 'Dramatic', fragments: ['dramatic and intense', 'epic sense of scale', 'powerful emotional impact'] },
      { id: 'peaceful', label: 'Peaceful', fragments: ['serene and tranquil', 'calm meditative feeling', 'gentle and soothing'] },
      { id: 'moody', label: 'Moody', fragments: ['dark and moody', 'melancholic atmosphere', 'brooding tension'] },
      { id: 'mysterious', label: 'Mysterious', fragments: ['enigmatic and mysterious', 'shrouded in secrecy', 'haunting unknown presence'] },
      { id: 'joyful', label: 'Joyful', fragments: ['vibrant and joyful', 'celebratory energy', 'warm happiness radiating'] },
      { id: 'epic', label: 'Epic', fragments: ['grand epic scale', 'awe-inspiring majesty', 'heroic and monumental'] },
      { id: 'nostalgic', label: 'Nostalgic', fragments: ['warm nostalgic feeling', 'bittersweet memory', 'vintage timeless quality'] },
    ],
  },
  {
    id: 'style',
    title: 'Visual style',
    description: 'How should it look?',
    options: [
      { id: 'photorealistic', label: 'Photorealistic', fragments: ['photorealistic, 8k resolution, sharp focus'] },
      { id: 'cinematic', label: 'Cinematic', fragments: ['cinematic film still, anamorphic lens, color graded'] },
      { id: 'painterly', label: 'Painterly', fragments: ['oil painting style, rich textures, visible brushwork'] },
      { id: 'watercolor', label: 'Watercolor', fragments: ['delicate watercolor illustration, soft washes'] },
      { id: 'anime', label: 'Anime', fragments: ['detailed anime style, vibrant colors, clean lines'] },
      { id: 'fantasy', label: 'Fantasy Art', fragments: ['dark fantasy art, intricate details, epic composition'] },
      { id: 'minimal', label: 'Minimalist', fragments: ['minimalist composition, clean lines, negative space'] },
      { id: 'impressionist', label: 'Impressionist', fragments: ['impressionist style, dappled light, loose brushwork'] },
    ],
  },
];

export const OPTIONAL_ADDITIONS = [
  { id: 'figure', label: 'Add a lone figure', fragment: 'with a solitary figure in the distance' },
  { id: 'birds', label: 'Include birds', fragment: 'with birds soaring overhead' },
  { id: 'dreamy', label: 'Make it more dreamy', fragment: 'with a dreamy ethereal glow and soft bokeh' },
  { id: 'fog', label: 'Add fog/mist', fragment: 'with rolling mist and volumetric fog' },
  { id: 'reflection', label: 'Add water reflection', fragment: 'reflected in still water below' },
  { id: 'particles', label: 'Add floating particles', fragment: 'with dust particles dancing in light beams' },
  { id: 'flowers', label: 'Add wildflowers', fragment: 'surrounded by colorful wildflowers' },
  { id: 'stars', label: 'Add stars/fireflies', fragment: 'with glowing fireflies and distant stars' },
];

function pickRandom<T>(arr: T[], count: number = 1): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function generateRandomPrompt(filters: {
  dreamy: boolean;
  characters: boolean;
  cinematic: boolean;
}, greylist: string[] = []): string {
  const parts: string[] = [];

  const isAllowed = (item: string) => {
    if (!item || greylist.length === 0) return true;
    const lowerItem = item.toLowerCase();
    return !greylist.some(grey => lowerItem.includes(grey.toLowerCase()));
  };

  const pick = (arr: string[], count: number = 1) => {
    const valid = arr.filter(isAllowed);
    return valid.length > 0 ? pickRandom(valid, count).join(', ') : pickRandom(arr, count).join(', ');
  };

  parts.push(pick(SUBJECTS) || '');
  parts.push(pick(SETTINGS) || '');
  parts.push(pick(TIMES_OF_DAY) || '');

  // Occasionally pick 2 for atmosphere and lighting
  const atmosphereCount = Math.random() > 0.7 ? 2 : 1;
  parts.push(pick(ATMOSPHERES, atmosphereCount) || '');

  const lightingCount = Math.random() > 0.7 ? 2 : 1;
  parts.push(pick(LIGHTING, lightingCount) || '');

  if (filters.dreamy) {
    parts.push(pick(DREAMY_MODIFIERS) || '');
  }

  if (filters.characters) {
    parts.push('accompanied by ' + (pick(CHARACTER_ADDITIONS) || ''));
  }

  if (filters.cinematic) {
    parts.push(pick(CINEMATIC_MODIFIERS) || '');
  }

  parts.push(pick(STYLES) || '');
  parts.push(pick(QUALITY_BOOSTERS) || '');

  const raw = parts.filter(p => p).join(', ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function buildGuidedPrompt(
  selections: Record<string, string>,
  additions: string[],
  customInputs?: Record<string, string>
): string {
  const parts: string[] = [];

  GUIDED_STEPS.forEach((step) => {
    // Check for custom input first
    if (customInputs && customInputs[step.id]) {
      parts.push(customInputs[step.id] || '');
    } else {
      const selected = step.options.find((o) => o.id === selections[step.id]);
      if (selected) {
        parts.push(pickRandom(selected.fragments)[0] || '');
      }
    }
  });

  additions.forEach((addId) => {
    const addition = OPTIONAL_ADDITIONS.find((a) => a.id === addId);
    if (addition) {
      parts.push(addition.fragment);
    }
  });

  const raw = parts.filter(p => p).join(', ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
