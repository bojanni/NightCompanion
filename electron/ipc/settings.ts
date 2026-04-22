import { app, dialog, ipcMain } from 'electron'
import path from 'path'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { desc, eq, sql } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import {
  aiConfigurationSettings,
  aiUsageEvents,
  characters,
  collections,
  galleryItems,
  generationLog,
  greylistTable,
  nightcafeModels,
  nightcafePresets,
  openRouterModels,
  promptVersions,
  prompts,
  styleProfiles,
} from '../../src/lib/schema'
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
  appLanguage?: 'en' | 'nl'
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
  advisorCheapPick?: { modelName: string; reasons: string[] }
  advisorBalancedPick?: { modelName: string; reasons: string[] }
  advisorPremiumPick?: { modelName: string; reasons: string[] }
  advisorBestValue?: string
  advisorFastest?: string
  supportsNegativePrompt?: boolean | null
  budgetMode?: 'cheap' | 'balanced' | 'premium'
  savePromptMode?: 'original-only' | 'original-and-improved'
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

type PromptImageJsonItem = {
  id?: string
  url?: string
  note?: string
  model?: string
  seed?: string
  stylePreset?: string
  createdAt?: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt?: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  durationSeconds?: number
  collectionId?: string | null
}

type PromptMediaBackfillSummary = {
  promptsScanned: number
  promptsWithMedia: number
  mediaEntries: number
  inserted: number
  updated: number
  removed: number
}

type LibraryExportSummary = {
  exportDirPath: string
  exportFilePath: string
  includedPrompts: boolean
  includedImages: boolean
  promptsCount: number
  promptVersionsCount: number
  imagesCopied: number
  imagesMissing: number
  imagesSkipped: number
}

type DatabaseBackupSummary = {
  exportDirPath: string
  backupFilePath: string
  tables: Record<string, number>
}

type StoredSettings = {
  openRouter?: Partial<OpenRouterSettings>
  providerMeta?: Record<string, Partial<ProviderMetaStore>>
  aiConfig?: AiConfigStateStore
  localEndpoints?: LocalEndpointStore[]
  generatorUiState?: GeneratorUiStateStore
  promptBuilderUiState?: PromptBuilderUiStateStore
}

type AiConfigurationStore = {
  openRouter: OpenRouterSettings
  providerMeta: Record<string, Partial<ProviderMetaStore>>
  aiConfig: AiConfigStateStore
  localEndpoints: LocalEndpointStore[]
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
  const normalizeBudgetPick = (value: unknown): { modelName: string; reasons: string[] } | undefined => {
    if (!isRecord(value)) return undefined

    const modelName = typeof value.modelName === 'string' ? value.modelName : ''
    const reasons = Array.isArray(value.reasons)
      ? value.reasons.map((reason) => String(reason || '').trim()).filter(Boolean)
      : []

    if (!modelName.trim()) return undefined

    return {
      modelName,
      reasons,
    }
  }

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
  const advisorCheapPick = normalizeBudgetPick(input.advisorCheapPick)
  if (advisorCheapPick) normalized.advisorCheapPick = advisorCheapPick
  const advisorBalancedPick = normalizeBudgetPick(input.advisorBalancedPick)
  if (advisorBalancedPick) normalized.advisorBalancedPick = advisorBalancedPick
  const advisorPremiumPick = normalizeBudgetPick(input.advisorPremiumPick)
  if (advisorPremiumPick) normalized.advisorPremiumPick = advisorPremiumPick
  if (typeof input.advisorBestValue === 'string') normalized.advisorBestValue = input.advisorBestValue
  if (typeof input.advisorFastest === 'string') normalized.advisorFastest = input.advisorFastest
  if (typeof input.supportsNegativePrompt === 'boolean' || input.supportsNegativePrompt === null) {
    normalized.supportsNegativePrompt = input.supportsNegativePrompt
  }
  if (input.budgetMode === 'cheap' || input.budgetMode === 'balanced' || input.budgetMode === 'premium') {
    normalized.budgetMode = input.budgetMode
  }
  if (input.savePromptMode === 'original-only' || input.savePromptMode === 'original-and-improved') {
    normalized.savePromptMode = input.savePromptMode
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
  if (input.appLanguage === 'en' || input.appLanguage === 'nl') {
    normalized.appLanguage = input.appLanguage
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

function normalizeLocalEndpoints(input: unknown): LocalEndpointStore[] {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is LocalEndpointStore => isRecord(item))
}

function toAiConfigurationStore(stored: StoredSettings): AiConfigurationStore {
  return {
    openRouter: normalizeOpenRouterSettings(stored.openRouter),
    providerMeta: stored.providerMeta || {},
    aiConfig: stored.aiConfig || {},
    localEndpoints: normalizeLocalEndpoints(stored.localEndpoints),
  }
}

async function writeAiConfigurationStore(db: Database | undefined, input: AiConfigurationStore) {
  if (!db) return

  const now = new Date()

  await db.insert(aiConfigurationSettings)
    .values({
      singletonKey: 'singleton',
      openRouter: normalizeOpenRouterSettings(input.openRouter),
      providerMeta: input.providerMeta || {},
      localEndpoints: normalizeLocalEndpoints(input.localEndpoints),
      aiConfig: input.aiConfig || {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiConfigurationSettings.singletonKey,
      set: {
        openRouter: normalizeOpenRouterSettings(input.openRouter),
        providerMeta: input.providerMeta || {},
        localEndpoints: normalizeLocalEndpoints(input.localEndpoints),
        aiConfig: input.aiConfig || {},
        updatedAt: now,
      },
    })
}

async function readAiConfigurationStore(db?: Database): Promise<AiConfigurationStore> {
  const stored = await readStoredSettings()
  const fallback = toAiConfigurationStore(stored)

  if (!db) {
    return fallback
  }

  try {
    const rows = await db
      .select({
        openRouter: aiConfigurationSettings.openRouter,
        providerMeta: aiConfigurationSettings.providerMeta,
        aiConfig: aiConfigurationSettings.aiConfig,
        localEndpoints: aiConfigurationSettings.localEndpoints,
      })
      .from(aiConfigurationSettings)
      .limit(1)

    const row = rows[0]

    if (row) {
      return {
        openRouter: normalizeOpenRouterSettings(row.openRouter),
        providerMeta: normalizeProviderMetaMap(row.providerMeta) || {},
        aiConfig: normalizeAiConfigState(row.aiConfig) || {},
        localEndpoints: normalizeLocalEndpoints(row.localEndpoints),
      }
    }

    const hasLegacyData = Boolean(
      stored.openRouter
      || stored.providerMeta
      || stored.aiConfig
      || (stored.localEndpoints && stored.localEndpoints.length > 0)
    )

    if (hasLegacyData) {
      await writeAiConfigurationStore(db, fallback)
    }

    return fallback
  } catch (error) {
    console.warn('[settings] Failed to read ai_configuration_settings; falling back to settings.json:', error)
    return fallback
  }
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

let settingsWriteChain: Promise<void> = Promise.resolve()

function buildCorruptSettingsBackupPath() {
  const settingsPath = getSettingsFilePath()
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${settingsPath}.corrupt.${stamp}`
}

async function backupCorruptSettingsFile(rawContents: string) {
  const settingsPath = getSettingsFilePath()
  const backupPath = buildCorruptSettingsBackupPath()

  try {
    await rename(settingsPath, backupPath)
    return backupPath
  } catch {
    await writeFile(backupPath, rawContents, 'utf-8')
    await rm(settingsPath, { force: true })
    return backupPath
  }
}

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
    const sanitizedRaw = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
    let parsed: unknown
    let usedSalvage = false
    try {
      parsed = JSON.parse(sanitizedRaw) as unknown
    } catch {
      try {
        parsed = salvageJsonObject(sanitizedRaw)
        usedSalvage = true
      } catch (error) {
        const backupPath = await backupCorruptSettingsFile(raw)
        console.warn('[settings] Failed to parse settings.json; backed up and reset:', { backupPath, error })
        settingsWriteChain = settingsWriteChain.then(async () => {
          await atomicWriteSettingsFile(JSON.stringify({}, null, 2))
        })
        await settingsWriteChain
        return {}
      }
    }
    const normalized = normalizeStoredSettings(parsed)

    if (usedSalvage || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
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

export async function getOpenRouterSettings(db?: Database) {
  const stored = await readAiConfigurationStore(db)
  return normalizeOpenRouterSettings(stored.openRouter)
}

export async function getAiApiRequestLoggingEnabled(db?: Database) {
  const stored = await readAiConfigurationStore(db)
  return Boolean(stored.aiConfig.aiApiRequestLoggingEnabled)
}

export async function getNativeWindowFrameEnabled(db?: Database) {
  const stored = await readAiConfigurationStore(db)
  return Boolean(stored.aiConfig.nativeWindowFrameEnabled)
}

export async function getNightCompanionFolderPath(db?: Database) {
  const stored = await readAiConfigurationStore(db)
  const configuredPath = stored.aiConfig.nightCompanionFolderPath

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

function resolveExportableFilePath(rawUrl: string): string | null {
  const normalized = rawUrl.trim()
  if (!normalized) return null

  if (normalized.startsWith('file://')) {
    try {
      const filePath = fileURLToPath(new URL(normalized))
      return path.resolve(filePath)
    } catch {
      return null
    }
  }

  if (path.isAbsolute(normalized)) {
    return path.resolve(normalized)
  }

  return null
}

function normalizePromptImageUrls(imageUrl: string, imagesJson: unknown): string[] {
  const urls: string[] = []
  const firstImage = typeof imageUrl === 'string' ? imageUrl.trim() : ''
  if (firstImage) urls.push(firstImage)

  if (Array.isArray(imagesJson)) {
    for (const item of imagesJson) {
      const maybeItem = item as PromptImageJsonItem
      if (!maybeItem || typeof maybeItem !== 'object') continue
      const maybeUrl = typeof maybeItem.url === 'string' ? maybeItem.url.trim() : ''
      if (maybeUrl) urls.push(maybeUrl)
    }
  }

  return urls
}

function detectMediaTypeFromUrl(url: string): 'image' | 'video' {
  const lower = url.toLowerCase()
  if (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.endsWith('.avi')
  ) {
    return 'video'
  }

  return 'image'
}

function normalizePromptMediaEntries(input: {
  promptId: number
  promptTitle: string
  promptText: string
  promptModel: string
  promptRating: number | null
  promptNotes: string | null
  promptImageUrl: string
  promptImagesJson: unknown
}) {
  const entries: Array<{
    promptMediaId: string
    mediaUrl: string
    mediaType: 'image' | 'video'
    title: string | null
    promptUsed: string | null
    model: string | null
    rating: number
    notes: string | null
    collectionId: string | null
    durationSeconds: number | undefined
    thumbnailUrl: string | null
    promptSource: 'generated' | 'improved' | 'custom'
    stylePreset: string
    seed: string
    mediaCreatedAt: string
  }> = []

  const promptRating = typeof input.promptRating === 'number' && Number.isFinite(input.promptRating)
    ? Math.max(0, Math.min(5, Math.round(input.promptRating)))
    : 0

  const sourceEntries = Array.isArray(input.promptImagesJson)
    ? input.promptImagesJson
    : []

  for (let index = 0; index < sourceEntries.length; index += 1) {
    const raw = sourceEntries[index] as PromptImageJsonItem
    if (!raw || typeof raw !== 'object') continue

    const mediaUrl = typeof raw.url === 'string' ? raw.url.trim() : ''
    if (!mediaUrl) continue

    const mediaType = raw.mediaType === 'video' || raw.mediaType === 'image'
      ? raw.mediaType
      : detectMediaTypeFromUrl(mediaUrl)
    const promptMediaId = typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `prompt-${input.promptId}-${index}`
    const customPrompt = typeof raw.customPrompt === 'string' ? raw.customPrompt.trim() : ''
    const promptSource = customPrompt
      ? 'custom'
      : (raw.promptSource === 'improved' ? 'improved' : 'generated')

    entries.push({
      promptMediaId,
      mediaUrl,
      mediaType,
      title: input.promptTitle || null,
      promptUsed: customPrompt || input.promptText || null,
      model: (typeof raw.model === 'string' && raw.model.trim()) ? raw.model.trim() : (input.promptModel || null),
      rating: promptRating,
      notes: (typeof raw.note === 'string' && raw.note.trim()) ? raw.note.trim() : (input.promptNotes || null),
      collectionId: typeof raw.collectionId === 'string' ? raw.collectionId : null,
      durationSeconds: typeof raw.durationSeconds === 'number' ? raw.durationSeconds : undefined,
      thumbnailUrl: (typeof raw.thumbnailUrl === 'string' && raw.thumbnailUrl.trim()) ? raw.thumbnailUrl.trim() : null,
      promptSource,
      stylePreset: typeof raw.stylePreset === 'string' ? raw.stylePreset.trim() : '',
      seed: typeof raw.seed === 'string' ? raw.seed.trim() : '',
      mediaCreatedAt: typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt.trim()
        : new Date().toISOString(),
    })
  }

  if (entries.length === 0) {
    const legacyImageUrl = typeof input.promptImageUrl === 'string' ? input.promptImageUrl.trim() : ''
    if (legacyImageUrl) {
      entries.push({
        promptMediaId: `prompt-${input.promptId}-legacy-cover`,
        mediaUrl: legacyImageUrl,
        mediaType: detectMediaTypeFromUrl(legacyImageUrl),
        title: input.promptTitle || null,
        promptUsed: input.promptText || null,
        model: input.promptModel || null,
        rating: promptRating,
        notes: input.promptNotes || null,
        collectionId: null,
        durationSeconds: undefined,
        thumbnailUrl: null,
        promptSource: 'generated',
        stylePreset: '',
        seed: '',
        mediaCreatedAt: new Date().toISOString(),
      })
    }
  }

  return entries
}

function buildExportTimestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function buildDatabaseBackupPayload(input: {
  aiConfigurationSettings: unknown[]
  prompts: unknown[]
  promptVersions: unknown[]
  styleProfiles: unknown[]
  generationLog: unknown[]
  openRouterModels: unknown[]
  nightcafeModels: unknown[]
  nightcafePresets: unknown[]
  aiUsageEvents: unknown[]
  characters: unknown[]
  greylist: unknown[]
  collections: unknown[]
  galleryItems: unknown[]
}) {
  const tableCounts: Record<string, number> = {
    ai_configuration_settings: input.aiConfigurationSettings.length,
    prompts: input.prompts.length,
    prompt_versions: input.promptVersions.length,
    style_profiles: input.styleProfiles.length,
    generation_log: input.generationLog.length,
    openrouter_models: input.openRouterModels.length,
    nightcafe_models: input.nightcafeModels.length,
    nightcafe_presets: input.nightcafePresets.length,
    ai_usage_events: input.aiUsageEvents.length,
    characters: input.characters.length,
    greylist: input.greylist.length,
    collections: input.collections.length,
    gallery_items: input.galleryItems.length,
  }

  return {
    exportedAt: new Date().toISOString(),
    summary: tableCounts,
    data: {
      aiConfigurationSettings: input.aiConfigurationSettings,
      prompts: input.prompts,
      promptVersions: input.promptVersions,
      styleProfiles: input.styleProfiles,
      generationLog: input.generationLog,
      openRouterModels: input.openRouterModels,
      nightcafeModels: input.nightcafeModels,
      nightcafePresets: input.nightcafePresets,
      aiUsageEvents: input.aiUsageEvents,
      characters: input.characters,
      greylist: input.greylist,
      collections: input.collections,
      galleryItems: input.galleryItems,
    },
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
      const data = await getOpenRouterSettings(db)
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getProviderMeta', async (_, providerId: string, fallbackModel = DEFAULT_OPENROUTER_MODEL) => {
    try {
      const stored = await readAiConfigurationStore(db)
      const providerMap = stored.providerMeta
      const data = normalizeProviderMeta(providerMap[providerId], fallbackModel)
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveProviderMeta', async (_, providerId: string, input: Partial<ProviderMetaStore>) => {
    try {
      const stored = await readAiConfigurationStore(db)
      const providerMap = { ...stored.providerMeta }
      const fallbackModel = input.model_gen || input.model_improve || input.model_vision || input.model_general || DEFAULT_OPENROUTER_MODEL
      const current = normalizeProviderMeta(providerMap[providerId], fallbackModel)
      const next = normalizeProviderMeta({ ...current, ...input }, fallbackModel)

      providerMap[providerId] = next

      await writeAiConfigurationStore(db, {
        ...stored,
        providerMeta: providerMap,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(legacyStored.openRouter),
        providerMeta: providerMap,
        aiConfig: legacyStored.aiConfig,
        localEndpoints: legacyStored.localEndpoints,
      })

      return { data: next }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getLocalEndpoints', async () => {
    try {
      const stored = await readAiConfigurationStore(db)
      const data = normalizeLocalEndpoints(stored.localEndpoints)
      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveLocalEndpoints', async (_, input: LocalEndpointStore[]) => {
    try {
      const stored = await readAiConfigurationStore(db)
      const nextLocalEndpoints = Array.isArray(input) ? input : []

      await writeAiConfigurationStore(db, {
        ...stored,
        localEndpoints: nextLocalEndpoints,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(legacyStored.openRouter),
        providerMeta: legacyStored.providerMeta,
        aiConfig: legacyStored.aiConfig,
        localEndpoints: nextLocalEndpoints,
      })

      return { data: nextLocalEndpoints }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:getAiConfigState', async () => {
    try {
      const stored = await readAiConfigurationStore(db)
      return { data: stored.aiConfig }
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
      const stored = await readAiConfigurationStore(db)
      const previousNativeWindowFrameEnabled = Boolean(stored.aiConfig.nativeWindowFrameEnabled)
      const nextAiConfig: AiConfigStateStore = {
        ...stored.aiConfig,
        ...(input || {}),
      }

      await writeAiConfigurationStore(db, {
        ...stored,
        aiConfig: nextAiConfig,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(legacyStored.openRouter),
        providerMeta: legacyStored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: legacyStored.localEndpoints,
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
      const data = await getNightCompanionFolderPath(db)
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

      const stored = await readAiConfigurationStore(db)
      const nextAiConfig: AiConfigStateStore = {
        ...stored.aiConfig,
        nightCompanionFolderPath: resolvedPath,
      }

      await writeAiConfigurationStore(db, {
        ...stored,
        aiConfig: nextAiConfig,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(legacyStored.openRouter),
        providerMeta: legacyStored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: legacyStored.localEndpoints,
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

      const stored = await readAiConfigurationStore(db)
      const nextAiConfig: AiConfigStateStore = {
        ...stored.aiConfig,
        nightCompanionFolderPath: defaultPath,
      }

      await writeAiConfigurationStore(db, {
        ...stored,
        aiConfig: nextAiConfig,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: normalizeOpenRouterSettings(legacyStored.openRouter),
        providerMeta: legacyStored.providerMeta,
        aiConfig: nextAiConfig,
        localEndpoints: legacyStored.localEndpoints,
      })

      return { data: defaultPath }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:selectNightCompanionFolderPath', async () => {
    try {
      const currentPath = await getNightCompanionFolderPath(db)
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

  ipcMain.handle('settings:exportPromptsAndImages', async (_, input?: { includePrompts?: boolean; includeImages?: boolean }) => {
    try {
      const includePrompts = input?.includePrompts !== false
      const includeImages = input?.includeImages !== false

      if (!includePrompts && !includeImages) {
        throw new Error('Nothing to export. Select prompts and/or images.')
      }

      const defaultPath = await getNightCompanionFolderPath()
      const selection = await dialog.showOpenDialog({
        title: 'Select export folder for prompts and images',
        defaultPath,
        properties: ['openDirectory', 'createDirectory'],
      })

      if (selection.canceled || selection.filePaths.length === 0) {
        return { data: null as LibraryExportSummary | null }
      }

      const selectedDir = selection.filePaths[0]
      const exportDirPath = path.join(selectedDir, `nightcompanion-export-${buildExportTimestamp()}`)
      const imagesDirPath = path.join(exportDirPath, 'images')
      const exportFilePath = path.join(exportDirPath, includePrompts ? 'prompts-export.json' : 'images-export.json')

      await mkdir(exportDirPath, { recursive: true })
      if (includeImages) {
        await mkdir(imagesDirPath, { recursive: true })
      }

      const promptRows = await db.select().from(prompts).orderBy(desc(prompts.createdAt))
      const versionRows = await db.select().from(promptVersions).orderBy(desc(promptVersions.createdAt))

      const imageUrlToRelativePath = new Map<string, string>()
      const usedFileNames = new Set<string>()
      let imagesCopied = 0
      let imagesMissing = 0
      let imagesSkipped = 0

      const allUrls = new Set<string>()
      for (const row of promptRows) {
        for (const url of normalizePromptImageUrls(row.imageUrl, row.imagesJson)) allUrls.add(url)
      }
      for (const row of versionRows) {
        for (const url of normalizePromptImageUrls(row.imageUrl, row.imagesJson)) allUrls.add(url)
      }

      if (includeImages) {
        const sanitizeFileNamePart = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
        let imageCounter = 0
        for (const sourceUrl of allUrls) {
          const sourcePath = resolveExportableFilePath(sourceUrl)
          if (!sourcePath) {
            imagesSkipped += 1
            continue
          }

          try {
            const stats = await stat(sourcePath)
            if (!stats.isFile()) {
              imagesMissing += 1
              continue
            }

            const extension = path.extname(sourcePath) || '.bin'
            const baseName = sanitizeFileNamePart(path.basename(sourcePath, extension)) || 'image'
            let fileName = `${String(imageCounter + 1).padStart(4, '0')}-${baseName}${extension}`
            while (usedFileNames.has(fileName)) {
              imageCounter += 1
              fileName = `${String(imageCounter + 1).padStart(4, '0')}-${baseName}${extension}`
            }
            usedFileNames.add(fileName)
            imageCounter += 1

            const destinationPath = path.join(imagesDirPath, fileName)
            await copyFile(sourcePath, destinationPath)
            imageUrlToRelativePath.set(sourceUrl, `images/${fileName}`)
            imagesCopied += 1
          } catch {
            imagesMissing += 1
          }
        }
      } else {
        imagesSkipped = allUrls.size
      }

      const exportImages = Array.from(allUrls)
        .map((url) => ({
          sourceUrl: url,
          exportedPath: imageUrlToRelativePath.get(url) ?? null,
        }))
        .sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl))

      const exportPayload = includePrompts ? {
        exportedAt: new Date().toISOString(),
        includedPrompts: includePrompts,
        includedImages: includeImages,
        summary: {
          promptsCount: promptRows.length,
          promptVersionsCount: versionRows.length,
          imagesCopied,
          imagesMissing,
          imagesSkipped,
        },
        prompts: promptRows.map((row) => ({
          ...row,
          exportImages: normalizePromptImageUrls(row.imageUrl, row.imagesJson)
            .map((url) => ({
              sourceUrl: url,
              exportedPath: imageUrlToRelativePath.get(url) ?? null,
            })),
        })),
        promptVersions: versionRows.map((row) => ({
          ...row,
          exportImages: normalizePromptImageUrls(row.imageUrl, row.imagesJson)
            .map((url) => ({
              sourceUrl: url,
              exportedPath: imageUrlToRelativePath.get(url) ?? null,
            })),
        })),
      } : {
        exportedAt: new Date().toISOString(),
        includedPrompts: includePrompts,
        includedImages: includeImages,
        summary: {
          promptsCount: promptRows.length,
          promptVersionsCount: versionRows.length,
          imagesCopied,
          imagesMissing,
          imagesSkipped,
        },
        images: exportImages,
      }

      await writeFile(exportFilePath, JSON.stringify(exportPayload, null, 2), 'utf-8')

      return {
        data: {
          exportDirPath,
          exportFilePath,
          includedPrompts: includePrompts,
          includedImages: includeImages,
          promptsCount: promptRows.length,
          promptVersionsCount: versionRows.length,
          imagesCopied,
          imagesMissing,
          imagesSkipped,
        } as LibraryExportSummary,
      }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:backupDatabase', async () => {
    try {
      const defaultPath = await getNightCompanionFolderPath()
      const selection = await dialog.showOpenDialog({
        title: 'Select export folder for database backup',
        defaultPath,
        properties: ['openDirectory', 'createDirectory'],
      })

      if (selection.canceled || selection.filePaths.length === 0) {
        return { data: null as DatabaseBackupSummary | null }
      }

      const selectedDir = selection.filePaths[0]
      const exportDirPath = path.join(selectedDir, `nightcompanion-db-backup-${buildExportTimestamp()}`)
      const backupFilePath = path.join(exportDirPath, 'db-backup.json')

      await mkdir(exportDirPath, { recursive: true })

      const [
        aiConfigurationSettingsRows,
        promptRows,
        versionRows,
        styleProfileRows,
        generationLogRows,
        openRouterModelRows,
        nightcafeModelRows,
        nightcafePresetRows,
        aiUsageEventRows,
        characterRows,
        greylistRows,
        collectionRows,
        galleryItemRows,
      ] = await Promise.all([
        db.select().from(aiConfigurationSettings).orderBy(desc(aiConfigurationSettings.updatedAt)),
        db.select().from(prompts).orderBy(desc(prompts.createdAt)),
        db.select().from(promptVersions).orderBy(desc(promptVersions.createdAt)),
        db.select().from(styleProfiles).orderBy(desc(styleProfiles.createdAt)),
        db.select().from(generationLog).orderBy(desc(generationLog.createdAt)),
        db.select().from(openRouterModels).orderBy(desc(openRouterModels.updatedAt)),
        db.select().from(nightcafeModels).orderBy(desc(nightcafeModels.updatedAt)),
        db.select().from(nightcafePresets).orderBy(desc(nightcafePresets.updatedAt)),
        db.select().from(aiUsageEvents).orderBy(desc(aiUsageEvents.createdAt)),
        db.select().from(characters).orderBy(desc(characters.createdAt)),
        db.select().from(greylistTable).orderBy(desc(greylistTable.createdAt)),
        db.select().from(collections).orderBy(desc(collections.createdAt)),
        db.select().from(galleryItems).orderBy(desc(galleryItems.createdAt)),
      ])

      const payload = buildDatabaseBackupPayload({
        aiConfigurationSettings: aiConfigurationSettingsRows,
        prompts: promptRows,
        promptVersions: versionRows,
        styleProfiles: styleProfileRows,
        generationLog: generationLogRows,
        openRouterModels: openRouterModelRows,
        nightcafeModels: nightcafeModelRows,
        nightcafePresets: nightcafePresetRows,
        aiUsageEvents: aiUsageEventRows,
        characters: characterRows,
        greylist: greylistRows,
        collections: collectionRows,
        galleryItems: galleryItemRows,
      })

      await writeFile(backupFilePath, JSON.stringify(payload, null, 2), 'utf-8')

      return {
        data: {
          exportDirPath,
          backupFilePath,
          tables: payload.summary,
        } satisfies DatabaseBackupSummary,
      }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:backfillPromptMediaToGallery', async () => {
    try {
      const promptRows = await db
        .select({
          id: prompts.id,
          title: prompts.title,
          imageUrl: prompts.imageUrl,
          imagesJson: prompts.imagesJson,
          promptText: prompts.promptText,
          model: prompts.model,
          rating: prompts.rating,
          notes: prompts.notes,
        })
        .from(prompts)

      const summary: PromptMediaBackfillSummary = {
        promptsScanned: promptRows.length,
        promptsWithMedia: 0,
        mediaEntries: 0,
        inserted: 0,
        updated: 0,
        removed: 0,
      }

      for (const promptRow of promptRows) {
        const promptIdString = String(promptRow.id)
        const normalizedMedia = normalizePromptMediaEntries({
          promptId: promptRow.id,
          promptTitle: promptRow.title,
          promptText: promptRow.promptText,
          promptModel: promptRow.model,
          promptRating: promptRow.rating,
          promptNotes: promptRow.notes,
          promptImageUrl: promptRow.imageUrl,
          promptImagesJson: promptRow.imagesJson,
        })

        if (normalizedMedia.length > 0) {
          summary.promptsWithMedia += 1
          summary.mediaEntries += normalizedMedia.length
        }

        const existingRows = await db
          .select()
          .from(galleryItems)
          .where(sql`coalesce(${galleryItems.metadata}->>'source', '') = 'prompt-library' and coalesce(${galleryItems.metadata}->>'connectedPromptId', '') = ${promptIdString}`)

        const existingByPromptMediaId = new Map<string, typeof existingRows[number]>()
        for (const row of existingRows) {
          const key = typeof row.metadata?.promptMediaId === 'string'
            ? row.metadata.promptMediaId
            : ''
          if (key) {
            existingByPromptMediaId.set(key, row)
          }
        }

        const nextIds = new Set<string>()

        for (const media of normalizedMedia) {
          nextIds.add(media.promptMediaId)

          const existing = existingByPromptMediaId.get(media.promptMediaId)
          const payload = {
            title: media.title,
            imageUrl: media.mediaType === 'image' ? media.mediaUrl : (media.thumbnailUrl || null),
            videoUrl: media.mediaType === 'video' ? media.mediaUrl : null,
            thumbnailUrl: media.thumbnailUrl,
            mediaType: media.mediaType,
            promptUsed: media.promptUsed,
            model: media.model,
            rating: media.rating,
            notes: media.notes,
            collectionId: media.collectionId ?? existing?.collectionId ?? null,
            durationSeconds: media.durationSeconds,
            metadata: {
              source: 'prompt-library',
              connectedPromptId: promptRow.id,
              promptMediaId: media.promptMediaId,
              promptSource: media.promptSource,
              stylePreset: media.stylePreset,
              seed: media.seed,
              mediaCreatedAt: media.mediaCreatedAt,
            },
            updatedAt: new Date(),
          }

          if (existing) {
            await db
              .update(galleryItems)
              .set(payload)
              .where(eq(galleryItems.id, existing.id))
            summary.updated += 1
          } else {
            await db
              .insert(galleryItems)
              .values(payload)
            summary.inserted += 1
          }
        }

        for (const row of existingRows) {
          const promptMediaId = typeof row.metadata?.promptMediaId === 'string'
            ? row.metadata.promptMediaId
            : ''
          if (!promptMediaId || nextIds.has(promptMediaId)) continue

          await db
            .delete(galleryItems)
            .where(eq(galleryItems.id, row.id))
          summary.removed += 1
        }
      }

      return { data: summary }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('settings:saveOpenRouter', async (_, input: Partial<OpenRouterSettings>) => {
    try {
      const stored = await readAiConfigurationStore(db)
      const data = normalizeOpenRouterSettings({
        ...normalizeOpenRouterSettings(stored.openRouter),
        ...input,
      })

      await writeAiConfigurationStore(db, {
        ...stored,
        openRouter: data,
      })

      const legacyStored = await readStoredSettings()

      await writeStoredSettings({
        openRouter: data,
        providerMeta: legacyStored.providerMeta,
        aiConfig: legacyStored.aiConfig,
        localEndpoints: legacyStored.localEndpoints,
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
      const stored = await getOpenRouterSettings(db)
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
      const stored = await getOpenRouterSettings(db)
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
