import { ipcMain } from 'electron'
import { app } from 'electron'
import path from 'path'
import { appendFile, mkdir, readFile } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { aiUsageEvents, nightcafeModels, openRouterModels } from '../../src/lib/schema'
import type { OpenRouterSettings } from './settings'
import { bumpSessionTotals } from './usage'

const AI_REQUEST_LOG_FILE = 'ai-api-requests.jsonl'
const TITLE_MAX_LENGTH = 140
const DEFAULT_MAX_WORDS = 70
const MAX_ALLOWED_WORDS = 100
const MAX_GENERATED_TAGS = 15

const LANGUAGE_INSTRUCTION = "CRITICAL: All output, including descriptions, reasoning, and analysis, MUST use English (UK) spelling and terminology (e.g., 'colour', 'centre', 'maximise')."

const BASE_PERSONA = `You are an expert AI Art Prompt Engineer specializing in NightCafe Studio. Your goal is to craft highly detailed, optimized text-to-image prompts for advanced generative AI models. ${LANGUAGE_INSTRUCTION}

Construct your prompts using the following elements, blending them seamlessly into a single, cohesive paragraph:
- Subject & Action: Clear, specific description of the main focus and what is happening.
- Style & Medium: Defined art form (e.g., 'digital concept art', 'oil on canvas', 'macro photography').
- Setting & Composition: Background, environment, camera angle (e.g., 'low angle shot', 'rule of thirds'), and framing.
- Lighting & Atmosphere: Specific lighting setups (e.g., 'volumetric lighting', 'golden hour') and mood.
- Technical Modifiers: Enhancement tags (e.g., '8k resolution', 'masterpiece', 'trending on ArtStation', 'intricate details').

STRICT FORMATTING RULE: Output ONLY the final prompt text. Do NOT use bullet points, line breaks, labels (like 'Subject:'), or introductory/concluding remarks. The output must be a single, flowing descriptive paragraph.`

const IMPROVE_INSTRUCTION = `Analyze the following basic concept and elevate it into a professional, highly detailed prompt following all your persona rules. Expand on missing elements (such as style, lighting, and composition) while strictly preserving the original intent.`
const IMPROVE_NEGATIVE_INSTRUCTION = `Improve the following negative prompt for AI image generation. Keep it concise, high-signal, comma-separated, and focused on common visual defects and unwanted artifacts. Remove duplicates, keep original intent, and return only the final negative prompt text.`
const NEGATIVE_PROMPT_INSTRUCTION = `Based on the following positive prompt, generate a concise negative prompt for NightCafe Studio. ${LANGUAGE_INSTRUCTION}

The negative prompt should list elements, styles, and artefacts to actively avoid in the generated image. Focus on:
- Technical flaws: blurry, out of focus, low resolution, jpeg artefacts, noise, grain, pixelated
- Compositional issues: cropped, cut off, bad framing, watermark, text, signature, border
- Anatomical errors (if figures are present): extra limbs, deformed hands, bad anatomy, mutated, disfigured
- Style conflicts: anything that contradicts the intended art style of the positive prompt
- Quality indicators: low quality, worst quality, draft, sketch (unless the style is intentionally sketch-like)

STRICT FORMATTING RULE: Output ONLY a comma-separated list of negative keywords and short phrases. No bullet points, no labels, no explanations. Single line output only.`

const TITLE_SYSTEM_INSTRUCTION = `You generate concise, descriptive library titles for AI art prompts. ${LANGUAGE_INSTRUCTION} Return only the final title text with no quotes, no labels, and no extra commentary. Keep it under ${TITLE_MAX_LENGTH} characters and aim for 4 to 10 words.`

const QUICK_EXPAND_CREATIVITY: Record<string, string> = {
  focused: 'Expand the following concept into a detailed AI art prompt. Stay true to the original idea â€” add specific art style, lighting, and composition details that faithfully serve the concept without straying from it.',
  balanced: 'Expand the following concept into a rich, vivid AI art prompt. Add complementary style, atmospheric lighting, interesting composition, and mood while preserving the original intent.',
  wild: 'Take bold creative liberties with the following concept. Push it in an unexpected artistic direction â€” unusual combinations, striking visual contrasts, or a unique aesthetic twist. Use the concept as a loose starting point, not a strict constraint.',
}

const QUICK_EXPAND_TEMPERATURES: Record<string, number> = {
  focused: 0.7,
  balanced: 1.0,
  wild: 1.4,
}

type Database = ReturnType<typeof drizzle<typeof schema>>

type AdvisorMode = 'rule' | 'ai'

type AdvisorModelRecord = {
  modelName: string
  description: string
  modelType: string
  mediaType: string
  artScore: string
  promptingScore: string
  realismScore: string
  typographyScore: string
  costTier: string
}

type AdvisorRecommendation = {
  modelName: string
  explanation: string
}

type AdvisorResult = {
  mode: AdvisorMode
  recommendation: AdvisorRecommendation
  alternatives: AdvisorRecommendation[]
  matchedSignals: string[]
  bestValue?: AdvisorRecommendation
  fastest?: AdvisorRecommendation
}

type ScoredAdvisorModel = {
  model: AdvisorModelRecord
  finalScore: number
  detail: {
    art: number
    realism: number
    typography: number
    prompting: number
    costTier: number
  }
}

function extractChatCompletionContent(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''

  const maybeChoices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(maybeChoices) || maybeChoices.length === 0) return ''

  const first = maybeChoices[0] as unknown
  if (typeof first !== 'object' || first === null) return ''

  const message = (first as { message?: unknown }).message
  if (typeof message === 'object' && message !== null) {
    const content = (message as { content?: unknown }).content
    if (typeof content === 'string' && content.trim()) return content.trim()
    if (Array.isArray(content)) {
      const out = content
        .map((part) => {
          if (typeof part === 'string') return part
          if (typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string')
            return String((part as { text: string }).text)
          return ''
        })
        .join('')
        .trim()
      if (out) return out
    }

    const reasoning = (message as { reasoning?: unknown }).reasoning
    if (typeof reasoning === 'string' && reasoning.trim()) return reasoning.trim()
  }

  const text = (first as { text?: unknown }).text
  if (typeof text === 'string') return text.trim()

  return ''
}

type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function estimateTokensFromText(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.ceil(trimmed.length / 4)
}

function extractTokenUsage(payload: unknown, fallback: { promptText: string; responseText: string }): TokenUsage {
  if (typeof payload === 'object' && payload !== null) {
    const usage = (payload as { usage?: unknown }).usage
    if (typeof usage === 'object' && usage !== null) {
      const promptTokens = toFiniteNumber((usage as { prompt_tokens?: unknown }).prompt_tokens)
      const completionTokens = toFiniteNumber((usage as { completion_tokens?: unknown }).completion_tokens)
      const totalTokens = toFiniteNumber((usage as { total_tokens?: unknown }).total_tokens)

      if (promptTokens || completionTokens || totalTokens) {
        return {
          promptTokens,
          completionTokens,
          totalTokens: totalTokens || promptTokens + completionTokens,
        }
      }
    }
  }

  const promptTokens = estimateTokensFromText(fallback.promptText)
  const completionTokens = estimateTokensFromText(fallback.responseText)
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  }
}

async function computeOpenRouterCostUsd(input: { db: Database; modelId: string; usage: TokenUsage }): Promise<number> {
  const [model] = await input.db
    .select({
      promptPrice: openRouterModels.promptPrice,
      completionPrice: openRouterModels.completionPrice,
    })
    .from(openRouterModels)
    .where(eq(openRouterModels.modelId, input.modelId))
    .limit(1)

  const promptPrice = toFiniteNumber(model?.promptPrice)
  const completionPrice = toFiniteNumber(model?.completionPrice)
  if (!promptPrice && !completionPrice) return 0

  return input.usage.promptTokens * promptPrice + input.usage.completionTokens * completionPrice
}

async function recordUsageEvent(input: {
  db: Database
  endpoint: string
  providerId: string
  modelId: string
  payload: unknown
  promptText: string
  responseText: string
  storePromptResponse: boolean
}): Promise<void> {
  const usage = extractTokenUsage(input.payload, { promptText: input.promptText, responseText: input.responseText })
  const costUsd = input.providerId === 'openrouter'
    ? await computeOpenRouterCostUsd({ db: input.db, modelId: input.modelId, usage })
    : 0

  bumpSessionTotals({
    calls: 1,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    costUsd,
  })

  await input.db
    .insert(aiUsageEvents)
    .values({
      endpoint: input.endpoint,
      providerId: input.providerId,
      modelId: input.modelId,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd,
      promptText: input.storePromptResponse ? input.promptText : null,
      responseText: input.storePromptResponse ? input.responseText : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
}

function appendPeriod(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return '.'
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function buildRuleExplanation(signals: string[], budgetMode: BudgetMode, isAlternative: boolean): string {
  const normalizedSignals = Array.from(new Set(signals))
    .filter((signal) => signal !== 'cost-sensitive' && signal !== 'budget')

  const hasOnlyGeneralBalance = normalizedSignals.length === 0
    || normalizedSignals.every((signal) => signal === 'general balance')

  if (hasOnlyGeneralBalance) {
    const base = isAlternative
      ? 'Goed alternatief met gebalanceerde kwaliteit.'
      : 'Aanbevolen als sterke alrounder voor deze prompt.'

    if (isAlternative) return base

    const suffix = budgetMode === 'cheap'
      ? ' Past binnen een zuinig budget.'
      : budgetMode === 'premium'
        ? ' Geoptimaliseerd voor maximale kwaliteit.'
        : ''

    return appendPeriod(`${base}${suffix}`)
  }

  const signalPhrases = normalizedSignals
    .filter((signal) => signal !== 'general balance')
    .map((signal) => {
      if (signal === 'realism') return 'fotorealistische kwaliteit'
      if (signal === 'typography') return 'tekst in beeld'
      if (signal === 'artistic style') return 'artistieke stijlen'
      if (signal === 'general balance') return 'algemene veelzijdigheid'
      return signal
    })

  const signalPhrase = signalPhrases.length > 0
    ? signalPhrases.join(' en ')
    : 'algemene veelzijdigheid'

  const prefix = isAlternative ? 'Sterk alternatief voor ' : 'Aanbevolen vanwege '
  const suffix = !isAlternative
    ? budgetMode === 'cheap'
      ? ' Past binnen een zuinig budget.'
      : budgetMode === 'premium'
        ? ' Geoptimaliseerd voor maximale kwaliteit.'
        : ''
    : ''

  return appendPeriod(`${prefix}${signalPhrase}.${suffix}`)
}

function findBestValue(scored: ScoredAdvisorModel[], budgetMode: BudgetMode): ScoredAdvisorModel | null {
  if (budgetMode === 'premium') return null

  const maxCostTier = budgetMode === 'cheap' ? 2 : 3
  return scored.find((entry) => entry.detail.costTier <= maxCostTier) ?? null
}

function isFastModelName(modelName: string): boolean {
  const normalizedName = modelName.trim().toLowerCase()
  return FAST_MODEL_HINTS.some((hint) => normalizedName.includes(hint))
}

function findFastest(scored: ScoredAdvisorModel[]): ScoredAdvisorModel | null {
  return scored.find((entry) => isFastModelName(entry.model.modelName)) ?? null
}

const REALISM_HINTS = [
  'realistic', 'photorealistic', 'photo', 'photography', 'portrait', 'cinematic', 'documentary',
  'natural light', 'true to life', 'hyperreal', 'lifestyle', 'headshot',
]

const TYPOGRAPHY_HINTS = [
  'text', 'title', 'logo', 'lettering', 'typography', 'poster', 'cover', 'font', 'headline',
  'caption', 'signage', 'wordmark', 'brand',
]

const ART_HINTS = [
  'illustration', 'digital art', 'concept art', 'painting', 'anime', 'fantasy', 'surreal',
  'watercolour', 'watercolor', 'oil painting', 'stylized', 'stylised', 'line art', 'comic',
]

const FAST_MODEL_HINTS = ['turbo', 'lightning', 'lite', 'schnell', 'fast', 'quick', 'speed']

type BudgetMode = 'cheap' | 'balanced' | 'premium'

function parseScore(value: string) {
  const numeric = Number.parseFloat(String(value ?? '').trim())
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(10, numeric))
}

function parseCostTier(value: string) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return 2
  const asNumber = Number.parseInt(raw, 10)
  if (Number.isFinite(asNumber)) return Math.max(1, Math.min(5, asNumber))
  if (raw.includes('low') || raw.includes('cheap') || raw.includes('budget')) return 1
  if (raw.includes('med')) return 2
  if (raw.includes('high') || raw.includes('expensive') || raw.includes('premium')) return 4
  return 2
}

function countMatches(text: string, hints: string[]) {
  return hints.reduce((count, hint) => (text.includes(hint) ? count + 1 : count), 0)
}

function normalizeWeights(base: { art: number; realism: number; typography: number; prompting: number }) {
  const sum = base.art + base.realism + base.typography + base.prompting
  if (sum <= 0) {
    return { art: 0.35, realism: 0.35, typography: 0.2, prompting: 0.1 }
  }

  return {
    art: base.art / sum,
    realism: base.realism / sum,
    typography: base.typography / sum,
    prompting: base.prompting / sum,
  }
}

function getRuleBasedRecommendation(prompt: string, models: AdvisorModelRecord[], budgetMode: BudgetMode): AdvisorResult {
  const normalizedPrompt = prompt.trim().toLowerCase()
  const realismHits = countMatches(normalizedPrompt, REALISM_HINTS)
  const typographyHits = countMatches(normalizedPrompt, TYPOGRAPHY_HINTS)
  const artHits = countMatches(normalizedPrompt, ART_HINTS)

  const matchedSignals: string[] = []
  if (realismHits > 0) matchedSignals.push('realism')
  if (typographyHits > 0) matchedSignals.push('typography')
  if (artHits > 0) matchedSignals.push('artistic style')
  if (budgetMode === 'cheap') matchedSignals.push('budget')
  if (matchedSignals.length === 0) matchedSignals.push('general balance')

  const weights = normalizeWeights({
    art: 0.35 + artHits * 0.2,
    realism: 0.35 + realismHits * 0.25,
    typography: 0.2 + typographyHits * 0.3,
    prompting: 0.1,
  })

  const scored: ScoredAdvisorModel[] = models
    .filter((model) => model.mediaType === 'image')
    .map((model) => {
      const art = parseScore(model.artScore)
      const realism = parseScore(model.realismScore)
      const typography = parseScore(model.typographyScore)
      const prompting = parseScore(model.promptingScore)
      const costTier = parseCostTier(model.costTier)

      const qualityScore =
        art * weights.art +
        realism * weights.realism +
        typography * weights.typography +
        prompting * weights.prompting

      const costPenalty = budgetMode === 'cheap'
        ? (costTier - 1) * 0.6
        : budgetMode === 'balanced'
          ? (costTier - 1) * 0.2
          : 0
      const finalScore = qualityScore - costPenalty

      return {
        model,
        finalScore,
        detail: {
          art,
          realism,
          typography,
          prompting,
          costTier,
        },
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)

  const best = scored[0]
  const alternatives = scored.slice(1, 4)

  if (!best) {
    return {
      mode: 'rule',
      recommendation: {
        modelName: 'No model available',
        explanation: 'No NightCafe image models are available in the cache yet.',
      },
      alternatives: [],
      matchedSignals,
    }
  }

  const bestValueCandidate = findBestValue(scored, budgetMode)
  const bestValue = bestValueCandidate && bestValueCandidate.model.modelName !== best.model.modelName
    ? {
      modelName: bestValueCandidate.model.modelName,
      explanation: `Best value under current budget mode (${budgetMode}) with strong fit score and cost tier ${bestValueCandidate.detail.costTier}.`,
    }
    : undefined

  const excludedModelNames = new Set<string>([
    best.model.modelName,
    ...(bestValue ? [bestValue.modelName] : []),
  ])
  const fastestCandidate = findFastest(scored)
  const fastestFallback = scored.find((entry) =>
    isFastModelName(entry.model.modelName) && !excludedModelNames.has(entry.model.modelName),
  )
  const fastestSelection = fastestCandidate && !excludedModelNames.has(fastestCandidate.model.modelName)
    ? fastestCandidate
    : fastestFallback

  const fastest = fastestSelection
    ? {
      modelName: fastestSelection.model.modelName,
      explanation: `Fastest-oriented option based on model family hints and overall fit score (cost tier ${fastestSelection.detail.costTier}).`,
    }
    : undefined

  return {
    mode: 'rule',
    recommendation: {
      modelName: best.model.modelName,
      explanation: buildRuleExplanation(matchedSignals, budgetMode, false),
    },
    alternatives: alternatives.map((entry) => ({
      modelName: entry.model.modelName,
      explanation: buildRuleExplanation(matchedSignals, budgetMode, true),
    })),
    matchedSignals,
    bestValue,
    fastest,
  }
}

function parseAdvisorAiResponse(rawContent: string): Pick<AdvisorResult, 'recommendation' | 'alternatives'> {
  const cleaned = rawContent.trim()
  try {
    const parsed = JSON.parse(cleaned) as {
      recommendedModel?: string
      reasoning?: string
      alternatives?: Array<{ modelName?: string; why?: string }>
    }

    const recommendedModel = String(parsed.recommendedModel || '').trim()
    const reasoning = String(parsed.reasoning || '').trim()
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives
        .map((alt) => ({
          modelName: String(alt.modelName || '').trim(),
          explanation: String(alt.why || '').trim(),
        }))
        .filter((alt) => alt.modelName.length > 0)
        .slice(0, 3)
      : []

    if (!recommendedModel) throw new Error('Missing recommendedModel in JSON payload')

    return {
      recommendation: {
        modelName: recommendedModel,
        explanation: reasoning || 'Recommended by AI analysis based on prompt semantics and model metadata.',
      },
      alternatives,
    }
  } catch {
    const firstLine = cleaned.split('\n').find((line) => line.trim().length > 0) || cleaned
    return {
      recommendation: {
        modelName: firstLine.slice(0, 120),
        explanation: cleaned,
      },
      alternatives: [],
    }
  }
}

async function getAdvisorRouteSelection() {
  const stored = await readStoredSettings()
  const roleRouting = stored.aiConfig?.dashboardRoleRouting
  const generalRoute = typeof roleRouting === 'object' && roleRouting !== null
    ? (roleRouting as Record<string, unknown>).general
    : undefined

  const providerId = typeof generalRoute === 'object' && generalRoute !== null
    ? String((generalRoute as Record<string, unknown>).providerId || '')
    : ''
  const modelId = typeof generalRoute === 'object' && generalRoute !== null
    ? String((generalRoute as Record<string, unknown>).modelId || '')
    : ''

  return { providerId, modelId, stored }
}

function normalizeGeneratedTitle(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .slice(0, TITLE_MAX_LENGTH)
    .trim()
}

function normalizeAiText(value: string) {
  return value
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\//g, '/')
    .replace(/\\([,.:;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeGeneratedTag(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^#+/, '')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function parseGeneratedTags(raw: string, existingTags: string[], maxTags: number) {
  const normalizedExisting = existingTags.map(normalizeGeneratedTag).filter(Boolean)
  const seen = new Set(normalizedExisting)
  const nextTags = [...normalizedExisting]

  const parsedCandidates = raw
    .split(/[,\n]/)
    .map(normalizeGeneratedTag)
    .filter(Boolean)

  for (const tag of parsedCandidates) {
    if (seen.has(tag)) continue
    seen.add(tag)
    nextTags.push(tag)
    if (nextTags.length >= maxTags) break
  }

  return nextTags.slice(0, maxTags)
}

function getAiRequestLogPath() {
  return path.join(app.getPath('userData'), 'logs', AI_REQUEST_LOG_FILE)
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function salvageJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid settings JSON')
  }

  const candidate = trimmed.slice(start, end + 1)
  return JSON.parse(candidate) as unknown
}

async function readStoredSettings(): Promise<{ openRouter?: Partial<OpenRouterSettings>; aiConfig?: { dashboardRoleRouting?: unknown; storeAiPromptResponseForUsage?: boolean; usageCurrency?: 'usd' | 'eur'; eurRate?: number }; localEndpoints?: unknown }> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf-8')
    try {
      return JSON.parse(raw) as { openRouter?: Partial<OpenRouterSettings>; aiConfig?: { dashboardRoleRouting?: unknown; storeAiPromptResponseForUsage?: boolean; usageCurrency?: 'usd' | 'eur'; eurRate?: number }; localEndpoints?: unknown }
    } catch {
      return salvageJsonObject(raw) as { openRouter?: Partial<OpenRouterSettings>; aiConfig?: { dashboardRoleRouting?: unknown; storeAiPromptResponseForUsage?: boolean; usageCurrency?: 'usd' | 'eur'; eurRate?: number }; localEndpoints?: unknown }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return {}
    console.warn('[ai] Failed to read settings.json; falling back to defaults:', error)
    return {}
  }
}

function normalizeBaseUrl(input: string) {
  return input.replace(/\/+$/, '')
}

function getLocalAuthHeader(endpoint: Record<string, unknown> | undefined): Record<string, string> {
  const apiKey = endpoint && typeof endpoint.apiKey === 'string' ? endpoint.apiKey.trim() : ''
  if (!apiKey) return {}
  return { Authorization: `Bearer ${apiKey}` }
}

async function appendAiRequestLog(record: Record<string, unknown>) {
  const logPath = getAiRequestLogPath()
  await mkdir(path.dirname(logPath), { recursive: true })
  await appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf-8')
}

export function registerAiIpc({
  db,
  getOpenRouterSettings,
  getAiApiRequestLoggingEnabled,
}: {
  db: Database
  getOpenRouterSettings: () => Promise<OpenRouterSettings>
  getAiApiRequestLoggingEnabled: () => Promise<boolean>
}) {
  ipcMain.handle('generator:adviseModel', async (_, input?: { prompt?: string; mode?: AdvisorMode; budgetMode?: BudgetMode }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let responseStatus: number | null = null
    let requestPayload: Record<string, unknown> | null = null
    let resultData: AdvisorResult | null = null
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      const mode: AdvisorMode = input?.mode === 'ai' ? 'ai' : 'rule'
      const budgetMode: BudgetMode = input?.budgetMode === 'cheap' ? 'cheap' : input?.budgetMode === 'premium' ? 'premium' : 'balanced'

      if (!prompt) {
        return { error: 'Enter a prompt or concept first.' }
      }

      const models = await db
        .select({
          modelName: nightcafeModels.modelName,
          description: nightcafeModels.description,
          modelType: nightcafeModels.modelType,
          mediaType: nightcafeModels.mediaType,
          artScore: nightcafeModels.artScore,
          promptingScore: nightcafeModels.promptingScore,
          realismScore: nightcafeModels.realismScore,
          typographyScore: nightcafeModels.typographyScore,
          costTier: nightcafeModels.costTier,
        })
        .from(nightcafeModels)

      if (models.length === 0) {
        return { error: 'No NightCafe models found in local cache yet.' }
      }

      if (mode === 'rule') {
        const advice = getRuleBasedRecommendation(prompt, models, budgetMode)
        resultData = advice
        return { data: advice }
      }

      const { providerId, modelId, stored } = await getAdvisorRouteSelection()
      if (!providerId || !modelId) {
        return { error: 'No advisor route is selected. Configure AI Configuration â†’ Research & Reasoning first.' }
      }

      requestProvider = providerId
      requestModel = modelId

      const compactModels = models
        .filter((model) => model.mediaType === 'image')
        .slice(0, 120)
        .map((model) => ({
          modelName: model.modelName,
          description: model.description,
          modelType: model.modelType,
          artScore: model.artScore,
          realismScore: model.realismScore,
          typographyScore: model.typographyScore,
          costTier: model.costTier,
        }))

      const advisorInstruction = [
        'You are a NightCafe model advisor.',
        LANGUAGE_INSTRUCTION,
        'Based on the user prompt and provided model metadata, recommend the best single model.',
        'Use the scores and description to justify fit for style, realism, typography, and cost sensitivity.',
        `User budget preference: ${budgetMode} — factor this into your recommendation.`,
        'Return strict JSON only with this shape:',
        '{"recommendedModel":"string","reasoning":"string","alternatives":[{"modelName":"string","why":"string"}]}',
        'Keep alternatives to max 3.',
      ].join(' ')

      const userContent = [
        `User prompt/concept: ${prompt}`,
        `Available models JSON: ${JSON.stringify(compactModels)}`,
      ].join('\n\n')

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.2,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: advisorInstruction },
            { role: 'user', content: userContent },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status
        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        console.log('[adviseModel] OpenRouter raw payload:', JSON.stringify(payload, null, 2).slice(0, 2000))
        const raw = extractChatCompletionContent(payload)
        console.log('[adviseModel] extracted content:', raw ? raw.slice(0, 500) : '(empty)')
        if (!raw) {
          throw new Error(`No advisor response content returned. Payload snippet: ${JSON.stringify(payload, null, 0).slice(0, 400)}`)
        }

        await recordUsageEvent({
          db,
          endpoint: 'generator:adviseModel',
          providerId,
          modelId,
          payload,
          promptText: userContent,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        const parsed = parseAdvisorAiResponse(raw)
        const advice: AdvisorResult = {
          mode: 'ai',
          recommendation: parsed.recommendation,
          alternatives: parsed.alternatives,
          matchedSignals: ['semantic-ai-analysis'],
        }
        resultData = advice
        return { data: advice }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†’ Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.2,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: advisorInstruction },
          { role: 'user', content: userContent },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getLocalAuthHeader(endpoint) },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      console.log('[adviseModel] Local raw payload:', JSON.stringify(payload, null, 2).slice(0, 2000))
      const raw = extractChatCompletionContent(payload)
      console.log('[adviseModel] extracted content:', raw ? raw.slice(0, 500) : '(empty)')
      if (!raw) {
        throw new Error(`No advisor response content returned. Payload snippet: ${JSON.stringify(payload, null, 0).slice(0, 400)}`)
      }

      await recordUsageEvent({
        db,
        endpoint: 'generator:adviseModel',
        providerId,
        modelId,
        payload,
        promptText: userContent,
        responseText: raw,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      const parsed = parseAdvisorAiResponse(raw)
      const advice: AdvisorResult = {
        mode: 'ai',
        recommendation: parsed.recommendation,
        alternatives: parsed.alternatives,
        matchedSignals: ['semantic-ai-analysis'],
      }
      resultData = advice
      return { data: advice }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:adviseModel',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultData,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:magicRandom', async (_, input?: { presetName?: string; presetPrompt?: string; maxWords?: number; greylistEnabled?: boolean; greylistWords?: string[]; greylistEntries?: Array<{ word: string; weight: 1 | 2 | 3 | 4 | 5 }>; creativity?: 'focused' | 'balanced' | 'wild'; character?: { name: string; description: string } }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let appliedMaxWords = DEFAULT_MAX_WORDS
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const settings = await getOpenRouterSettings()
      requestModel = settings.model

      if (!settings.apiKey) {
        return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
      }

      const presetName = input?.presetName?.trim()
      const maxWords = Number.isFinite(input?.maxWords)
        ? Math.max(1, Math.min(MAX_ALLOWED_WORDS, Math.floor(input?.maxWords as number)))
        : DEFAULT_MAX_WORDS
      appliedMaxWords = maxWords
      const greylistEnabled = input?.greylistEnabled !== false
      const greylistWords = (input?.greylistWords ?? [])
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0)

      const normalizedEntries = (input?.greylistEntries ?? [])
        .map((entry) => ({
          word: entry.word.trim().toLowerCase(),
          weight: Math.max(1, Math.min(5, entry.weight)) as 1 | 2 | 3 | 4 | 5,
        }))
        .filter((entry) => entry.word.length > 0)

      const weightedByWord = new Map<string, 1 | 2 | 3 | 4 | 5>()
      for (const entry of normalizedEntries) weightedByWord.set(entry.word, entry.weight)

      const uniqueGreylistWords = Array.from(new Set(greylistWords)).slice(0, 30)
      const hasGreylist = greylistEnabled && (uniqueGreylistWords.length > 0 || weightedByWord.size > 0)

      const weightedInstruction = (() => {
        if (!greylistEnabled) return ''

        const entries = Array.from(weightedByWord.entries())
          .map(([word, weight]) => ({ word, weight }))
          .sort((a, b) => a.word.localeCompare(b.word))
          .slice(0, 30)

        if (entries.length === 0) return ''

        const weightToChance = (weight: 1 | 2 | 3 | 4 | 5) => {
          if (weight === 1) return '0% (never use)'
          if (weight === 2) return '1%'
          if (weight === 3) return '2%'
          if (weight === 4) return '3%'
          return '5%'
        }

        return `Greylist weights (keep usage very low): ${entries.map((e) => `${e.word}=${weightToChance(e.weight)}`).join(', ')}.`
      })()

      const creativity = input?.creativity || 'balanced'
      const character = input?.character;
      
      // Map creativity to temperature
      const temperatureMap = { focused: 0.7, balanced: 1.0, wild: 1.3 } as const;
      const temperature = temperatureMap[creativity];

      const promptParts = [
        'Create one random, vivid text-to-image prompt.',
        `Limit the final prompt to a maximum of ${maxWords} words.`,
        presetName ? `Use this NightCafe preset as mandatory style guidance: ${presetName}.` : '',
        character ? `Include this character: ${character.name}. ${character.description}` : '',
        creativity === 'focused' ? 'Be specific and grounded.' : 
          creativity === 'wild' ? 'Be experimental and surreal.' : 
          'Balance creativity with clarity.',
        'Pick any surprising subject.',
        hasGreylist
          ? `Avoid these words when writing the prompt (or keep their probability very low): ${uniqueGreylistWords.join(', ')}.`
          : '',
        weightedInstruction,
        'Return only the final prompt text.',
      ].filter(Boolean)

      const userPrompt = promptParts.join(' ')

      requestPayload = {
        model: settings.model,
        temperature,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: BASE_PERSONA,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
          ...(settings.appName ? { 'X-Title': settings.appName } : {}),
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown

      const prompt = extractChatCompletionContent(payload)
      if (!prompt) {
        throw new Error('No prompt content returned from OpenRouter.')
      }

      const stored = await readStoredSettings()
      await recordUsageEvent({
        db,
        endpoint: 'generator:magicRandom',
        providerId: 'openrouter',
        modelId: settings.model,
        payload,
        promptText: userPrompt,
        responseText: prompt,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultPrompt = prompt

      return { data: { prompt } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:magicRandom',
          provider: 'openrouter',
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          input: {
            presetName: input?.presetName?.trim() || null,
            presetPrompt: input?.presetPrompt?.trim() || null,
            maxWords: appliedMaxWords,
            greylistEnabled: input?.greylistEnabled !== false,
            greylistWordCount: (input?.greylistWords ?? []).filter((word) => word.trim().length > 0).length,
          },
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generateTags', async (_, input?: { title?: string; prompt?: string; negativePrompt?: string; existingTags?: string[]; maxTags?: number }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultTags: string[] = []
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      const title = input?.title?.trim() || ''
      const negativePrompt = input?.negativePrompt?.trim() || ''
      const existingTags = Array.isArray(input?.existingTags) ? input?.existingTags.map((tag) => String(tag || '').trim()).filter(Boolean) : []
      const maxTags = Number.isFinite(input?.maxTags) ? Math.max(1, Math.min(MAX_GENERATED_TAGS, Math.floor(input?.maxTags as number))) : MAX_GENERATED_TAGS

      if (!prompt) {
        return { error: 'Enter a prompt first before generating tags.' }
      }

      const { providerId, modelId, stored } = await getAdvisorRouteSelection()
      if (!providerId || !modelId) {
        return { error: 'No advisor route is selected. Configure AI Configuration â†’ Research & Reasoning first.' }
      }

      requestProvider = providerId
      requestModel = modelId

      const tagInstruction = [
        'You generate concise library tags for AI image prompts.',
        LANGUAGE_INSTRUCTION,
        `Return only a comma-separated list of up to ${maxTags} tags.`,
        'Use lowercase tags only.',
        'Prefer short tags of one to three words.',
        'Do not include numbering, explanations, or duplicate ideas.',
        'Focus on subject, style, mood, lighting, setting, and medium when relevant.',
      ].join(' ')

      const userContent = [
        title ? `Title: ${title}` : '',
        `Prompt: ${prompt}`,
        negativePrompt ? `Negative prompt: ${negativePrompt}` : '',
        existingTags.length > 0 ? `Existing tags: ${existingTags.join(', ')}` : '',
      ].filter(Boolean).join('\n')

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.3,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: tagInstruction },
            { role: 'user', content: userContent },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status
        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const raw = extractChatCompletionContent(payload)
        if (!raw) throw new Error('No generated tags returned.')

        resultTags = parseGeneratedTags(raw, existingTags, maxTags)

        await recordUsageEvent({
          db,
          endpoint: 'generator:generateTags',
          providerId,
          modelId,
          payload,
          promptText: userContent,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })
        return { data: { tags: resultTags } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†' Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.3,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: tagInstruction },
          { role: 'user', content: userContent },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      const raw = extractChatCompletionContent(payload)
      if (!raw) throw new Error('No generated tags returned.')

      resultTags = parseGeneratedTags(raw, existingTags, maxTags)

      await recordUsageEvent({
        db,
        endpoint: 'generator:generateTags',
        providerId,
        modelId,
        payload,
        promptText: userContent,
        responseText: raw,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })
      return { data: { tags: resultTags } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generateTags',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultTags,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:improvePrompt', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No prompt to improve.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration â†’ Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.7,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content: BASE_PERSONA,
            },
            {
              role: 'user',
              content: `${IMPROVE_INSTRUCTION}\n\n${prompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown

        const improved = extractChatCompletionContent(payload)
        if (!improved) throw new Error('No improved prompt content returned.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:improvePrompt',
          providerId,
          modelId,
          payload,
          promptText: prompt,
          responseText: improved,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultPrompt = improved
        return { data: { prompt: improved, providerId, modelId } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†' Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.7,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: BASE_PERSONA,
          },
          {
            role: 'user',
            content: `${IMPROVE_INSTRUCTION}\n\n${prompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getLocalAuthHeader(endpoint),
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown

      const improved = extractChatCompletionContent(payload)
      if (!improved) throw new Error('No improved prompt content returned.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:improvePrompt',
        providerId,
        modelId,
        payload,
        promptText: prompt,
        responseText: improved,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultPrompt = improved
      return { data: { prompt: improved, providerId, modelId } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:improvePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:improveNegativePrompt', async (_, input?: { negativePrompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const negativePrompt = input?.negativePrompt?.trim() || ''
      if (!negativePrompt) return { error: 'No negative prompt to improve.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration â†’ Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content: LANGUAGE_INSTRUCTION,
            },
            {
              role: 'user',
              content: `${IMPROVE_NEGATIVE_INSTRUCTION}\n\n${negativePrompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown

        const improved = extractChatCompletionContent(payload)
        if (!improved) throw new Error('No improved negative prompt content returned.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:improveNegativePrompt',
          providerId,
          modelId,
          payload,
          promptText: negativePrompt,
          responseText: improved,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultPrompt = improved
        return { data: { negativePrompt: improved } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†’ Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: LANGUAGE_INSTRUCTION,
          },
          {
            role: 'user',
            content: `${IMPROVE_NEGATIVE_INSTRUCTION}\n\n${negativePrompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown

      const improved = extractChatCompletionContent(payload)
      if (!improved) throw new Error('No improved negative prompt content returned.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:improveNegativePrompt',
        providerId,
        modelId,
        payload,
        promptText: negativePrompt,
        responseText: improved,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultPrompt = improved
      return { data: { negativePrompt: improved } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:improveNegativePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generateNegativePrompt', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No positive prompt available to generate a negative prompt.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration â†’ Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content: LANGUAGE_INSTRUCTION,
            },
            {
              role: 'user',
              content: `${NEGATIVE_PROMPT_INSTRUCTION}\n\n${prompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown

        const generated = extractChatCompletionContent(payload)
        if (!generated) throw new Error('No generated negative prompt content returned.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:generateNegativePrompt',
          providerId,
          modelId,
          payload,
          promptText: prompt,
          responseText: generated,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultPrompt = generated
        return { data: { negativePrompt: generated } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†’ Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: LANGUAGE_INSTRUCTION,
          },
          {
            role: 'user',
            content: `${NEGATIVE_PROMPT_INSTRUCTION}\n\n${prompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown

      const generated = extractChatCompletionContent(payload)
      if (!generated) throw new Error('No generated negative prompt content returned.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:generateNegativePrompt',
        providerId,
        modelId,
        payload,
        promptText: prompt,
        responseText: generated,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultPrompt = generated
      return { data: { negativePrompt: generated } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generateNegativePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generateTitle', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultTitle = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No prompt available to title.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration â†’ Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content: TITLE_SYSTEM_INSTRUCTION,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown

        const raw = extractChatCompletionContent(payload)
        const title = normalizeGeneratedTitle(raw)
        if (!title) throw new Error('No title content returned.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:generateTitle',
          providerId,
          modelId,
          payload,
          promptText: prompt,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultTitle = title
        return { data: { title } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†' Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: TITLE_SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown

      const raw = extractChatCompletionContent(payload)
      const title = normalizeGeneratedTitle(raw)
      if (!title) throw new Error('No title content returned.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:generateTitle',
        providerId,
        modelId,
        payload,
        promptText: prompt,
        responseText: raw,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultTitle = title
      return { data: { title } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generateTitle',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultTitle || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:quickExpand', async (_, input?: {
    idea?: string
    presetName?: string
    presetPrompt?: string
    creativity?: 'focused' | 'balanced' | 'wild'
    character?: { name: string; description?: string }
  }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const idea = input?.idea?.trim() || ''
      if (!idea) return { error: 'No idea provided for expansion.' }

      const creativity = input?.creativity || 'balanced'
      const presetName = input?.presetName?.trim()
      const character = input?.character

      const creativityInstruction = QUICK_EXPAND_CREATIVITY[creativity]
      const temperature = QUICK_EXPAND_TEMPERATURES[creativity]

      const characterContext = character?.name
        ? `\n\nCharacter context: The prompt should feature "${character.name}".${character.description ? ` Character description: ${character.description}` : ''}`
        : ''

      const presetContext = presetName
        ? `\n\nNightCafe preset guidance: Use this preset as mandatory style guidance: ${presetName}.`
        : ''

      const userPrompt = `${creativityInstruction}\n\nUser's concept: ${idea}${presetContext}${characterContext}`

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const genRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).generation
        : undefined

      const providerId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).modelId || '')
        : ''

      // Fall back to main OpenRouter settings if no generation route configured
      if (!providerId || !modelId) {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestProvider = 'openrouter'
        requestModel = settings.model

        requestPayload = {
          model: settings.model,
          temperature,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: BASE_PERSONA },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const prompt = extractChatCompletionContent(payload)
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        const stored = await readStoredSettings()
        await recordUsageEvent({
          db,
          endpoint: 'generator:quickExpand',
          providerId: 'openrouter',
          modelId: settings.model,
          payload,
          promptText: userPrompt,
          responseText: prompt,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        const cleanedPrompt = normalizeAiText(prompt)
        resultPrompt = cleanedPrompt
        return { data: { prompt: cleanedPrompt } }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestPayload = {
          model: modelId,
          temperature,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: BASE_PERSONA },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const prompt = extractChatCompletionContent(payload)
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        const cleanedPrompt = normalizeAiText(prompt)
        resultPrompt = cleanedPrompt
        return { data: { prompt: cleanedPrompt } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration â†’ Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: BASE_PERSONA },
          { role: 'user', content: userPrompt },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      const prompt = extractChatCompletionContent(payload)
      if (!prompt) throw new Error('No prompt content returned from local provider.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:quickExpand',
        providerId,
        modelId,
        payload,
        promptText: userPrompt,
        responseText: prompt,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      const cleanedPrompt = normalizeAiText(prompt)
      resultPrompt = cleanedPrompt
      return { data: { prompt: cleanedPrompt } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:quickExpand',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          input: {
            idea: input?.idea?.trim() || null,
            presetName: input?.presetName?.trim() || null,
            creativity: input?.creativity || 'balanced',
            hasCharacter: !!(input?.character?.name),
          },
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:simpleGenerate', async (_, input?: {
    fieldType?: 'subject' | 'style' | 'lighting' | 'mood' | 'artist' | 'technical'
    maxWords?: number
  }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultText = ''
    let errorMessage: string | null = null

    try {
      const fieldType = input?.fieldType || 'subject'
      const maxWords = input?.maxWords || 5

      // Field-specific brief prompts
      const fieldPrompts: Record<string, string> = {
        subject: 'Generate a short subject (1-3 words). Examples: "a tree", "a yellow frog", "a mountain lake". Only the core subject.',
        style: 'Generate an art style (1-3 words). Examples: "oil painting", "digital art", "watercolor". Only the style name.',
        lighting: 'Generate lighting description (1-3 words). Examples: "golden hour", "moonlight", "dramatic lighting". Only lighting.',
        mood: 'Generate a mood (1-2 words). Examples: "dreamy", "mysterious", "serene". Only the mood word.',
        artist: 'Generate an artist name or art movement (1-3 words). Examples: "Van Gogh", "Alphonse Mucha", "Art Nouveau", "Impressionism". Just the name, no "in the style of".',
        technical: 'Generate technical specs (2-4 words). Examples: "8k resolution", "highly detailed", "octane render". Only specs.',
      }

      const userPrompt = fieldPrompts[fieldType] || fieldPrompts.subject

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const genRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).generation
        : undefined

      const providerId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).modelId || '')
        : ''

      // Simple system prompt - no BASE_PERSONA
      const simpleSystemPrompt = `You generate short, simple text for AI art prompt fields. ${LANGUAGE_INSTRUCTION} Output ONLY the requested content. No explanations, no extra text. Keep it brief.`

      // Fall back to main OpenRouter settings if no generation route configured
      if (!providerId || !modelId) {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestProvider = 'openrouter'
        requestModel = settings.model

        requestPayload = {
          model: settings.model,
          temperature: 0.8,
          max_tokens: 60,
          messages: [
            { role: 'system', content: simpleSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const raw = extractChatCompletionContent(payload)
        if (!raw) throw new Error('No content returned from OpenRouter.')

        // Enforce word limit
        const words = raw.trim().split(/\s+/).slice(0, maxWords)
        resultText = words.join(' ')

        await recordUsageEvent({
          db,
          endpoint: 'generator:simpleGenerate',
          providerId: 'openrouter',
          modelId: settings.model,
          payload,
          promptText: userPrompt,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        return { data: { text: resultText } }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestPayload = {
          model: modelId,
          temperature: 0.8,
          max_tokens: 60,
          messages: [
            { role: 'system', content: simpleSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const raw = extractChatCompletionContent(payload)
        if (!raw) throw new Error('No content returned from OpenRouter.')

        // Enforce word limit
        const words = raw.trim().split(/\s+/).slice(0, maxWords)
        resultText = words.join(' ')

        await recordUsageEvent({
          db,
          endpoint: 'generator:simpleGenerate',
          providerId,
          modelId,
          payload,
          promptText: userPrompt,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        return { data: { text: resultText } }
      }

      // Local provider path
      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.8,
        max_tokens: 60,
        messages: [
          { role: 'system', content: simpleSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      const raw = extractChatCompletionContent(payload)
      if (!raw) throw new Error('No content returned from local provider.')

      // Enforce word limit
      const words = raw.trim().split(/\s+/).slice(0, maxWords)
      resultText = words.join(' ')

      await recordUsageEvent({
        db,
        endpoint: 'generator:simpleGenerate',
        providerId,
        modelId,
        payload,
        promptText: userPrompt,
        responseText: raw,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      return { data: { text: resultText } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:simpleGenerate',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responseText: resultText || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generatePromptFromFields', async (_, input?: {
    subject?: string
    style?: string
    lighting?: string
    mood?: string
    artist?: string
    technical?: string
    creativity?: 'focused' | 'balanced' | 'wild'
    maxWords?: number
  }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const fields = {
        subject: input?.subject?.trim() || '',
        style: input?.style?.trim() || '',
        lighting: input?.lighting?.trim() || '',
        mood: input?.mood?.trim() || '',
        artist: input?.artist?.trim() || '',
        technical: input?.technical?.trim() || '',
      }

      const creativity = input?.creativity === 'focused'
        ? 'focused'
        : input?.creativity === 'wild'
          ? 'wild'
          : 'balanced'

      const requestedMaxWords = typeof input?.maxWords === 'number' && Number.isFinite(input.maxWords)
        ? Math.max(1, Math.floor(input.maxWords))
        : null

      const temperature = creativity === 'focused' ? 0.5 : creativity === 'wild' ? 1.1 : 0.8

      // Build instruction based on what fields are provided
      const providedFields = Object.entries(fields)
        .filter(([, value]) => value.length > 0)
        .map(([key]) => key)

      const emptyFields = Object.entries(fields)
        .filter(([, value]) => value.length === 0)
        .map(([key]) => key)

      const fieldDescriptions: Record<string, string> = {
        subject: 'the main subject/content',
        style: 'the art style/medium',
        lighting: 'the lighting conditions',
        mood: 'the mood/atmosphere',
        artist: 'artist references or art movement',
        technical: 'technical specifications and quality modifiers',
      }

      let userPrompt = 'Generate a complete, detailed NightCafe Studio prompt for AI art generation.\n\n'

      if (providedFields.length > 0) {
        userPrompt += 'Use the following provided elements:\n'
        for (const [key, value] of Object.entries(fields)) {
          if (value) {
            userPrompt += `- ${fieldDescriptions[key]}: "${value}"\n`
          }
        }
      }

      if (emptyFields.length > 0) {
        userPrompt += '\nFor the following elements, generate appropriate content yourself:\n'
        for (const field of emptyFields) {
          userPrompt += `- ${fieldDescriptions[field]}\n`
        }
      }

      userPrompt += '\nCombine all elements into a single, cohesive, detailed prompt. Expand on the provided elements with additional descriptive details.'

      if (requestedMaxWords) {
        userPrompt += ` Keep the final prompt under ${requestedMaxWords} words.`
      }

      userPrompt += ' Output ONLY the final prompt text, no explanations or labels.'

      const systemPrompt = `You are an expert AI Art Prompt Engineer for NightCafe Studio. ${LANGUAGE_INSTRUCTION} 
Create detailed, optimized prompts that work well with text-to-image models.
Blend all elements seamlessly into a flowing description.
Add rich details (textures, composition, camera angle, atmosphere) while preserving the user's intent.
Output ONLY the final prompt as a single paragraph. No bullet points, no labels, no introductory text.`

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const genRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).generation
        : undefined

      const providerId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).modelId || '')
        : ''

      // Fall back to main OpenRouter settings if no generation route configured
      if (!providerId || !modelId) {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestProvider = 'openrouter'
        requestModel = settings.model

        requestPayload = {
          model: settings.model,
          temperature,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const prompt = extractChatCompletionContent(payload)
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:generatePromptFromFields',
          providerId: 'openrouter',
          modelId: settings.model,
          payload,
          promptText: userPrompt,
          responseText: prompt,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultPrompt = normalizeAiText(prompt)

        if (requestedMaxWords) {
          resultPrompt = resultPrompt.split(/\s+/).slice(0, requestedMaxWords).join(' ')
        }

        return { data: { prompt: resultPrompt } }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestPayload = {
          model: modelId,
          temperature,
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const prompt = extractChatCompletionContent(payload)
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        await recordUsageEvent({
          db,
          endpoint: 'generator:generatePromptFromFields',
          providerId,
          modelId,
          payload,
          promptText: userPrompt,
          responseText: prompt,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        resultPrompt = prompt.trim()

        if (requestedMaxWords) {
          resultPrompt = resultPrompt.split(/\s+/).slice(0, requestedMaxWords).join(' ')
        }

        return { data: { prompt: resultPrompt } }
      }

      // Local provider path
      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration.` }
      }

      requestPayload = {
        model: modelId,
        temperature,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      const prompt = extractChatCompletionContent(payload)
      if (!prompt) throw new Error('No content returned from local provider.')

      await recordUsageEvent({
        db,
        endpoint: 'generator:generatePromptFromFields',
        providerId,
        modelId,
        payload,
        promptText: userPrompt,
        responseText: prompt,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      resultPrompt = prompt.trim()

      if (requestedMaxWords) {
        resultPrompt = resultPrompt.split(/\s+/).slice(0, requestedMaxWords).join(' ')
      }

      resultPrompt = normalizeAiText(resultPrompt)

      return { data: { prompt: resultPrompt } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generatePromptFromFields',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responseText: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:fillAllFields', async (_, input?: {
    subject?: string
    style?: string
    lighting?: string
    mood?: string
    artist?: string
    technical?: string
  }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    const resultFields: Record<string, string> = {}
    let errorMessage: string | null = null

    try {
      // Identify empty fields that need generation
      const fieldsToGenerate: Array<{ key: string; description: string; maxWords: number }> = []
      
      if (!input?.subject?.trim()) {
        fieldsToGenerate.push({ key: 'subject', description: 'a short subject (1-3 words). Examples: "a lighthouse", "a tree", "a mountain lake"', maxWords: 10 })
      }
      if (!input?.style?.trim()) {
        fieldsToGenerate.push({ key: 'style', description: 'an art style (1-3 words). Examples: "oil painting", "digital art", "watercolor"', maxWords: 10 })
      }
      if (!input?.lighting?.trim()) {
        fieldsToGenerate.push({ key: 'lighting', description: 'lighting description (1-3 words). Examples: "golden hour", "moonlight", "dramatic lighting"', maxWords: 10 })
      }
      if (!input?.mood?.trim()) {
        fieldsToGenerate.push({ key: 'mood', description: 'a mood (1-2 words). Examples: "dreamy", "mysterious", "serene"', maxWords: 5 })
      }
      if (!input?.artist?.trim()) {
        fieldsToGenerate.push({ key: 'artist', description: 'an artist name or art movement (1-3 words). Examples: "Van Gogh", "Art Nouveau", "Impressionism"', maxWords: 2 })
      }
      if (!input?.technical?.trim()) {
        fieldsToGenerate.push({ key: 'technical', description: 'technical specs (2-4 words). Examples: "8k resolution", "highly detailed", "octane render"', maxWords: 5 })
      }

      if (fieldsToGenerate.length === 0) {
        return { data: { fields: {} } }
      }

      // Build prompt for batch generation
      const systemPrompt = `You generate short, simple text for AI art prompt fields. ${LANGUAGE_INSTRUCTION} Output ONLY the requested content in JSON format. No explanations.`

      let userPrompt = 'Generate content for the following fields. Return a JSON object with each field name as key and the generated content as value.\n\n'
      for (const field of fieldsToGenerate) {
        userPrompt += `- ${field.key}: Generate ${field.description} (max ${field.maxWords} words)\n`
      }
      userPrompt += '\nReturn format: {"subject": "...", "style": "...", etc.}'

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const genRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).generation
        : undefined

      const providerId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).modelId || '')
        : ''

      // Fall back to main OpenRouter settings if no generation route configured
      if (!providerId || !modelId) {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestProvider = 'openrouter'
        requestModel = settings.model

        requestPayload = {
          model: settings.model,
          temperature: 0.8,
          max_tokens: 200,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const raw = extractChatCompletionContent(payload)
        if (!raw) throw new Error('No content returned from OpenRouter.')

        // Parse JSON response
        try {
          const parsed = JSON.parse(raw.trim()) as Record<string, string>
          for (const field of fieldsToGenerate) {
            if (parsed[field.key]) {
              // Enforce word limit
              const words = parsed[field.key].split(/\s+/).slice(0, field.maxWords)
              resultFields[field.key] = words.join(' ')
            }
          }
        } catch {
          // Fallback: treat as simple text per field separated by newlines
          const lines = raw.trim().split('\n').filter(l => l.trim())
          for (let i = 0; i < fieldsToGenerate.length && i < lines.length; i++) {
            const words = lines[i].split(/\s+/).slice(0, fieldsToGenerate[i].maxWords)
            resultFields[fieldsToGenerate[i].key] = words.join(' ')
          }
        }

        await recordUsageEvent({
          db,
          endpoint: 'generator:fillAllFields',
          providerId: 'openrouter',
          modelId: settings.model,
          payload,
          promptText: userPrompt,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        return { data: { fields: resultFields } }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestPayload = {
          model: modelId,
          temperature: 0.8,
          max_tokens: 200,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}}: ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as unknown
        const raw = extractChatCompletionContent(payload)
        if (!raw) throw new Error('No content returned from OpenRouter.')

        try {
          const parsed = JSON.parse(raw.trim()) as Record<string, string>
          for (const field of fieldsToGenerate) {
            if (parsed[field.key]) {
              const words = parsed[field.key].split(/\s+/).slice(0, field.maxWords)
              resultFields[field.key] = words.join(' ')
            }
          }
        } catch {
          const lines = raw.trim().split('\n').filter(l => l.trim())
          for (let i = 0; i < fieldsToGenerate.length && i < lines.length; i++) {
            const words = lines[i].split(/\s+/).slice(0, fieldsToGenerate[i].maxWords)
            resultFields[fieldsToGenerate[i].key] = words.join(' ')
          }
        }

        await recordUsageEvent({
          db,
          endpoint: 'generator:fillAllFields',
          providerId,
          modelId,
          payload,
          promptText: userPrompt,
          responseText: raw,
          storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
        })

        return { data: { fields: resultFields } }
      }

      // Local provider path
      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.8,
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as unknown
      const raw = extractChatCompletionContent(payload)
      if (!raw) throw new Error('No content returned from local provider.')

      try {
        const parsed = JSON.parse(raw.trim()) as Record<string, string>
        for (const field of fieldsToGenerate) {
          if (parsed[field.key]) {
            const words = parsed[field.key].split(/\s+/).slice(0, field.maxWords)
            resultFields[field.key] = words.join(' ')
          }
        }
      } catch {
        const lines = raw.trim().split('\n').filter(l => l.trim())
        for (let i = 0; i < fieldsToGenerate.length && i < lines.length; i++) {
          const words = lines[i].split(/\s+/).slice(0, fieldsToGenerate[i].maxWords)
          resultFields[fieldsToGenerate[i].key] = words.join(' ')
        }
      }

      await recordUsageEvent({
        db,
        endpoint: 'generator:fillAllFields',
        providerId,
        modelId,
        payload,
        promptText: userPrompt,
        responseText: raw,
        storePromptResponse: Boolean(stored.aiConfig?.storeAiPromptResponseForUsage),
      })

      return { data: { fields: resultFields } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:fillAllFields',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responseText: JSON.stringify(resultFields) || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })
}
