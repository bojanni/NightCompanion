import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import * as schema from '../../src/lib/schema'
import { galleryItems, prompts, promptVersions } from '../../src/lib/schema'
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
  stylePreset?: string
  createdAt?: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt?: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  durationSeconds?: number
  collectionId?: string | null
}

type PromptImageRow = {
  id: string
  url: string
  note: string
  model: string
  seed: string
  stylePreset?: string
  createdAt: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt?: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  durationSeconds?: number
  collectionId?: string | null
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

function getMediaExtension(mimeType: string) {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
  }

  return map[mimeType] || 'png'
}

function detectMediaTypeFromUrl(url: string): 'image' | 'video' {
  const lowerUrl = url.toLowerCase()
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.m4v') ||
    lowerUrl.endsWith('.avi')
  ) {
    return 'video'
  }

  return 'image'
}

async function savePromptMediaDataUrl(dataUrl: string, originalName?: string) {
  const match = dataUrl.match(/^data:((?:image|video)\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid media payload. Expected a base64 data URL.')
  }

  const mimeType = match[1]
  const base64Data = match[2]
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const extension = getMediaExtension(mimeType)
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
    return savePromptMediaDataUrl(data.imageDataUrl, data.imageFileName || undefined)
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
  stylePreset?: string
  createdAt?: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt?: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
  durationSeconds?: number
  collectionId?: string | null
}): PromptImageRow {
  const customPrompt = (input.customPrompt ?? '').trim()
  const normalizedPromptSource = customPrompt
    ? 'custom'
    : input.promptSource === 'improved'
      ? 'improved'
      : 'generated'

  return {
    id: input.id?.trim() || randomUUID(),
    url: input.url.trim(),
    note: (input.note ?? '').trim(),
    model: (input.model ?? '').trim(),
    seed: (input.seed ?? '').trim(),
    stylePreset: (input.stylePreset ?? '').trim(),
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
    promptSource: normalizedPromptSource,
    customPrompt,
    mediaType: input.mediaType === 'video' ? 'video' : 'image',
    thumbnailUrl: (input.thumbnailUrl ?? '').trim(),
    durationSeconds: typeof input.durationSeconds === 'number' ? input.durationSeconds : undefined,
    collectionId: input.collectionId ?? null,
  }
}

function normalizePromptForDuplicateCheck(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
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
        ? await savePromptMediaDataUrl(rawDataUrl, image.fileName ?? undefined)
        : rawUrl

      if (!url) continue

      const mediaType = image.mediaType === 'video' || image.mediaType === 'image'
        ? image.mediaType
        : detectMediaTypeFromUrl(url)

      next.push(
        normalisePromptImageRow({
          id: image.id,
          url,
          note: image.note,
          model: image.model,
          seed: image.seed,
          stylePreset: image.stylePreset,
          createdAt: image.createdAt,
          promptSource: image.promptSource,
          customPrompt: image.customPrompt,
          mediaType,
          thumbnailUrl: image.thumbnailUrl,
          durationSeconds: image.durationSeconds,
          collectionId: image.collectionId,
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
      mediaType: detectMediaTypeFromUrl(legacyUrl),
    }),
  ]
}

async function syncPromptMediaGallery(
  database: Database,
  prompt: { id: number; title: string; promptText: string; model: string; rating: number | null; notes: string | null },
  images: PromptImageRow[]
) {
  const promptIdString = String(prompt.id)

  const existingRows = await database
    .select()
    .from(galleryItems)
    .where(sql`coalesce(${galleryItems.metadata}->>'source', '') = 'prompt-library' and coalesce(${galleryItems.metadata}->>'connectedPromptId', '') = ${promptIdString}`)

  const existingByPromptMediaId = new Map<string, typeof existingRows[number]>()
  for (const row of existingRows) {
    const rowMediaId = typeof row.metadata?.promptMediaId === 'string' ? row.metadata.promptMediaId : ''
    if (rowMediaId) {
      existingByPromptMediaId.set(rowMediaId, row)
    }
  }

  const nextMediaIds = new Set(images.map((image) => image.id))
  const promptRating = typeof prompt.rating === 'number' && Number.isFinite(prompt.rating)
    ? Math.max(0, Math.min(5, Math.round(prompt.rating)))
    : 0

  for (const image of images) {
    const mediaType = image.mediaType === 'video' ? 'video' : 'image'
    const existing = existingByPromptMediaId.get(image.id)
    const payload = {
      title: prompt.title || null,
      imageUrl: mediaType === 'image' ? image.url : (image.thumbnailUrl || null),
      videoUrl: mediaType === 'video' ? image.url : null,
      thumbnailUrl: image.thumbnailUrl || null,
      mediaType,
      promptUsed: image.customPrompt || prompt.promptText || null,
      model: image.model || prompt.model || null,
      rating: promptRating,
      notes: image.note || prompt.notes || null,
      collectionId: image.collectionId ?? existing?.collectionId ?? null,
      durationSeconds: image.durationSeconds,
      metadata: {
        source: 'prompt-library',
        connectedPromptId: prompt.id,
        promptMediaId: image.id,
        promptSource: image.promptSource ?? 'generated',
        stylePreset: image.stylePreset ?? '',
        seed: image.seed ?? '',
        mediaCreatedAt: image.createdAt,
      },
      updatedAt: new Date(),
    }

    if (existing) {
      await database
        .update(galleryItems)
        .set(payload)
        .where(eq(galleryItems.id, existing.id))
      continue
    }

    await database
      .insert(galleryItems)
      .values(payload)
  }

  const toDeleteIds = existingRows
    .filter((row) => {
      const rowMediaId = typeof row.metadata?.promptMediaId === 'string' ? row.metadata.promptMediaId : ''
      return rowMediaId && !nextMediaIds.has(rowMediaId)
    })
    .map((row) => row.id)

  if (toDeleteIds.length > 0) {
    for (const galleryId of toDeleteIds) {
      await database.delete(galleryItems).where(eq(galleryItems.id, galleryId))
    }
  }
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
      const promptText = (data.promptText ?? '').trim()
      const normalizedPromptText = normalizePromptForDuplicateCheck(promptText)

      if (!normalizedPromptText) {
        return { error: 'Prompt text is required.' }
      }

      const existingPrompts = await db
        .select({ promptText: prompts.promptText })
        .from(prompts)

      const hasDuplicatePromptText = existingPrompts.some((prompt) => (
        normalizePromptForDuplicateCheck(prompt.promptText) === normalizedPromptText
      ))

      if (hasDuplicatePromptText) {
        return { error: 'Duplicate prompt: this prompt text already exists.' }
      }

      const images = await resolvePromptImages([], '', data)
      const imageUrl = images[0]?.url ?? ''
      const [created] = await db
        .insert(prompts)
        .values({
          title: data.title ?? '',
          imageUrl,
          imagesJson: images,
          promptText,
          originalPrompt: typeof data.originalPrompt === 'string' ? data.originalPrompt : null,
          negativePrompt: data.negativePrompt ?? '',
          stylePreset: typeof data.stylePreset === 'string' ? data.stylePreset : '',
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

      await syncPromptMediaGallery(db, {
        id: created.id,
        title: created.title,
        promptText: created.promptText,
        model: created.model,
        rating: created.rating,
        notes: created.notes,
      }, images)

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
          stylePreset: current.stylePreset ?? '',
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
            stylePreset: typeof data.stylePreset === 'string' ? data.stylePreset : current.stylePreset ?? '',
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

      await syncPromptMediaGallery(db, {
        id: updated.id,
        title: updated.title,
        promptText: updated.promptText,
        model: updated.model,
        rating: updated.rating,
        notes: updated.notes,
      }, images)

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
      await db
        .delete(galleryItems)
        .where(sql`coalesce(${galleryItems.metadata}->>'source', '') = 'prompt-library' and coalesce(${galleryItems.metadata}->>'connectedPromptId', '') = ${String(id)}`)

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
