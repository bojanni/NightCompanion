export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

export const PROVIDER_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, balanced performance' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation flagship' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and economical' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', description: 'Latest, fastest model' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable, large context' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest, most capable' },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Previous version' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI flagship' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Anthropic flagship' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', description: 'Google latest' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Open source flagship' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', description: 'Strong multilingual' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large', description: 'European flagship' },
  ],
  together: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B Turbo', description: 'Fast, high quality open model' },
    { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', description: 'Massive, GPT-4 class open model' },
    { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B Turbo', description: 'Strong reasoning & coding' },
    { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', description: 'Large MoE model' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'Efficient & capable' },
    { id: 'Gryphe/MythoMax-L2-13b', name: 'MythoMax 13B', description: 'Roleplay specialized' },
  ],
};

export function getModelsForProvider(provider: string): ModelOption[] {
  return PROVIDER_MODELS[provider] || [];
}

export function getDefaultModelForProvider(provider: string): string {
  const models = PROVIDER_MODELS[provider];
  return models && models.length > 0 ? models[0].id : '';
}
