import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import * as schema from '../../src/lib/schema'
import { prompts, promptVersions } from '../../src/lib/schema'
import type { NewPrompt } from '../../src/lib/schema'
import { getManagedNightCompanionRoots, isPathWithin, resolveNightCompanionSubdir } from '../services/storagePaths'

type Database = ReturnType<typeof drizzle<typeof schema>>
type PromptFilters = { search?: string; tags?: string[]; model?: string }
type PromptImageMutationInput = {
  id?: string
  url?: string
  dataUrl?: string | null
  fileName?: string | null
  note?: string
  model?: string
  seed?: string
  createdAt?: string
}

type PromptImageRow = {
  id: string
  url: string
  note: string
  model: string
  seed: string
  createdAt: string
}

type PromptMutationInput = Partial<NewPrompt> & {
  imageDataUrl?: string | null
  imageFileName?: string | null
  removeImage?: boolean
  images?: PromptImageMutationInput[] | null
}

function getPromptImageDir() {
  return resolveNightCompanionSubdir('images')
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

async function savePromptImageDataUrl(dataUrl: string, originalName?: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid image payload. Expected a base64 data URL.')
  }

  const mimeType = match[1]
  const base64Data = match[2]
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const extension = getImageExtension(mimeType)
  const safeBaseName = (originalName || 'prompt-image')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50)
  const fileName = `${Date.now()}-${safeBaseName || randomUUID()}.${extension}`

  const imageDir = getPromptImageDir()
  await mkdir(imageDir, { recursive: true })

  const filePath = path.join(imageDir, fileName)
  await writeFile(filePath, imageBuffer)

  return pathToFileURL(filePath).href
}

async function deletePromptImageFile(fileUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    return
  }

  if (parsed.protocol !== 'file:') return

  const managedRoots = getManagedNightCompanionRoots().map((root) => path.resolve(root))
  const targetPath = path.resolve(fileURLToPath(parsed))

  const isInManagedRoot = managedRoots.some((root) => isPathWithin(root, targetPath))

  if (!isInManagedRoot) {
    throw new Error('Refused to delete file outside prompt image directory.')
  }

  try {
    await unlink(targetPath)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') throw error
  }
}

async function resolvePromptImage(currentImageUrl: string, data: PromptMutationInput) {
  if (data.imageDataUrl?.trim()) {
    return savePromptImageDataUrl(data.imageDataUrl, data.imageFileName || undefined)
  }

  if (data.removeImage) return ''
  if (typeof data.imageUrl === 'string') return data.imageUrl.trim()
  return currentImageUrl
}

function normalisePromptImageRow(input: {
  id?: string
  url: string
  note?: string
  model?: string
  seed?: string
  createdAt?: string
}): PromptImageRow {
  return {
    id: input.id?.trim() || randomUUID(),
    url: input.url.trim(),
    note: (input.note ?? '').trim(),
    model: (input.model ?? '').trim(),
    seed: (input.seed ?? '').trim(),
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
  }
}

async function resolvePromptImages(
  currentImages: PromptImageRow[],
  currentLegacyImageUrl: string,
  data: PromptMutationInput
) {
  if (data.images === null) {
    return []
  }

  if (Array.isArray(data.images)) {
    const next: PromptImageRow[] = []

    for (const image of data.images) {
      const rawDataUrl = typeof image.dataUrl === 'string' ? image.dataUrl.trim() : ''
      const rawUrl = typeof image.url === 'string' ? image.url.trim() : ''

      const url = rawDataUrl
        ? await savePromptImageDataUrl(rawDataUrl, image.fileName ?? undefined)
        : rawUrl

      if (!url) continue

      next.push(
        normalisePromptImageRow({
          id: image.id,
          url,
          note: image.note,
          model: image.model,
          seed: image.seed,
          createdAt: image.createdAt,
        })
      )
    }

    return next
  }

  if (currentImages.length > 0) return currentImages

  const legacyUrl = await resolvePromptImage(currentLegacyImageUrl, data)
  if (!legacyUrl) return []

  return [
    normalisePromptImageRow({
      url: legacyUrl,
      model: typeof data.model === 'string' ? data.model : '',
      seed: typeof data.seed === 'string' ? data.seed : '',
    }),
  ]
}

export function registerPromptsIpc({ db }: { db: Database }) {
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

  ipcMain.handle('prompts:updateRating', async (_event, id: number, rating: number | null) => {
    try {
      const safeRating = typeof rating === 'number' && Number.isFinite(rating)
        ? Math.max(0, Math.min(5, rating))
        : null

      const [updated] = await db
        .update(prompts)
        .set({ rating: safeRating, updatedAt: new Date() })
        .where(eq(prompts.id, id))
        .returning()

      return { data: updated }
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

  ipcMain.handle('prompts:create', async (_, data: PromptMutationInput) => {
    try {
      const images = await resolvePromptImages([], '', data)
      const imageUrl = images[0]?.url ?? ''
      const [created] = await db
        .insert(prompts)
        .values({
          title: data.title ?? '',
          imageUrl,
          imagesJson: images,
          promptText: data.promptText ?? '',
          originalPrompt: typeof data.originalPrompt === 'string' ? data.originalPrompt : null,
          negativePrompt: data.negativePrompt ?? '',
          tags: data.tags ?? [],
          model: data.model ?? '',
          suggestedModel: data.suggestedModel ?? '',
          seed: typeof data.seed === 'string' ? data.seed : '',
          isTemplate: data.isTemplate ?? false,
          isFavorite: data.isFavorite ?? false,
          rating: data.rating ?? null,
          notes: data.notes ?? '',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      return { data: created }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('prompts:listVersions', async (_, promptId: number) => {
    try {
      const data = await db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.promptId, promptId))
        .orderBy(desc(promptVersions.versionNumber))

      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('prompts:update', async (_, id: number, data: PromptMutationInput) => {
    try {
      const [current] = await db.select().from(prompts).where(eq(prompts.id, id))
      if (!current) throw new Error(`Prompt with id ${id} not found.`)

      const currentImages = Array.isArray(current.imagesJson) ? current.imagesJson : []
      const images = await resolvePromptImages(currentImages, current.imageUrl ?? '', data)
      const imageUrl = images[0]?.url ?? ''

      const updated = await db.transaction(async (tx) => {
        const [versionCounter] = await tx
          .select({
            maxVersion: sql<number>`coalesce(max(${promptVersions.versionNumber}), 0)`,
          })
          .from(promptVersions)
          .where(eq(promptVersions.promptId, id))

        const nextVersionNumber = (versionCounter?.maxVersion ?? 0) + 1

        await tx.insert(promptVersions).values({
          promptId: current.id,
          versionNumber: nextVersionNumber,
          title: current.title,
          imageUrl: current.imageUrl ?? '',
          imagesJson: currentImages,
          promptText: current.promptText,
          originalPrompt: current.originalPrompt ?? null,
          negativePrompt: current.negativePrompt ?? '',
          tags: current.tags,
          model: current.model,
          suggestedModel: current.suggestedModel,
          seed: current.seed ?? '',
          isTemplate: current.isTemplate,
          isFavorite: current.isFavorite,
          rating: current.rating,
          notes: current.notes ?? '',
          createdAt: new Date(),
        })

        const [next] = await tx
          .update(prompts)
          .set({
            title: data.title,
            imageUrl,
            imagesJson: images,
            promptText: data.promptText,
            originalPrompt: typeof data.originalPrompt === 'string' ? data.originalPrompt : current.originalPrompt ?? null,
            negativePrompt: data.negativePrompt,
            tags: data.tags,
            model: data.model,
            suggestedModel: data.suggestedModel,
            seed: typeof data.seed === 'string' ? data.seed : current.seed ?? '',
            isTemplate: data.isTemplate,
            isFavorite: data.isFavorite,
            rating: data.rating,
            notes: data.notes,
            updatedAt: new Date(),
          })
          .where(eq(prompts.id, id))
          .returning()

        return next
      })

      return { data: updated }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('prompts:delete', async (_, id: number) => {
    try {
      const [current] = await db.select().from(prompts).where(eq(prompts.id, id))
      const versions = await db
        .select({ imageUrl: promptVersions.imageUrl, imagesJson: promptVersions.imagesJson })
        .from(promptVersions)
        .where(eq(promptVersions.promptId, id))

      await db.delete(prompts).where(eq(prompts.id, id))

      const localImageUrls = [...new Set([
        current?.imageUrl,
        ...(Array.isArray(current?.imagesJson) ? current.imagesJson.map((image) => image.url) : []),
        ...versions.map((version) => version.imageUrl),
        ...versions.flatMap((version) => (Array.isArray(version.imagesJson) ? version.imagesJson.map((image) => image.url) : [])),
      ].filter((value): value is string => Boolean(value) && value.startsWith('file:')))]

      if (localImageUrls.length > 0) {
        await Promise.all(localImageUrls.map(deletePromptImageFile))
      }

      return { data: undefined }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
