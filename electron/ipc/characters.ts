import { app, ipcMain } from 'electron'
import path from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { fileURLToPath, pathToFileURL } from 'url'
import * as schema from '../../src/lib/schema'
import { characters } from '../../src/lib/schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

type CharacterImagePayload = {
  id: string
  url: string
  isMain: boolean
  createdAt: string
}

type CharacterDetailPayload = {
  id: string
  detail: string
  category: string
  worksWell: boolean
}

type CharacterPayload = {
  id: string
  name: string
  description: string
  images: CharacterImagePayload[]
  details: CharacterDetailPayload[]
  createdAt: string
  updatedAt: string
}

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

function asArray<T>(input: unknown, fallback: T[]) {
  return Array.isArray(input) ? (input as T[]) : fallback
}

function mapCharacterRowToPayload(row: {
  id: string
  name: string
  description: string
  imagesJson: CharacterImagePayload[]
  detailsJson: CharacterDetailPayload[]
  createdAt: Date
  updatedAt: Date
}): CharacterPayload {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    images: asArray<CharacterImagePayload>(row.imagesJson, []),
    details: asArray<CharacterDetailPayload>(row.detailsJson, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function registerCharactersIpc({ db }: { db: Database }) {
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

  ipcMain.handle('characters:list', async () => {
    try {
      const data = await db
        .select({
          id: characters.id,
          name: characters.name,
          description: characters.description,
          imagesJson: characters.imagesJson,
          detailsJson: characters.detailsJson,
          createdAt: characters.createdAt,
          updatedAt: characters.updatedAt,
        })
        .from(characters)
        .orderBy(desc(characters.createdAt))

      return { data: data.map(mapCharacterRowToPayload) }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('characters:create', async (_, input: Partial<CharacterPayload>) => {
    try {
      const now = new Date()
      const id = input.id?.trim() || randomUUID()
      const createdAt = input.createdAt ? new Date(input.createdAt) : now
      const updatedAt = input.updatedAt ? new Date(input.updatedAt) : now

      const [created] = await db
        .insert(characters)
        .values({
          id,
          name: input.name?.trim() || 'Untitled Character',
          description: input.description || '',
          imagesJson: asArray<CharacterImagePayload>(input.images, []),
          detailsJson: asArray<CharacterDetailPayload>(input.details, []),
          createdAt,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: characters.id,
          set: {
            name: input.name?.trim() || 'Untitled Character',
            description: input.description || '',
            imagesJson: asArray<CharacterImagePayload>(input.images, []),
            detailsJson: asArray<CharacterDetailPayload>(input.details, []),
            updatedAt,
          },
        })
        .returning({
          id: characters.id,
          name: characters.name,
          description: characters.description,
          imagesJson: characters.imagesJson,
          detailsJson: characters.detailsJson,
          createdAt: characters.createdAt,
          updatedAt: characters.updatedAt,
        })

      return { data: mapCharacterRowToPayload(created) }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('characters:update', async (_, id: string, input: Partial<CharacterPayload>) => {
    try {
      const now = new Date()

      const [updated] = await db
        .update(characters)
        .set({
          name: input.name?.trim() || 'Untitled Character',
          description: input.description || '',
          imagesJson: asArray<CharacterImagePayload>(input.images, []),
          detailsJson: asArray<CharacterDetailPayload>(input.details, []),
          updatedAt: input.updatedAt ? new Date(input.updatedAt) : now,
        })
        .where(eq(characters.id, id))
        .returning({
          id: characters.id,
          name: characters.name,
          description: characters.description,
          imagesJson: characters.imagesJson,
          detailsJson: characters.detailsJson,
          createdAt: characters.createdAt,
          updatedAt: characters.updatedAt,
        })

      return { data: updated ? mapCharacterRowToPayload(updated) : undefined }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('characters:delete', async (_, id: string) => {
    try {
      await db.delete(characters).where(eq(characters.id, id))
      return { data: { ok: true } }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
