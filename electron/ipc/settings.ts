import { app, dialog, ipcMain } from 'electron'
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
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
}

type LocalEndpointStore = {
  id?: string
  provider?: string
  name?: string
  baseUrl?: string
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

  return normalized
}

function normalizeStoredSettings(input: unknown): StoredSettings {
  if (!isRecord(input)) return {}

  const normalized: StoredSettings = {}

  if (isRecord(input.openRouter)) normalized.openRouter = input.openRouter

  const providerMeta = normalizeProviderMetaMap(input.providerMeta)
  if (providerMeta) normalized.providerMeta = providerMeta

  const aiConfig = normalizeAiConfigState(input.aiConfig)
  if (aiConfig) normalized.aiConfig = aiConfig

  if (Array.isArray(input.localEndpoints)) {
    normalized.localEndpoints = input.localEndpoints.filter((item): item is LocalEndpointStore => isRecord(item))
  }

  return normalized
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
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
    const parsed = JSON.parse(raw) as unknown
    const normalized = normalizeStoredSettings(parsed)

    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      const settingsPath = getSettingsFilePath()
      await mkdir(path.dirname(settingsPath), { recursive: true })
      await writeFile(settingsPath, JSON.stringify(normalized, null, 2), 'utf-8')
      console.info('[settings] settings.json normalized and rewritten to disk')
    }

    return normalized
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return {}
    throw error
  }
}

async function writeStoredSettings(settings: {
  openRouter: OpenRouterSettings
  providerMeta?: Record<string, Partial<ProviderMetaStore>>
  aiConfig?: AiConfigStateStore
  localEndpoints?: LocalEndpointStore[]
}) {
  const settingsPath = getSettingsFilePath()
  await mkdir(path.dirname(settingsPath), { recursive: true })
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
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
