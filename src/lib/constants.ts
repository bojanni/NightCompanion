export const AI_ROLES = {
    GENERATION: 'generation',
    IMPROVEMENT: 'improvement',
    VISION: 'vision'
} as const;

export type AIRole = typeof AI_ROLES[keyof typeof AI_ROLES];

export const PROVIDERS = {
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GEMINI: 'google', // google/gemini often referred to as 'google' provider id in this app
    OPENROUTER: 'openrouter',
    TOGETHER: 'together',
    DEEPINFRA: 'deepinfra',
    OLLAMA: 'ollama',
    LMSTUDIO: 'lmstudio'
} as const;

export const LOCAL_PROVIDERS = {
    OLLAMA: PROVIDERS.OLLAMA,
    LMSTUDIO: PROVIDERS.LMSTUDIO
} as const;

export const DEFAULT_USER_ID = '88ea3bcb-d9a8-44b5-ac26-c90885a74686';
