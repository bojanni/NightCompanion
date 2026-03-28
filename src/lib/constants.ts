export const LOCAL_PROVIDERS = {
  OLLAMA: 'ollama',
  LMSTUDIO: 'lmstudio',
} as const

export type AIRole = 'generation' | 'improvement' | 'vision' | 'general'
