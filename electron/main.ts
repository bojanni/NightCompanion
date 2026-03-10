import 'dotenv/config'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { mkdirSync } from 'fs'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { fileURLToPath, pathToFileURL } from 'url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { eq, desc, and, or, ilike, sql, notInArray } from 'drizzle-orm'
import * as schema from '../src/lib/schema'
import { prompts, styleProfiles, generationLog, openRouterModels, nightcafeModels, nightcafePresets } from '../src/lib/schema'
import type { NewPrompt, NewStyleProfile, NewGenerationEntry } from '../src/lib/schema'

// Keep Chromium disk caches in a writable temp location to avoid Windows access-denied startup errors.
const sessionDataPath = path.join(app.getPath('temp'), 'NightCompanion', 'session-data')
try {
  mkdirSync(sessionDataPath, { recursive: true })
  app.setPath('sessionData', sessionDataPath)
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
} catch (error) {
  console.warn('Could not set custom sessionData path:', error)
}

// ─── Database ─────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set — create a .env file from .env.example')
  app.quit()
  process.exit(1)
}

const queryClient = postgres(connectionString)
const db = drizzle(queryClient, { schema })

async function runMigrations() {
  const migrateClient = postgres(connectionString!, { max: 1 })
  const migrateDb = drizzle(migrateClient)
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(app.getAppPath(), 'drizzle')

  await migrate(migrateDb, { migrationsFolder })
  await migrateClient.end()
}

// ─── Window ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#050810',
    titleBarStyle: 'hiddenInset',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5187')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── IPC: Prompts ─────────────────────────────────────────────────────────────

type PromptFilters = { search?: string; tags?: string[]; model?: string }
type OpenRouterSettings = {
  apiKey: string
  model: string
  siteUrl: string
  appName: string
}

type OpenRouterModel = {
  modelId: string
  displayName: string
  contextLength: number | null
}

type NightcafeModelFilters = {
  mediaType?: 'image' | 'video'
}

type NightcafePresetOption = {
  presetName: string
  category: string
}

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const NIGHTCAFE_MODELS_FILE = 'nightcafe_models_compleet.csv'
const NIGHTCAFE_PRESETS_FILE = 'nightcafe_presets.csv'

function getCharactersImageDir() {
  const localAppData = process.env.LOCALAPPDATA
    || path.join(app.getPath('home'), 'AppData', 'Local')

  return path.join(localAppData, 'NightCompanion', 'characters')
}

function getImageExtension(mimeType: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
  }

  return map[mimeType] || 'png'
}

async function saveCharacterImageDataUrl(dataUrl: string, originalName?: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid image payload. Expected a base64 data URL.')
  }

  const mimeType = match[1]
  const base64Data = match[2]
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const extension = getImageExtension(mimeType)
  const safeBaseName = (originalName || 'image')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50)
  const fileName = `${Date.now()}-${safeBaseName || randomUUID()}.${extension}`

  const imageDir = getCharactersImageDir()
  await mkdir(imageDir, { recursive: true })

  const filePath = path.join(imageDir, fileName)
  await writeFile(filePath, imageBuffer)

  return pathToFileURL(filePath).href
}

async function deleteCharacterImageFile(fileUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    return
  }

  if (parsed.protocol !== 'file:') return

  const imageDir = path.resolve(getCharactersImageDir())
  const targetPath = path.resolve(fileURLToPath(parsed))

  if (!targetPath.startsWith(imageDir)) {
    throw new Error('Refused to delete file outside character image directory.')
  }

  try {
    await unlink(targetPath)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') throw error
  }
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

async function readStoredSettings(): Promise<{ openRouter?: Partial<OpenRouterSettings> }> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf-8')
    return JSON.parse(raw) as { openRouter?: Partial<OpenRouterSettings> }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      return {}
    }
    throw error
  }
}

async function writeStoredSettings(settings: { openRouter: OpenRouterSettings }) {
  const settingsPath = getSettingsFilePath()
  await mkdir(path.dirname(settingsPath), { recursive: true })
  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

async function getOpenRouterSettings() {
  const stored = await readStoredSettings()
  return normalizeOpenRouterSettings(stored.openRouter)
}

async function listOpenRouterModelsFromDb() {
  const data = await db
    .select({
      modelId: openRouterModels.modelId,
      displayName: openRouterModels.displayName,
      contextLength: openRouterModels.contextLength,
    })
    .from(openRouterModels)
    .orderBy(openRouterModels.displayName)

  return data
}

async function syncOpenRouterModels(settings: OpenRouterSettings) {
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

function getNightCafeModelsCandidates() {
  const candidates = [
    path.join(app.getAppPath(), 'resources', 'models', NIGHTCAFE_MODELS_FILE),
    path.join(process.resourcesPath, 'models', NIGHTCAFE_MODELS_FILE),
    path.join(process.resourcesPath, 'resources', 'models', NIGHTCAFE_MODELS_FILE),
  ]

  return [...new Set(candidates)]
}

function getNightCafePresetsCandidates() {
  const candidates = [
    path.join(app.getAppPath(), 'resources', 'presets', NIGHTCAFE_PRESETS_FILE),
    path.join(process.resourcesPath, 'presets', NIGHTCAFE_PRESETS_FILE),
    path.join(process.resourcesPath, 'resources', 'presets', NIGHTCAFE_PRESETS_FILE),
  ]

  return [...new Set(candidates)]
}

async function readNightCafeModelsCsv() {
  const candidates = getNightCafeModelsCandidates()

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8')
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') continue
      throw error
    }
  }

  throw new Error(`NightCafe model file not found. Looked in: ${candidates.join(', ')}`)
}

async function readNightCafePresetsCsv() {
  const candidates = getNightCafePresetsCandidates()

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8')
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') continue
      throw error
    }
  }

  throw new Error(`NightCafe presets file not found. Looked in: ${candidates.join(', ')}`)
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function normalizeNightCafeModelType(raw: string) {
  const value = raw.trim().toLowerCase()
  if (value.includes('video')) return 'video' as const
  if (value.includes('edit')) return 'edit' as const
  if (value.includes('image')) return 'image' as const
  return 'unknown' as const
}

function makeModelKey(name: string, modelType: string) {
  return `${name.trim().toLowerCase()}::${modelType}`
}

function parseNightCafeModelsCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('NightCafe model CSV has no data rows.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ''))
  const rows = lines.slice(1)

  const byKey = new Map<string, {
    modelKey: string
    modelName: string
    description: string
    modelType: string
    mediaType: string
    artScore: string
    promptingScore: string
    realismScore: string
    typographyScore: string
    costTier: string
    updatedAt: Date
  }>()

  for (const row of rows) {
    const cells = parseCsvLine(row)
    if (cells.length === 0) continue

    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })

    const modelName = (record.Model || '').trim()
    if (!modelName) continue

    const modelType = normalizeNightCafeModelType(record.Type || '')
    const mediaType = modelType === 'video' ? 'video' : 'image'
    const modelKey = makeModelKey(modelName, modelType)

    byKey.set(modelKey, {
      modelKey,
      modelName,
      description: (record.Beschrijving || '').trim(),
      modelType,
      mediaType,
      artScore: (record['Art (★)'] || '').trim(),
      promptingScore: (record['Prompting (★)'] || '').trim(),
      realismScore: (record['Realism (★)'] || '').trim(),
      typographyScore: (record['Typography (★)'] || '').trim(),
      costTier: (record['Kosten ($)'] || '').trim(),
      updatedAt: new Date(),
    })
  }

  return [...byKey.values()]
}

async function syncNightCafeModelsFromCsv() {
  const csv = await readNightCafeModelsCsv()
  const rows = parseNightCafeModelsCsv(csv)

  if (rows.length === 0) {
    throw new Error('NightCafe model CSV parsed but produced zero models.')
  }

  for (const row of rows) {
    await db
      .insert(nightcafeModels)
      .values(row)
      .onConflictDoUpdate({
        target: nightcafeModels.modelKey,
        set: {
          modelName: row.modelName,
          description: row.description,
          modelType: row.modelType,
          mediaType: row.mediaType,
          artScore: row.artScore,
          promptingScore: row.promptingScore,
          realismScore: row.realismScore,
          typographyScore: row.typographyScore,
          costTier: row.costTier,
          updatedAt: new Date(),
        },
      })
  }

  const validKeys = rows.map((row) => row.modelKey)
  if (validKeys.length > 0) {
    await db.delete(nightcafeModels).where(notInArray(nightcafeModels.modelKey, validKeys))
  }

  const imageCount = rows.filter((row) => row.mediaType === 'image').length
  const videoCount = rows.filter((row) => row.mediaType === 'video').length
  console.log(`NightCafe models synced: ${rows.length} total (${imageCount} image, ${videoCount} video)`)
}

function parseNightCafePresetsCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error('NightCafe presets CSV has no data rows.')
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, ''))
  const rows = lines.slice(1)

  const byKey = new Map<string, {
    presetKey: string
    presetName: string
    category: string
    gridRow: number | null
    gridColumn: number | null
    updatedAt: Date
  }>()

  for (const row of rows) {
    const cells = parseCsvLine(row)
    if (cells.length === 0) continue

    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? ''
    })

    const presetName = (record['Preset Name'] || '').trim()
    if (!presetName) continue

    const category = (record.Category || '').trim()
    const gridRow = Number.parseInt(record.Row || '', 10)
    const gridColumn = Number.parseInt(record.Column || '', 10)
    const presetKey = presetName.toLowerCase()

    byKey.set(presetKey, {
      presetKey,
      presetName,
      category,
      gridRow: Number.isNaN(gridRow) ? null : gridRow,
      gridColumn: Number.isNaN(gridColumn) ? null : gridColumn,
      updatedAt: new Date(),
    })
  }

  return [...byKey.values()]
}

async function syncNightCafePresetsFromCsv() {
  const csv = await readNightCafePresetsCsv()
  const rows = parseNightCafePresetsCsv(csv)

  if (rows.length === 0) {
    throw new Error('NightCafe presets CSV parsed but produced zero presets.')
  }

  for (const row of rows) {
    await db
      .insert(nightcafePresets)
      .values(row)
      .onConflictDoUpdate({
        target: nightcafePresets.presetKey,
        set: {
          presetName: row.presetName,
          category: row.category,
          gridRow: row.gridRow,
          gridColumn: row.gridColumn,
          updatedAt: new Date(),
        },
      })
  }

  const validKeys = rows.map((row) => row.presetKey)
  if (validKeys.length > 0) {
    await db.delete(nightcafePresets).where(notInArray(nightcafePresets.presetKey, validKeys))
  }

  console.log(`NightCafe presets synced: ${rows.length} total`)
}

ipcMain.handle('prompts:list', async (_, filters: PromptFilters = {}) => {
  try {
    const { search, tags, model } = filters
    const conditions = []

    if (search && search.trim()) {
      conditions.push(
        or(
          ilike(prompts.title, `%${search.trim()}%`),
          ilike(prompts.promptText, `%${search.trim()}%`)
        )
      )
    }
    if (model && model.trim()) {
      conditions.push(eq(prompts.model, model.trim()))
    }
    if (tags && tags.length > 0) {
      const tagValues = tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ')
      conditions.push(sql`${prompts.tags} @> ARRAY[${sql.raw(tagValues)}]::text[]`)
    }

    const data = await db
      .select()
      .from(prompts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(prompts.createdAt))

    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('prompts:get', async (_, id: number) => {
  try {
    const [data] = await db.select().from(prompts).where(eq(prompts.id, id))
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('prompts:create', async (_, data: NewPrompt) => {
  try {
    const [created] = await db
      .insert(prompts)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return { data: created }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('prompts:update', async (_, id: number, data: Partial<NewPrompt>) => {
  try {
    const [updated] = await db
      .update(prompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(prompts.id, id))
      .returning()
    return { data: updated }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('prompts:delete', async (_, id: number) => {
  try {
    await db.delete(prompts).where(eq(prompts.id, id))
    return { data: undefined }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── IPC: Style Profiles ──────────────────────────────────────────────────────

ipcMain.handle('styleProfiles:list', async () => {
  try {
    const data = await db
      .select()
      .from(styleProfiles)
      .orderBy(desc(styleProfiles.createdAt))
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('styleProfiles:get', async (_, id: number) => {
  try {
    const [data] = await db.select().from(styleProfiles).where(eq(styleProfiles.id, id))
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('styleProfiles:create', async (_, data: NewStyleProfile) => {
  try {
    const [created] = await db
      .insert(styleProfiles)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return { data: created }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('styleProfiles:update', async (_, id: number, data: Partial<NewStyleProfile>) => {
  try {
    const [updated] = await db
      .update(styleProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(styleProfiles.id, id))
      .returning()
    return { data: updated }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('styleProfiles:delete', async (_, id: number) => {
  try {
    await db.delete(styleProfiles).where(eq(styleProfiles.id, id))
    return { data: undefined }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── IPC: Generation Log ──────────────────────────────────────────────────────

ipcMain.handle('generationLog:list', async () => {
  try {
    const data = await db
      .select()
      .from(generationLog)
      .orderBy(desc(generationLog.createdAt))
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('generationLog:create', async (_, data: NewGenerationEntry) => {
  try {
    const [created] = await db
      .insert(generationLog)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning()
    return { data: created }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('generationLog:update', async (_, id: number, data: Partial<NewGenerationEntry>) => {
  try {
    const [updated] = await db
      .update(generationLog)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(generationLog.id, id))
      .returning()
    return { data: updated }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('generationLog:delete', async (_, id: number) => {
  try {
    await db.delete(generationLog).where(eq(generationLog.id, id))
    return { data: undefined }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── IPC: Settings / AI Generation ───────────────────────────────────────────

ipcMain.handle('settings:getOpenRouter', async () => {
  try {
    const data = await getOpenRouterSettings()
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('settings:saveOpenRouter', async (_, input: Partial<OpenRouterSettings>) => {
  try {
    const data = normalizeOpenRouterSettings(input)

    if (data.apiKey) {
      await syncOpenRouterModels(data)
    } else {
      await db.delete(openRouterModels)
    }

    await writeStoredSettings({ openRouter: data })
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('settings:listOpenRouterModels', async () => {
  try {
    const data = await listOpenRouterModelsFromDb()
    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('settings:refreshOpenRouterModels', async (_, input?: Partial<OpenRouterSettings>) => {
  try {
    const data = normalizeOpenRouterSettings(input)
    const models = await syncOpenRouterModels(data)
    return { data: models }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('settings:testOpenRouter', async (_, input?: Partial<OpenRouterSettings>) => {
  try {
    const data = normalizeOpenRouterSettings(input)
    const result = await testOpenRouterConnection(data)
    return { data: result }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── IPC: NightCafe Models ───────────────────────────────────────────────────

ipcMain.handle('nightcafeModels:list', async (_, filters: NightcafeModelFilters = {}) => {
  try {
    const mediaType = filters.mediaType?.trim().toLowerCase()
    const data = await db
      .select({
        modelName: nightcafeModels.modelName,
        modelType: nightcafeModels.modelType,
        mediaType: nightcafeModels.mediaType,
      })
      .from(nightcafeModels)
      .where(mediaType === 'image' || mediaType === 'video' ? eq(nightcafeModels.mediaType, mediaType) : undefined)
      .orderBy(nightcafeModels.modelName)

    return { data }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('nightcafePresets:list', async () => {
  try {
    const data = await db
      .select({
        presetName: nightcafePresets.presetName,
        category: nightcafePresets.category,
      })
      .from(nightcafePresets)
      .orderBy(nightcafePresets.presetName)

    return { data: data as NightcafePresetOption[] }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── IPC: Characters Assets ──────────────────────────────────────────────────

ipcMain.handle('characters:saveImage', async (_, input: { dataUrl: string; fileName?: string }) => {
  try {
    const fileUrl = await saveCharacterImageDataUrl(input.dataUrl, input.fileName)
    return { data: { fileUrl } }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('characters:deleteImage', async (_, input: { fileUrl: string }) => {
  try {
    await deleteCharacterImageFile(input.fileUrl)
    return { data: { ok: true } }
  } catch (error) {
    return { error: String(error) }
  }
})

ipcMain.handle('generator:magicRandom', async (_, input?: { theme?: string; presetName?: string }) => {
  try {
    const settings = await getOpenRouterSettings()
    if (!settings.apiKey) {
      return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
    }

    const theme = input?.theme?.trim()
    const presetName = input?.presetName?.trim()

    const promptParts = [
      'Create one random, vivid text-to-image prompt.',
      presetName ? `Use this NightCafe preset as style guidance: ${presetName}.` : '',
      theme ? `Theme to include: ${theme}.` : 'Pick any surprising subject.',
      'Return only the final prompt text.',
    ].filter(Boolean)

    const userPrompt = promptParts.join(' ')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
        ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
        ...(settings.appName ? { 'X-Title': settings.appName } : {}),
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 1.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You generate exactly one high-quality text-to-image prompt. Return only the final prompt text with no numbering, no quotes, and no explanation.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const prompt = payload.choices?.[0]?.message?.content?.trim()
    if (!prompt) {
      throw new Error('No prompt content returned from OpenRouter.')
    }

    return { data: { prompt } }
  } catch (error) {
    return { error: String(error) }
  }
})

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await runMigrations()
    console.log('Database ready.')
  } catch (err) {
    console.error('Failed to run migrations:', err)
    // Continue anyway — DB may already be migrated
  }

  try {
    await syncNightCafeModelsFromCsv()
  } catch (err) {
    console.error('Failed to sync NightCafe models:', err)
  }

  try {
    await syncNightCafePresetsFromCsv()
  } catch (err) {
    console.error('Failed to sync NightCafe presets:', err)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  await queryClient.end()
  if (process.platform !== 'darwin') app.quit()
})
