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

// Application API Base URL
// Can be overridden via environment variables if deployed
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3000';

