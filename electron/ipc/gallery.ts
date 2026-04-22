import { ipcMain } from 'electron'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, desc, ilike, gte, sql, and, or } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { collections, galleryItems } from '../../src/lib/schema'
import { randomUUID } from 'crypto'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { pathToFileURL } from 'url'
import { resolveNightCompanionSubdir } from '../services/storagePaths'

type Database = ReturnType<typeof drizzle<typeof schema>>

type GalleryFilters = {
  search?: string
  collectionId?: string | null
  minRating?: number
  page?: number
  promptOnly?: boolean
}

function getGalleryImageDir() {
  return resolveNightCompanionSubdir('gallery')
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

async function saveGalleryImageDataUrl(dataUrl: string, originalName?: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid image payload. Expected a base64 data URL.')
  }

  const mimeType = match[1]
  const base64Data = match[2]
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const extension = getImageExtension(mimeType)
  const safeBaseName = (originalName || 'gallery-image')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 50)
  const fileName = `${Date.now()}-${safeBaseName || randomUUID()}.${extension}`

  const imageDir = getGalleryImageDir()
  await mkdir(imageDir, { recursive: true })

  const filePath = path.join(imageDir, fileName)
  await writeFile(filePath, imageBuffer)

  return pathToFileURL(filePath).href
}

type GalleryItemUpdate = {
  title?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  thumbnailUrl?: string | null
  mediaType?: string | null
  promptUsed?: string | null
  promptId?: string | null
  model?: string | null
  aspectRatio?: string | null
  rating?: number | null
  notes?: string | null
  collectionId?: string | null
  storageMode?: string | null
  durationSeconds?: number | null
  metadata?: Record<string, unknown>
}

const PAGE_SIZE = 24

export function registerGalleryIpc({ db }: { db: Database }) {
  // ─── Gallery Items ──────────────────────────────────────────────────────────

  ipcMain.handle('gallery:saveImage', async (_event, input: { dataUrl: string; fileName?: string }) => {
    try {
      const dataUrl = String(input?.dataUrl || '').trim()
      if (!dataUrl) return { error: 'Missing image payload.' }

      const fileUrl = await saveGalleryImageDataUrl(dataUrl, input?.fileName)
      return { data: { fileUrl } }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:list', async (_event, filters?: GalleryFilters) => {
    try {
      const conditions = []

      if (filters?.search) {
        const pattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(galleryItems.title, pattern),
            ilike(galleryItems.promptUsed, pattern),
          )
        )
      }

      if (filters?.collectionId) {
        conditions.push(eq(galleryItems.collectionId, filters.collectionId))
      }

      if (filters?.minRating && filters.minRating > 0) {
        conditions.push(gte(galleryItems.rating, filters.minRating))
      }

      if (filters?.promptOnly) {
        conditions.push(sql`coalesce(${galleryItems.metadata}->>'source', '') = 'prompt-library'`)
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined
      const page = filters?.page ?? 0

      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(galleryItems)
          .where(where)
          .orderBy(desc(galleryItems.createdAt))
          .limit(PAGE_SIZE)
          .offset(page * PAGE_SIZE),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(galleryItems)
          .where(where),
      ])

      return { data: { items: rows, totalCount: countResult[0]?.count ?? 0 } }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:createItem', async (_event, input: GalleryItemUpdate) => {
    try {
      const [row] = await db
        .insert(galleryItems)
        .values({
          title: input.title,
          imageUrl: input.imageUrl,
          videoUrl: input.videoUrl,
          thumbnailUrl: input.thumbnailUrl,
          mediaType: input.mediaType ?? 'image',
          promptUsed: input.promptUsed,
          promptId: input.promptId,
          model: input.model,
          aspectRatio: input.aspectRatio,
          rating: input.rating ?? 0,
          notes: input.notes,
          collectionId: input.collectionId,
          storageMode: input.storageMode ?? 'url',
          durationSeconds: input.durationSeconds,
          metadata: input.metadata ?? {},
        })
        .returning()

      return { data: row }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:updateItem', async (_event, id: string, input: GalleryItemUpdate) => {
    try {
      const updates: Record<string, unknown> = { updatedAt: new Date() }

      if (input.title !== undefined) updates.title = input.title
      if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl
      if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl
      if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl
      if (input.mediaType !== undefined) updates.mediaType = input.mediaType
      if (input.promptUsed !== undefined) updates.promptUsed = input.promptUsed
      if (input.promptId !== undefined) updates.promptId = input.promptId
      if (input.model !== undefined) updates.model = input.model
      if (input.aspectRatio !== undefined) updates.aspectRatio = input.aspectRatio
      if (input.rating !== undefined) updates.rating = input.rating
      if (input.notes !== undefined) updates.notes = input.notes
      if (input.collectionId !== undefined) updates.collectionId = input.collectionId
      if (input.storageMode !== undefined) updates.storageMode = input.storageMode
      if (input.durationSeconds !== undefined) updates.durationSeconds = input.durationSeconds
      if (input.metadata !== undefined) updates.metadata = input.metadata

      const [row] = await db
        .update(galleryItems)
        .set(updates)
        .where(eq(galleryItems.id, id))
        .returning()

      return { data: row }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:deleteItem', async (_event, id: string) => {
    try {
      await db.delete(galleryItems).where(eq(galleryItems.id, id))
      return { data: { ok: true } }
    } catch (error) {
      return { error: String(error) }
    }
  })

  // ─── Collections ────────────────────────────────────────────────────────────

  ipcMain.handle('gallery:listCollections', async () => {
    try {
      const rows = await db
        .select()
        .from(collections)
        .orderBy(desc(collections.createdAt))
      return { data: rows }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:createCollection', async (_event, input: { name: string; description?: string; color?: string }) => {
    try {
      const [row] = await db
        .insert(collections)
        .values({
          name: input.name,
          description: input.description,
          color: input.color ?? '#6366f1',
        })
        .returning()

      return { data: row }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('gallery:deleteCollection', async (_event, id: string) => {
    try {
      await db.delete(collections).where(eq(collections.id, id))
      return { data: { ok: true } }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
