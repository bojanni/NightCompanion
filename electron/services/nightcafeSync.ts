import { app } from 'electron'
import path from 'path'
import { readFile } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import { notInArray } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { nightcafeModels, nightcafePresets } from '../../src/lib/schema'
import { syncNightCafeHuggingFaceModelcards } from './huggingfaceSync'

type Database = ReturnType<typeof drizzle<typeof schema>>

const NIGHTCAFE_MODELS_FILE = 'nightcafe_models_compleet.csv'
const NIGHTCAFE_PRESETS_FILE = 'nightcafe_presets.csv'
const NIGHTCAFE_PRESET_PROMPTS_FILES = ['preset_prompts.csv', 'Preset_prompts.csv']

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
    // Additional dev paths
    path.join(process.cwd(), 'resources', 'presets', NIGHTCAFE_PRESETS_FILE),
  ]

  return [...new Set(candidates)]
}

function getNightCafePresetPromptsCandidates() {
  const candidates = NIGHTCAFE_PRESET_PROMPTS_FILES.flatMap((fileName) => ([
    path.join(app.getAppPath(), 'resources', 'presets', fileName),
    path.join(process.resourcesPath, 'presets', fileName),
    path.join(process.resourcesPath, 'resources', 'presets', fileName),
    // Additional dev paths
    path.join(process.cwd(), 'resources', 'presets', fileName),
  ]))

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
  console.log('[nightcafeSync] Looking for presets CSV in:', candidates)

  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, 'utf-8')
      console.log('[nightcafeSync] Found presets CSV at:', candidate)
      return content
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        console.log('[nightcafeSync] Presets CSV not found at:', candidate)
        continue
      }
      throw error
    }
  }

  throw new Error(`NightCafe presets file not found. Looked in: ${candidates.join(', ')}`)
}

async function readNightCafePresetPromptsCsv() {
  const candidates = getNightCafePresetPromptsCandidates()

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8')
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') continue
      throw error
    }
  }

  return ''
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

function supportsNegativePromptByNightCafeRule(modelName: string, description: string) {
  const haystack = `${modelName} ${description}`.toLowerCase()

  const isCoherentOrArtistic = haystack.includes('coherent') || haystack.includes('artistic')
  const isStableDiffusionFamily =
    haystack.includes('stable diffusion') ||
    haystack.includes('sdxl') ||
    /(^|[^a-z0-9])sd\s*(1\.4|1\.5|xl|\d)/i.test(haystack) ||
    haystack.includes('checkpoint')

  return isCoherentOrArtistic || isStableDiffusionFamily
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
    supportsNegativePrompt: boolean
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
      artScore: (record['Art (â˜…)'] || '').trim(),
      promptingScore: (record['Prompting (â˜…)'] || '').trim(),
      realismScore: (record['Realism (â˜…)'] || '').trim(),
      typographyScore: (record['Typography (â˜…)'] || '').trim(),
      costTier: (record['Kosten ($)'] || '').trim(),
      supportsNegativePrompt: supportsNegativePromptByNightCafeRule(
        modelName,
        (record.Beschrijving || '').trim()
      ),
      updatedAt: new Date(),
    })
  }

  return [...byKey.values()]
}

async function syncNightCafeModelsFromCsv(db: Database) {
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
          supportsNegativePrompt: row.supportsNegativePrompt,
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
function parseNightCafePresetPromptsCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) return new Map<string, string>()

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim())
  const rows = lines.slice(1)

  const findHeaderIndex = (aliases: string[]) => {
    const lowerAliases = aliases.map((alias) => alias.toLowerCase())
    return headers.findIndex((header) => lowerAliases.includes(header.toLowerCase()))
  }

  const presetNameIndex = findHeaderIndex(['Preset Name', 'Preset', 'preset_name', 'name'])
  const presetPromptIndex = findHeaderIndex(['Prompt', 'Preset Prompt', 'preset_prompt', 'prompt'])
  const byKey = new Map<string, string>()

  for (const row of rows) {
    const cells = parseCsvLine(row)
    if (cells.length === 0) continue

    const presetNameCell = presetNameIndex >= 0 ? (cells[presetNameIndex] || '') : (cells[0] || '')
    const presetPromptCell = presetPromptIndex >= 0 ? (cells[presetPromptIndex] || '') : (cells[1] || '')
    const presetName = presetNameCell.trim()
    const presetPrompt = presetPromptCell.trim()
    if (!presetName || !presetPrompt) continue

    byKey.set(presetName.toLowerCase(), presetPrompt)
  }

  return byKey
}

async function syncNightCafePresetsFromCsv(db: Database) {
  const [csv, presetPromptsCsv] = await Promise.all([
    readNightCafePresetsCsv(),
    readNightCafePresetPromptsCsv(),
  ])
  const presetPromptsByKey = parseNightCafePresetPromptsCsv(presetPromptsCsv)
  const rows = parseNightCafePresetsCsv(csv).map((row) => ({
    ...row,
    presetPrompt: presetPromptsByKey.get(row.presetKey) || '',
  }))

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
          presetPrompt: row.presetPrompt,
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

export async function syncNightCafeData({
  db,
  forceHuggingFace = false,
}: {
  db: Database
  forceHuggingFace?: boolean
}) {
  await syncNightCafeModelsFromCsv(db)
  await syncNightCafePresetsFromCsv(db)

  const stats = await syncNightCafeHuggingFaceModelcards({
    db,
    force: forceHuggingFace,
  })

  console.log(
    `NightCafe Hugging Face sync: processed ${stats.processed}/${stats.total}, matched ${stats.matched}, unmatched ${stats.unmatched}, failed ${stats.failed}, skipped fresh ${stats.skippedFresh}`
  )
}


