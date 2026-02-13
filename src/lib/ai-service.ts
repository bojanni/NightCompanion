const API_URL = 'http://localhost:3000/api/ai';

async function callAI(action: string, payload: Record<string, unknown>, token: string) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Token is technically not needed for local backend if we mock user, 
      // but keeping it for consistency if we add real auth later
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data.error || 'AI request failed';
    // Only append details if they don't just repeat the error message
    const errorDetails = data.details && !data.details.includes(errorMessage) ? ` (${data.details})` : '';
    throw new Error(`${errorMessage}${errorDetails}`);
  }

  return data.result;
}

export async function improvePrompt(prompt: string, token: string, apiPreferences?: ApiPreferences): Promise<string> {
  const payload: Record<string, any> = { prompt };
  if (apiPreferences) payload.apiPreferences = apiPreferences;
  return callAI('improve', payload, token);
}

export async function improvePromptWithNegative(
  prompt: string,
  negativePrompt: string,
  token: string,
  apiPreferences?: ApiPreferences
): Promise<{ improved: string; negativePrompt: string }> {
  const payload: Record<string, any> = { prompt, negativePrompt };
  if (apiPreferences) payload.apiPreferences = apiPreferences;
  return callAI('improve-with-negative', payload, token);
}

export interface DetailedImprovement {
  improved: string;
  reasoning: string[];
  alternateVersions: Array<{
    variation: string;
    description: string;
    prompt: string;
  }>;
  changesSummary: string;
}

export interface ApiPreferences {
  provider: string;
  model?: string;
}

export async function improvePromptDetailed(
  prompt: string,
  token: string,
  apiPreferences?: ApiPreferences
): Promise<DetailedImprovement> {
  const payload: Record<string, any> = { prompt };
  if (apiPreferences) {
    payload.apiPreferences = apiPreferences;
  }
  return callAI('improve-detailed', payload, token);
}

export interface StyleAnalysis {
  profile: string;
  themes: string[];
  techniques: string[];
  suggestions: string[];
  signature: string;
}

export async function analyzeStyle(prompts: string[], token: string): Promise<StyleAnalysis> {
  return callAI('analyze-style', { prompts }, token);
}

export interface GeneratePreferences {
  style?: string | undefined;
  mood?: string | undefined;
  subject?: string | undefined;
  maxWords?: number | undefined;
}

export async function generateFromDescription(
  description: string,
  options: {
    context?: string | undefined;
    preferences?: GeneratePreferences | undefined;
    successfulPrompts?: string[] | undefined;
  },
  token: string
): Promise<string> {
  return callAI('generate', {
    description,
    context: options.context,
    preferences: options.preferences,
    successfulPrompts: options.successfulPrompts,
  }, token);
}

export async function generateRandomPromptAI(token: string, theme?: string, maxWords?: number): Promise<{ prompt: string; negativePrompt?: string; style?: string }> {
  return callAI('random', { theme, maxWords }, token);
}

export async function generateNegativePrompt(token: string): Promise<string> {
  return callAI('generate-negative-prompt', {}, token);
}

export interface Diagnosis {
  cause: string;
  fixes: string[];
  improvedPrompt: string;
}

export async function diagnosePrompt(prompt: string, issue: string, token: string): Promise<Diagnosis> {
  return callAI('diagnose', { prompt, issue }, token);
}

export interface ModelRecommendation {
  modelId: string;
  modelName: string;
  matchScore: number;
  reasoning: string;
  tips: string[];
  recommendedPreset?: string | undefined;
}

export interface RecommendModelsResult {
  recommendations: ModelRecommendation[];
}

export async function recommendModels(
  prompt: string,
  options?: { budget?: string; style?: string },
  token?: string
): Promise<RecommendModelsResult> {
  return callAI('recommend-models', {
    prompt,
    budget: options?.budget,
    style: options?.style,
  }, token ?? '');
}

export interface ImageAnalysisResult {
  composition: string;
  lighting: string;
  colors: string;
  technicalQuality: string;
  overallScore: number;
  promptMatch: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  improvedPrompt: string;
}

export async function analyzeImage(
  image: { imageUrl?: string; imageBase64?: string; imageMimeType?: string },
  promptUsed: string | undefined,
  token: string
): Promise<ImageAnalysisResult> {
  return callAI('analyze-image', {
    imageUrl: image.imageUrl,
    imageBase64: image.imageBase64,
    imageMimeType: image.imageMimeType,
    promptUsed,
  }, token);
}

export interface BatchImageAnalysis {
  imageIndex: number;
  model: string;
  overallScore: number;
  promptMatch: number;
  composition: string;
  lighting: string;
  colors: string;
  technicalQuality: string;
  strengths: string[];
  weaknesses: string[];
}

export interface BatchAnalysisResult {
  analyses: BatchImageAnalysis[];
  comparison: {
    winnerIndex: number;
    winnerReasoning: string;
    commonIssues: string[];
    modelStrengths: Record<string, string[]>;
  };
  improvedPrompt: string;
}

export interface BatchImageInput {
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  model: string;
}

export async function batchAnalyzeImages(
  images: BatchImageInput[],
  promptUsed: string | undefined,
  token: string
): Promise<BatchAnalysisResult> {
  return callAI('batch-analyze', { images, promptUsed }, token);
}

export interface PromptVariation {
  type: string;
  prompt: string;
  negativePrompt?: string;
}

export async function generatePromptVariations(
  basePrompt: string,
  token: string,
  count: number = 5,
  strategy: string = 'mixed'
): Promise<PromptVariation[]> {
  return callAI('generate-variations', { basePrompt, count, strategy }, token);
}

export async function testConnection(token: string): Promise<string> {
  return callAI('test-connection', {}, token);
}

export interface CharacterDescriptionResult {
  found: boolean;
  description?: string;
  reason?: string;
}

export async function describeCharacter(
  imageUrl: string,
  override: boolean,
  token: string
): Promise<CharacterDescriptionResult | string> {
  return callAI('describe-character', { imageUrl, override }, token);
}

export function resizeImageToBase64(file: File, maxSize = 1024): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          h = Math.round((h / w) * maxSize);
          w = maxSize;
        } else {
          w = Math.round((w / h) * maxSize);
          h = maxSize;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1] || '';
      resolve({ data: base64, mimeType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function generateTitle(prompt: string, token: string): Promise<string> {
  return callAI('generate-title', { prompt }, token);
}

export async function suggestTags(prompt: string, token: string): Promise<string> {
  return callAI('suggest-tags', { prompt }, token);
}

export async function optimizePromptForModel(
  prompt: string,
  targetModel: string,
  token: string,
  negativePrompt?: string,
  apiPreferences?: ApiPreferences
): Promise<{ optimizedPrompt: string; negativePrompt?: string }> {
  const payload: Record<string, any> = { prompt, targetModel, negativePrompt };
  if (apiPreferences) payload.apiPreferences = apiPreferences;
  return callAI('optimize-for-model', payload, token);
}

export interface ModelListItem {
  id: string;
  name: string;
  description?: string;
}

export async function listModels(
  token: string,
  provider?: string,
  apiKey?: string,
  endpointUrl?: string
): Promise<ModelListItem[]> {
  const payload: Record<string, any> = {};
  if (provider) payload.provider = provider;
  if (apiKey) payload.apiKey = apiKey;
  if (endpointUrl) payload.endpointUrl = endpointUrl;

  return callAI('list-models', payload, token);
}

