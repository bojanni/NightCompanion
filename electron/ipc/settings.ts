import { app, ipcMain } from 'electron'
import path from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../../src/lib/schema'
import { openRouterModels } from '../../src/lib/schema'

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
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
}

type AiConfigStateStore = {
  dashboardRoleRouting?: unknown
  cachedModels?: unknown
  advisorModelRoute?: unknown
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
  is_active?: boolean
  is_active_gen?: boolean
  is_active_improve?: boolean
  is_active_vision?: boolean
  updated_at?: string
}

type OpenRouterModel = {
  modelId: string
  displayName: string
  contextLength: number | null
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

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'

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
    is_active: input?.is_active ?? false,
    is_active_gen: input?.is_active_gen ?? false,
    is_active_improve: input?.is_active_improve ?? false,
    is_active_vision: input?.is_active_vision ?? false,
  }
}

async function readStoredSettings(): Promise<StoredSettings> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf-8')
    return JSON.parse(raw) as StoredSettings
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

async function listOpenRouterModelsFromDb(db: Database) {
  const data = await db
    .select({
      modelId: openRouterModels.modelId,
      displayName: openRouterModels.displayName,
      contextLength: openRouterModels.contextLength,
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
      context_length?: number
      pricing?: {
        prompt?: string
        completion?: string
        request?: string
        image?: string
      }
    }>
  }

  const normalized = (payload.data ?? [])
    .map((item) => {
      const modelId = item.id?.trim()
      if (!modelId) return null

      return {
        modelId,
        displayName: item.name?.trim() || modelId,
        contextLength: typeof item.context_length === 'number' ? item.context_length : null,
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
        contextLength: item.contextLength,
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

export function registerSettingsIpc({ db }: { db: Database }) {
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
      const fallbackModel = input.model_gen || input.model_improve || input.model_vision || DEFAULT_OPENROUTER_MODEL
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

      return { data: nextAiConfig }
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
