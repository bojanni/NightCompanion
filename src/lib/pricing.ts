export interface ResolutionCost {
  resolution: string;
  multiplier: number;
  width: number;
  height: number;
}

export interface ModelPricing {
  modelId: string;
  baseCost: number;
}

export const RESOLUTION_COSTS: ResolutionCost[] = [
  { resolution: '512x512', multiplier: 1.0, width: 512, height: 512 },
  { resolution: '768x768', multiplier: 1.5, width: 768, height: 768 },
  { resolution: '1024x1024', multiplier: 2.0, width: 1024, height: 1024 },
  { resolution: '1024x768', multiplier: 1.8, width: 1024, height: 768 },
  { resolution: '768x1024', multiplier: 1.8, width: 768, height: 1024 },
  { resolution: '1280x720', multiplier: 2.2, width: 1280, height: 720 },
  { resolution: '1920x1080', multiplier: 3.5, width: 1920, height: 1080 },
];

export const MODEL_PRICING: ModelPricing[] = [
  { modelId: 'sd15', baseCost: 1 },
  { modelId: 'sdxl', baseCost: 3 },
  { modelId: 'sd3', baseCost: 8 },
  { modelId: 'flux', baseCost: 6 },
  { modelId: 'dalle2', baseCost: 4 },
  { modelId: 'dalle3', baseCost: 10 },
  { modelId: 'artistic-v3', baseCost: 2 },
  { modelId: 'realvisxl', baseCost: 3 },
  { modelId: 'dreamshaper-xl', baseCost: 3 },
  { modelId: 'juggernaut-xl', baseCost: 4 },
];

export function calculateGenerationCost(
  modelId: string,
  resolution: string,
  quantity: number = 1
): number {
  const modelPricing = MODEL_PRICING.find((m) => m.modelId === modelId);
  const resolutionCost = RESOLUTION_COSTS.find((r) => r.resolution === resolution);

  if (!modelPricing || !resolutionCost) {
    return 0;
  }

  const costPerImage = Math.ceil(modelPricing.baseCost * resolutionCost.multiplier);
  return costPerImage * quantity;
}

export function getModelBaseCost(modelId: string): number {
  const modelPricing = MODEL_PRICING.find((m) => m.modelId === modelId);
  return modelPricing?.baseCost ?? 0;
}

export function getResolutionMultiplier(resolution: string): number {
  const resolutionCost = RESOLUTION_COSTS.find((r) => r.resolution === resolution);
  return resolutionCost?.multiplier ?? 1.0;
}

export function estimateLLMCost(
  modelPromptPrice: string | undefined,
  modelCompletionPrice: string | undefined,
  currentPromptLength: number,
  maxWords: number
): string | null {
  if (!modelPromptPrice || !modelCompletionPrice) return null;
  const promptPrice = parseFloat(modelPromptPrice);
  const completionPrice = parseFloat(modelCompletionPrice);
  if (isNaN(promptPrice) || isNaN(completionPrice)) return null;

  // Estimate tokens: 1 word ~ 1.33 tokens.
  // Input: current prompt words
  // Input tokens are based on the current prompt length (plus some buffer for system/hidden context if we wanted to be precise, but simply words * 1.33 is a good enough estimate for user display)
  const inputTokens = Math.max(1, currentPromptLength) * 1.33;

  // Output: maxWords
  // Output tokens are based on the max requested length
  const outputTokens = maxWords * 1.33;

  const total = (inputTokens * promptPrice) + (outputTokens * completionPrice);

  if (total < 0.0001) return '< $0.0001';
  return `~ $${total.toFixed(4)}`;
}
