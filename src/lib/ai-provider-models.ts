export interface AIProviderModel {
    id: string;           // matches provider:model format e.g. "openai:gpt-4o"
    name: string;         // display name e.g. "GPT-4o"
    provider: string;     // "openai" | "anthropic" | "google" | "openrouter" | "ollama" | "lmstudio"
    capabilities: ('text' | 'vision' | 'reasoning')[];
    strengths: {
        creativity: number;    // 1-5
        instruction: number;   // 1-5
        speed: number;         // 1-5
        cost: 'free' | 'low' | 'medium' | 'high';
    };
    recommendedFor: ('generate' | 'improve' | 'vision')[];
    badge?: 'Best' | 'Fast' | 'Budget' | 'Local';
    note?: string;
}

export const AI_PROVIDER_MODELS: AIProviderModel[] = [
    {
        id: 'openai:gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: ['text', 'vision', 'reasoning'],
        strengths: { creativity: 4, instruction: 5, speed: 3, cost: 'high' },
        recommendedFor: ['generate', 'improve', 'vision'],
        badge: 'Best'
    },
    {
        id: 'openai:gpt-4o-mini',
        name: 'GPT-4o-mini',
        provider: 'openai',
        capabilities: ['text', 'vision'],
        strengths: { creativity: 3, instruction: 4, speed: 5, cost: 'low' },
        recommendedFor: ['generate', 'improve'],
        badge: 'Fast'
    },
    {
        id: 'anthropic:claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        capabilities: ['text', 'vision', 'reasoning'],
        strengths: { creativity: 4, instruction: 5, speed: 3, cost: 'medium' },
        recommendedFor: ['improve', 'vision'],
        note: 'Precise instruction following'
    },
    {
        id: 'anthropic:claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        capabilities: ['text', 'vision'],
        strengths: { creativity: 3, instruction: 4, speed: 5, cost: 'low' },
        recommendedFor: ['generate', 'improve'],
        badge: 'Fast'
    },
    {
        id: 'google:gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        capabilities: ['text', 'vision'],
        strengths: { creativity: 4, instruction: 4, speed: 5, cost: 'low' },
        recommendedFor: ['generate', 'vision'],
        badge: 'Budget'
    },
    {
        id: 'google:gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        capabilities: ['text', 'vision', 'reasoning'],
        strengths: { creativity: 4, instruction: 5, speed: 3, cost: 'medium' },
        recommendedFor: ['improve', 'vision']
    },
    {
        id: 'ollama:auto',
        name: 'Local Model (Ollama)',
        provider: 'ollama',
        capabilities: ['text'],
        strengths: { creativity: 3, instruction: 3, speed: 5, cost: 'free' },
        recommendedFor: ['generate', 'improve'],
        badge: 'Local',
        note: 'Uses your configured local model'
    },
    {
        id: 'lmstudio:auto',
        name: 'Local Model (LM Studio)',
        provider: 'lmstudio',
        capabilities: ['text'],
        strengths: { creativity: 3, instruction: 3, speed: 5, cost: 'free' },
        recommendedFor: ['generate', 'improve'],
        badge: 'Local'
    }
];

export type TaskType = 'generate' | 'improve' | 'vision';

export function getModelsForTask(task: TaskType): AIProviderModel[] {
    return AI_PROVIDER_MODELS.filter(m => m.recommendedFor.includes(task))
        .sort((a, b) => {
            // Sort: Best badge first, then by combined creativity + instruction desc
            if (a.badge === 'Best' && b.badge !== 'Best') return -1;
            if (b.badge === 'Best' && a.badge !== 'Best') return 1;

            const scoreA = a.strengths.creativity + a.strengths.instruction;
            const scoreB = b.strengths.creativity + b.strengths.instruction;
            return scoreB - scoreA;
        });
}

export function getModelById(id: string): AIProviderModel | undefined {
    return AI_PROVIDER_MODELS.find(m => m.id === id);
}

export function isVisionCapable(id: string): boolean {
    const model = getModelById(id);
    return model ? model.capabilities.includes('vision') : false;
}
