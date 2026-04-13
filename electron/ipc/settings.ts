import { app, dialog, ipcMain } from 'electron'
import path from 'path'
import { readFile, writeFile, mkdir, rename, rm } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../../src/lib/schema'
import { openRouterModels } from '../../src/lib/schema'
import { getConfiguredNightCompanionFolderPath, getDefaultNightCompanionFolderPath } from '../services/storagePaths'

type Database = ReturnType<typeof drizzle<typeof schema>>

export type OpenRouterSettings = {
  apiKey: string
  model: string
  siteUrl: string
  appName: string
}

type ProviderMetaStore = {
  model_gen: string
  model_improve: string
  model_vision: string
  model_general: string
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
  is_active_general: boolean
}

type AiConfigStateStore = {
  dashboardRoleRouting?: unknown
  cachedModels?: unknown
  advisorModelRoute?: unknown
  aiApiRequestLoggingEnabled?: boolean
  nativeWindowFrameEnabled?: boolean
  nightCompanionFolderPath?: string
  usageCurrency?: 'usd' | 'eur'
  eurRate?: number
  storeAiPromptResponseForUsage?: boolean
}

type GeneratorUiStateStore = {
  tab?: 'generator' | 'builder'
  selectedPreset?: string
  maxWords?: number
  generatedPrompt?: string
  negativePrompt?: string
  negativePromptViewTab?: 'final' | 'diff'
  negativeImprovementDiff?: { originalPrompt: string; improvedPrompt: string } | null
  savedTitle?: string
  promptViewTab?: 'final' | 'diff'
  improvementDiff?: { originalPrompt: string; improvedPrompt: string } | null
  quickStartIdea?: string
  quickStartCreativity?: 'focused' | 'balanced' | 'wild'
  magicRandomCreativity?: 'focused' | 'balanced' | 'wild'
  quickStartCharacterId?: string | null
  recommendedModel?: string
  recommendedModelReason?: string
  recommendedModelMode?: 'rule' | 'ai' | null
  advisorBestValue?: string
  advisorFastest?: string
  supportsNegativePrompt?: boolean | null
  budgetMode?: 'cheap' | 'balanced' | 'premium'
}

type PromptBuilderUiStateStore = {
  parts?: Array<{ id: string; value: string }>
  separator?: ', ' | '. ' | ' | '
  savedTitle?: string
  selectedStyleProfileId?: number | ''
  generatedPrompt?: string
  generatedPromptViewTab?: 'final' | 'diff'
  generatedImprovementDiff?: { originalPrompt: string; improvedPrompt: string } | null
}

type LocalEndpointStore = {
  id?: string
  provider?: string
  name?: string
  baseUrl?: string
  apiKey?: string
  model_name?: string
  model_gen?: string
  model_improve?: string
  model_vision?: string
  model_general?: string
  is_active?: boolean
  is_active_gen?: boolean
  is_active_improve?: boolean
  is_active_vision?: boolean
  is_active_general?: boolean
  updated_at?: string
}

type OpenRouterModel = {
  modelId: string
  displayName: string
  description: string
  contextLength: number | null
  capabilities: Array<'vision' | 'reasoning' | 'web_search' | 'code' | 'audio' | 'video' | 'text'>
  promptPrice: string | null
  completionPrice: string | null
  requestPrice: string | null
  imagePrice: string | null
}

type StoredSettings = {
  openRouter?: Partial<OpenRouterSettings>
  providerMeta?: Record<string, Partial<ProviderMetaStore>>
  aiConfig?: AiConfigStateStore
  localEndpoints?: LocalEndpointStore[]
  generatorUiState?: GeneratorUiStateStore
  promptBuilderUiState?: PromptBuilderUiStateStore
}

type DashboardRole = 'generation' | 'improvement' | 'vision' | 'general'

type RoleRouteSelection = {
  enabled: boolean
  providerId: string
  modelId: string
}

type RoleRouteState = Record<DashboardRole, RoleRouteSelection>

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'

const DASHBOARD_ROLES: DashboardRole[] = ['generation', 'improvement', 'vision', 'general']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRoleRouteState(input: unknown): RoleRouteState | undefined {
  if (!isRecord(input)) return undefined

  const normalized = {} as RoleRouteState

  for (const role of DASHBOARD_ROLES) {
    const rawRole = input[role]
    if (!isRecord(rawRole)) {
      normalized[role] = { enabled: true, providerId: '', modelId: '' }
      continue
    }

    normalized[role] = {
      enabled: typeof rawRole.enabled === 'boolean' ? rawRole.enabled : true,
      providerId: typeof rawRole.providerId === 'string' ? rawRole.providerId : '',
      modelId: typeof rawRole.modelId === 'string' ? rawRole.modelId : '',
    }
  }

  return normalized
}

function normalizeGeneratorUiState(input: unknown): GeneratorUiStateStore {
  if (!isRecord(input)) return {}

  const normalized: GeneratorUiStateStore = {}

  if (input.tab === 'generator' || input.tab === 'builder') normalized.tab = input.tab
  if (typeof input.selectedPreset === 'string') normalized.selectedPreset = input.selectedPreset
  if (typeof input.maxWords === 'number' && Number.isFinite(input.maxWords) && input.maxWords > 0) normalized.maxWords = input.maxWords
  if (typeof input.generatedPrompt === 'string') normalized.generatedPrompt = input.generatedPrompt
  if (typeof input.negativePrompt === 'string') normalized.negativePrompt = input.negativePrompt
  if (input.negativePromptViewTab === 'final' || input.negativePromptViewTab === 'diff') normalized.negativePromptViewTab = input.negativePromptViewTab
  if (input.promptViewTab === 'final' || input.promptViewTab === 'diff') normalized.promptViewTab = input.promptViewTab

  if (isRecord(input.improvementDiff) && typeof input.improvementDiff.originalPrompt === 'string' && typeof input.improvementDiff.improvedPrompt === 'string') {
    normalized.improvementDiff = {
      originalPrompt: input.improvementDiff.originalPrompt,
      improvedPrompt: input.improvementDiff.improvedPrompt,
    }
  } else if (input.improvementDiff === null) {
    normalized.improvementDiff = null
  }

  if (isRecord(input.negativeImprovementDiff) && typeof input.negativeImprovementDiff.originalPrompt === 'string' && typeof input.negativeImprovementDiff.improvedPrompt === 'string') {
    normalized.negativeImprovementDiff = {
      originalPrompt: input.negativeImprovementDiff.originalPrompt,
      improvedPrompt: input.negativeImprovementDiff.improvedPrompt,
    }
  } else if (input.negativeImprovementDiff === null) {
    normalized.negativeImprovementDiff = null
  }

  if (typeof input.savedTitle === 'string') normalized.savedTitle = input.savedTitle
  if (typeof input.quickStartIdea === 'string') normalized.quickStartIdea = input.quickStartIdea
  if (input.quickStartCreativity === 'focused' || input.quickStartCreativity === 'balanced' || input.quickStartCreativity === 'wild') {
    normalized.quickStartCreativity = input.quickStartCreativity
  }
  if (input.magicRandomCreativity === 'focused' || input.magicRandomCreativity === 'balanced' || input.magicRandomCreativity === 'wild') {
    normalized.magicRandomCreativity = input.magicRandomCreativity
  }
  if (typeof input.quickStartCharacterId === 'string' || input.quickStartCharacterId === null) {
    normalized.quickStartCharacterId = input.quickStartCharacterId
  }

  if (typeof input.recommendedModel === 'string') normalized.recommendedModel = input.recommendedModel
  if (typeof input.recommendedModelReason === 'string') normalized.recommendedModelReason = input.recommendedModelReason
  if (input.recommendedModelMode === 'rule' || input.recommendedModelMode === 'ai' || input.recommendedModelMode === null) {
    normalized.recommendedModelMode = input.recommendedModelMode
  }
  if (typeof input.advisorBestValue === 'string') normalized.advisorBestValue = input.advisorBestValue
  if (typeof input.advisorFastest === 'string') normalized.advisorFastest = input.advisorFastest
  if (typeof input.supportsNegativePrompt === 'boolean' || input.supportsNegativePrompt === null) {
    normalized.supportsNegativePrompt = input.supportsNegativePrompt
  }
  if (input.budgetMode === 'cheap' || input.budgetMode === 'balanced' || input.budgetMode === 'premium') {
    normalized.budgetMode = input.budgetMode
  }

  return normalized
}

function normalizePromptBuilderUiState(input: unknown): PromptBuilderUiStateStore {
  if (!isRecord(input)) return {}

  const normalized: PromptBuilderUiStateStore = {}

  if (Array.isArray(input.parts)) {
    normalized.parts = input.parts
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : '',
        value: typeof item.value === 'string' ? item.value : '',
      }))
      .filter((item) => item.id)
  }

  if (input.separator === ', ' || input.separator === '. ' || input.separator === ' | ') normalized.separator = input.separator
  if (typeof input.savedTitle === 'string') normalized.savedTitle = input.savedTitle
  if (typeof input.selectedStyleProfileId === 'number' || input.selectedStyleProfileId === '') normalized.selectedStyleProfileId = input.selectedStyleProfileId
  if (typeof input.generatedPrompt === 'string') normalized.generatedPrompt = input.generatedPrompt
  if (input.generatedPromptViewTab === 'final' || input.generatedPromptViewTab === 'diff') normalized.generatedPromptViewTab = input.generatedPromptViewTab

  if (isRecord(input.generatedImprovementDiff) && typeof input.generatedImprovementDiff.originalPrompt === 'string' && typeof input.generatedImprovementDiff.improvedPrompt === 'string') {
    normalized.generatedImprovementDiff = {
      originalPrompt: input.generatedImprovementDiff.originalPrompt,
      improvedPrompt: input.generatedImprovementDiff.improvedPrompt,
    }
  } else if (input.generatedImprovementDiff === null) {
    normalized.generatedImprovementDiff = null
  }

  return normalized
}

function normalizeProviderMetaMap(input: unknown): Record<string, Partial<ProviderMetaStore>> | undefined {
  if (!isRecord(input)) return undefined

  const normalized: Record<string, Partial<ProviderMetaStore>> = {}

  for (const [providerId, rawMeta] of Object.entries(input)) {
    if (!isRecord(rawMeta)) continue

    const nextMeta: Partial<ProviderMetaStore> = {}

    if (typeof rawMeta.model_gen === 'string') nextMeta.model_gen = rawMeta.model_gen
    if (typeof rawMeta.model_improve === 'string') nextMeta.model_improve = rawMeta.model_improve
    if (typeof rawMeta.model_vision === 'string') nextMeta.model_vision = rawMeta.model_vision
    if (typeof rawMeta.model_general === 'string') nextMeta.model_general = rawMeta.model_general
    if (typeof rawMeta.is_active === 'boolean') nextMeta.is_active = rawMeta.is_active
    if (typeof rawMeta.is_active_gen === 'boolean') nextMeta.is_active_gen = rawMeta.is_active_gen
    if (typeof rawMeta.is_active_improve === 'boolean') nextMeta.is_active_improve = rawMeta.is_active_improve
    if (typeof rawMeta.is_active_vision === 'boolean') nextMeta.is_active_vision = rawMeta.is_active_vision
    if (typeof rawMeta.is_active_general === 'boolean') nextMeta.is_active_general = rawMeta.is_active_general

    normalized[providerId] = nextMeta
  }

  return normalized
}

function normalizeAiConfigState(input: unknown): AiConfigStateStore | undefined {
  if (!isRecord(input)) return undefined

  const normalized: AiConfigStateStore = {}

  const normalizedRoleRouting = normalizeRoleRouteState(input.dashboardRoleRouting)
  if (normalizedRoleRouting) normalized.dashboardRoleRouting = normalizedRoleRouting

  if ('cachedModels' in input) normalized.cachedModels = input.cachedModels
  if ('advisorModelRoute' in input) normalized.advisorModelRoute = input.advisorModelRoute
  if (typeof input.aiApiRequestLoggingEnabled === 'boolean') {
    normalized.aiApiRequestLoggingEnabled = input.aiApiRequestLoggingEnabled
  }
  if (typeof input.nativeWindowFrameEnabled === 'boolean') {
    normalized.nativeWindowFrameEnabled = input.nativeWindowFrameEnabled
  }
  if (typeof input.nightCompanionFolderPath === 'string') {
    normalized.nightCompanionFolderPath = input.nightCompanionFolderPath.trim()
  }

  if (input.usageCurrency === 'usd' || input.usageCurrency === 'eur') {
    normalized.usageCurrency = input.usageCurrency
  }
  if (typeof input.eurRate === 'number' && Number.isFinite(input.eurRate) && input.eurRate > 0) {
    normalized.eurRate = input.eurRate
  }
  if (typeof input.storeAiPromptResponseForUsage === 'boolean') {
    normalized.storeAiPromptResponseForUsage = input.storeAiPromptResponseForUsage
  }

  return normalized
}

function normalizeStoredSettings(input: unknown): StoredSettings {
  if (!isRecord(input)) return {}

  const normalized: StoredSettings = {}

  if (isRecord(input.openRouter)) normalized.openRouter = normalizeOpenRouterSettings(input.openRouter)

  const providerMeta = normalizeProviderMetaMap(input.providerMeta)
  if (providerMeta) normalized.providerMeta = providerMeta

  const aiConfig = normalizeAiConfigState(input.aiConfig)
  if (aiConfig) normalized.aiConfig = aiConfig

  if (Array.isArray(input.localEndpoints)) {
    normalized.localEndpoints = input.localEndpoints.filter((item): item is LocalEndpointStore => isRecord(item))
  }

  normalized.generatorUiState = normalizeGeneratorUiState(input.generatorUiState)
  normalized.promptBuilderUiState = normalizePromptBuilderUiState(input.promptBuilderUiState)

  return normalized
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

let settingsWriteChain: Promise<void> = Promise.resolve()

function salvageJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  if (start === -1) {
    throw new Error('Invalid settings JSON')
  }

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = start; i < trimmed.length; i += 1) {
    const ch = trimmed[i]

    if (inString) {
      if (escapeNext) {
        escapeNext = false
        continue
      }
      if (ch === '\\') {
        escapeNext = true
        continue
      }
      if (ch === '"') {
        inString = false
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1

    if (depth === 0 && i > start) {
      const candidate = trimmed.slice(start, i + 1)
      return JSON.parse(candidate) as unknown
    }
  }

  throw new Error('Invalid settings JSON')
}

async function atomicWriteSettingsFile(contents: string) {
  const settingsPath = getSettingsFilePath()
  await mkdir(path.dirname(settingsPath), { recursive: true })

  const tmpPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmpPath, contents, 'utf-8')

  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await rename(tmpPath, settingsPath)
        return
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        const isLastAttempt = attempt === 3
        const isTransientWindowsLock = err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY'

        if (!isTransientWindowsLock || isLastAttempt) {
          throw error
        }

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 40 * (attempt + 1))
        })
      }
    }
  } catch {
    await writeFile(settingsPath, contents, 'utf-8')
  } finally {
    await rm(tmpPath, { force: true })
  }
}

function normalizeOpenRouterSettings(input?: Partial<OpenRouterSettings>): OpenRouterSettings {
  return {
    apiKey: input?.apiKey?.trim() ?? '',
    model: input?.model?.trim() || DEFAULT_OPENROUTER_MODEL,
    siteUrl: input?.siteUrl?.trim() ?? '',
    appName: input?.appName?.trim() ?? 'NightCompanion',
  }
}

function normalizeProviderMeta(input: Partial<ProviderMetaStore> | undefined, fallbackModel: string): ProviderMetaStore {
  return {
    model_gen: input?.model_gen || fallbackModel,
    model_improve: input?.model_improve || fallbackModel,
    model_vision: input?.model_vision || fallbackModel,
    model_general: input?.model_general || fallbackModel,
    is_active: input?.is_active ?? false,
    is_active_gen: input?.is_active_gen ?? false,
    is_active_improve: input?.is_active_improve ?? false,
    is_active_vision: input?.is_active_vision ?? false,
    is_active_general: input?.is_active_general ?? false,
  }
}

async function readStoredSettings(): Promise<StoredSettings> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf-8')
    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      try {
        parsed = salvageJsonObject(raw)
      } catch (error) {
        console.warn('[settings] Failed to parse settings.json; falling back to defaults:', error)
        return {}
      }
    }
    const normalized = normalizeStoredSettings(parsed)

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      settingsWriteChain = settingsWriteChain.then(async () => {
        await atomicWriteSettingsFile(JSON.stringify(normalized, null, 2))
      })
      await settingsWriteChain
      console.info('[settings] settings.json normalized and rewritten to disk')
    }

    return normalized
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return {}
    console.warn('[settings] Failed to read settings.json; falling back to defaults:', error)
    return {}
  }
}

async function writeStoredSettings(settings: {
  openRouter: OpenRouterSettings
  providerMeta?: Record<string, Partial<ProviderMetaStore>>
  aiConfig?: AiConfigStateStore
  localEndpoints?: LocalEndpointStore[]
  generatorUiState?: GeneratorUiStateStore
  promptBuilderUiState?: PromptBuilderUiStateStore
}) {
  settingsWriteChain = settingsWriteChain.then(async () => {
    await atomicWriteSettingsFile(JSON.stringify(settings, null, 2))
  })

  await settingsWriteChain
}

export async function getOpenRouterSettings() {
  const stored = await readStoredSettings()
  return normalizeOpenRouterSettings(stored.openRouter)
}

export async function getAiApiRequestLoggingEnabled() {
  const stored = await readStoredSettings()
  return Boolean(stored.aiConfig?.aiApiRequestLoggingEnabled)
}

export async function getNativeWindowFrameEnabled() {
  const stored = await readStoredSettings()
  return Boolean(stored.aiConfig?.nativeWindowFrameEnabled)
}

export async function getNightCompanionFolderPath() {
  const stored = await readStoredSettings()
  const configuredPath = stored.aiConfig?.nightCompanionFolderPath

  if (typeof configuredPath === 'string' && configuredPath.trim()) {
    return path.resolve(configuredPath.trim())
  }

  return getConfiguredNightCompanionFolderPath()
}

async function listOpenRouterModelsFromDb(db: Database) {
  const data = await db
    .select({
      modelId: openRouterModels.modelId,
      displayName: openRouterModels.displayName,
      description: openRouterModels.description,
      contextLength: openRouterModels.contextLength,
      capabilities: openRouterModels.capabilities,
      promptPrice: openRouterModels.promptPrice,
      completionPrice: openRouterModels.completionPrice,
      requestPrice: openRouterModels.requestPrice,
      imagePrice: openRouterModels.imagePrice,
    })
    .from(openRouterModels)
    .orderBy(openRouterModels.displayName)

  return data
}

async function syncOpenRouterModels(db: Database, settings: OpenRouterSettings) {
  if (!settings.apiKey) {
    await db.delete(openRouterModels)
    return [] as OpenRouterModel[]
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
      ...(settings.appName ? { 'X-Title': settings.appName } : {}),
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter models request failed (${response.status}): ${errText.slice(0, 300)}`)
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string
      name?: string
      description?: string
      context_length?: number
      architecture?: {
        input_modalities?: string[]
        output_modalities?: string[]
      }
      supported_parameters?: string[]
      pricing?: {
        prompt?: string
        completion?: string
        request?: string
        image?: string
        web_search?: string
        internal_reasoning?: string
      }
    }>
  }

  function getCapabilities(input: {
    architecture?: { input_modalities?: string[]; output_modalities?: string[] }
    supported_parameters?: string[]
    pricing?: { web_search?: string; internal_reasoning?: string }
  }): OpenRouterModel['capabilities'] {
    const capabilities = new Set<OpenRouterModel['capabilities'][number]>()

    const inputModalities = input.architecture?.input_modalities ?? []
    const outputModalities = input.architecture?.output_modalities ?? []
    const supportedParams = input.supported_parameters ?? []

    if (inputModalities.includes('image') || inputModalities.includes('file')) capabilities.add('vision')
    if (inputModalities.includes('audio') || outputModalities.includes('audio')) capabilities.add('audio')
    if (outputModalities.includes('video')) capabilities.add('video')

    if (supportedParams.includes('reasoning') || supportedParams.includes('include_reasoning')) capabilities.add('reasoning')
    if (supportedParams.includes('web_search')) capabilities.add('web_search')
    if (supportedParams.includes('tools') || supportedParams.includes('tool_choice')) capabilities.add('code')

    const webSearchPrice = Number(input.pricing?.web_search || '')
    if (Number.isFinite(webSearchPrice) && webSearchPrice > 0) capabilities.add('web_search')
    const internalReasoningPrice = Number(input.pricing?.internal_reasoning || '')
    if (Number.isFinite(internalReasoningPrice) && internalReasoningPrice > 0) capabilities.add('reasoning')

    capabilities.add('text')
    return Array.from(capabilities)
  }

  const normalized = (payload.data ?? [])
    .map((item) => {
      const modelId = item.id?.trim()
      if (!modelId) return null

      return {
        modelId,
        displayName: item.name?.trim() || modelId,
        description: item.description?.trim() || '',
        contextLength: typeof item.context_length === 'number' ? item.context_length : null,
        capabilities: getCapabilities({
          architecture: item.architecture,
          supported_parameters: item.supported_parameters,
          pricing: item.pricing,
        }),
        promptPrice: item.pricing?.prompt?.trim() || null,
        completionPrice: item.pricing?.completion?.trim() || null,
        requestPrice: item.pricing?.request?.trim() || null,
        imagePrice: item.pricing?.image?.trim() || null,
      }
    })
    .filter((item): item is OpenRouterModel => item !== null)

  await db.delete(openRouterModels)

  if (normalized.length > 0) {
    await db.insert(openRouterModels).values(
      normalized.map((item) => ({
        modelId: item.modelId,
        displayName: item.displayName,
        description: item.description,
        contextLength: item.contextLength,
        capabilities: item.capabilities,
        promptPrice: item.promptPrice,
        completionPrice: item.completionPrice,
        requestPrice: item.requestPrice,
        imagePrice: item.imagePrice,
        updatedAt: new Date(),
      }))
    )
  }

  return normalized
}

async function testOpenRouterConnection(settings: OpenRouterSettings) {
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is missing.')
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
      ...(settings.appName ? { 'X-Title': settings.appName } : {}),
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter connection test failed (${response.status}): ${errText.slice(0, 300)}`)
  }

  const payload = (await response.json()) as {
    data?: Array<unknown>
  }

  return {
    ok: true,
    modelCount: payload.data?.length ?? 0,
  }
}

export function registerSettingsIpc({
  db,
  onNativeWindowFrameChanged,
}: {
  db: Database
  onNativeWindowFrameChanged?: (enabled: boolean) => void
}) {
  ipcMain.handle('settings:getOpenRouter', async () => {
    try {
      const data = await getOpenRouterSettings()
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getProviderMeta', async (_, providerId: string, fallbackModel = DEFAULT_OPENROUTER_MODEL) => {
    try {
      const stored = await readStoredSettings()
      const providerMap = stored.providerMeta || {}
      const data = normalizeProviderMeta(providerMap[providerId], fallbackModel)
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveProviderMeta', async (_, providerId: string, input: Partial<ProviderMetaStore>) => {
    try {
      const stored = await readStoredSettings()
      const providerMap = stored.providerMeta || {}
      const fallbackModel = input.model_gen || input.model_improve || input.model_vision || input.model_general || DEFAULT_OPENROUTER_MODEL
      const current = normalizeProviderMeta(providerMap[providerId], fallbackModel)
      const next = normalizeProviderMeta({ ...current, ...input }, fallbackModel)

      providerMap[providerId] = next

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: providerMap,
        aiConfig: stored.aiConfig,
        localEndpoints: stored.localEndpoints,
      })

      return { data: next }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getLocalEndpoints', async () => {
    try {
      const stored = await readStoredSettings()
      const data = Array.isArray(stored.localEndpoints) ? stored.localEndpoints : []
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveLocalEndpoints', async (_, input: LocalEndpointStore[]) => {
    try {
      const stored = await readStoredSettings()
      const nextLocalEndpoints = Array.isArray(input) ? input : []

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: stored.aiConfig,
        localEndpoints: nextLocalEndpoints,
      })

      return { data: nextLocalEndpoints }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getAiConfigState', async () => {
    try {
      const stored = await readStoredSettings()
      return { data: stored.aiConfig || {} }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getGeneratorUiState', async () => {
    try {
      const stored = await readStoredSettings()
      return { data: normalizeGeneratorUiState(stored.generatorUiState) }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveGeneratorUiState', async (_, input: GeneratorUiStateStore) => {
    try {
      const stored = await readStoredSettings()
      const nextGeneratorUiState = normalizeGeneratorUiState(input)

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: stored.aiConfig,
        localEndpoints: stored.localEndpoints,
        generatorUiState: nextGeneratorUiState,
        promptBuilderUiState: stored.promptBuilderUiState,
      })

      return { data: nextGeneratorUiState }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getPromptBuilderUiState', async () => {
    try {
      const stored = await readStoredSettings()
      return { data: normalizePromptBuilderUiState(stored.promptBuilderUiState) }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:savePromptBuilderUiState', async (_, input: PromptBuilderUiStateStore) => {
    try {
      const stored = await readStoredSettings()
      const nextPromptBuilderUiState = normalizePromptBuilderUiState(input)

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: stored.aiConfig,
        localEndpoints: stored.localEndpoints,
        generatorUiState: stored.generatorUiState,
        promptBuilderUiState: nextPromptBuilderUiState,
      })

      return { data: nextPromptBuilderUiState }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveAiConfigState', async (_, input: AiConfigStateStore) => {
    try {
      const stored = await readStoredSettings()
      const previousNativeWindowFrameEnabled = Boolean(stored.aiConfig?.nativeWindowFrameEnabled)
      const nextAiConfig: AiConfigStateStore = {
        ...(stored.aiConfig || {}),
        ...(input || {}),
      }

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: stored.localEndpoints,
      })

      if (typeof input.nativeWindowFrameEnabled === 'boolean') {
        const nextNativeWindowFrameEnabled = Boolean(nextAiConfig.nativeWindowFrameEnabled)
        if (nextNativeWindowFrameEnabled !== previousNativeWindowFrameEnabled) {
          onNativeWindowFrameChanged?.(nextNativeWindowFrameEnabled)
        }
      }

      return { data: nextAiConfig }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getNightCompanionFolderPath', async () => {
    try {
      const data = await getNightCompanionFolderPath()
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveNightCompanionFolderPath', async (_, folderPath: string) => {
    try {
      const nextPath = typeof folderPath === 'string' ? folderPath.trim() : ''
      if (!nextPath) {
        throw new Error('Folder path is required.')
      }
      if (!path.isAbsolute(nextPath)) {
        throw new Error('Folder path must be an absolute path.')
      }

      const resolvedPath = path.resolve(nextPath)
      await mkdir(resolvedPath, { recursive: true })

      const stored = await readStoredSettings()
      const nextAiConfig: AiConfigStateStore = {
        ...(stored.aiConfig || {}),
        nightCompanionFolderPath: resolvedPath,
      }

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: stored.localEndpoints,
      })

      return { data: resolvedPath }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:resetNightCompanionFolderPath', async () => {
    try {
      const defaultPath = path.resolve(getDefaultNightCompanionFolderPath())
      await mkdir(defaultPath, { recursive: true })

      const stored = await readStoredSettings()
      const nextAiConfig: AiConfigStateStore = {
        ...(stored.aiConfig || {}),
        nightCompanionFolderPath: defaultPath,
      }

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(stored.openRouter),
        providerMeta: stored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: stored.localEndpoints,
      })

      return { data: defaultPath }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:selectNightCompanionFolderPath', async () => {
    try {
      const currentPath = await getNightCompanionFolderPath()
      const result = await dialog.showOpenDialog({
        title: 'Select NightCompanion folder',
        defaultPath: currentPath || getDefaultNightCompanionFolderPath(),
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { data: null }
      }

      return { data: result.filePaths[0] }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveOpenRouter', async (_, input: Partial<OpenRouterSettings>) => {
    try {
      const stored = await readStoredSettings()
      const data = normalizeOpenRouterSettings({
        ...stored.openRouter,
        ...input,
      })

      await writeStoredSettings({
        openRouter: data,
        providerMeta: stored.providerMeta,
        aiConfig: stored.aiConfig,
        localEndpoints: stored.localEndpoints,
      })

      if (data.apiKey) {
        try {
          await syncOpenRouterModels(db, data)
        } catch (error) {
          console.error('OpenRouter model sync failed after saving settings:', error)
        }
      } else {
        await db.delete(openRouterModels)
      }

      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:listOpenRouterModels', async () => {
    try {
      const data = await listOpenRouterModelsFromDb(db)
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:refreshOpenRouterModels', async (_, input?: Partial<OpenRouterSettings>) => {
    try {
      const stored = await getOpenRouterSettings()
      const data = normalizeOpenRouterSettings({
        ...stored,
        ...input,
      })
      const models = await syncOpenRouterModels(db, data)
      return { data: models }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:testOpenRouter', async (_, input?: Partial<OpenRouterSettings>) => {
    try {
      const stored = await getOpenRouterSettings()
      const data = normalizeOpenRouterSettings({
        ...stored,
        ...input,
      })
      const result = await testOpenRouterConnection(data)
      return { data: result }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
