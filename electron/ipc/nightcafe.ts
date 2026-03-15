import { ipcMain } from 'electron'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { nightcafeModels, nightcafePresets } from '../../src/lib/schema'

type Database = ReturnType<typeof drizzle<typeof schema>>
type NightcafeModelFilters = {
  mediaType?: 'image' | 'video'
}

type NightcafePresetOption = {
  presetName: string
  category: string
}

export function registerNightCafeIpc({ db }: { db: Database }) {
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

  ipcMain.handle('nightcafeModels:getSupport', async (_, input?: { modelName?: string }) => {
    try {
      const modelName = input?.modelName?.trim() || ''
      if (!modelName) {
        return { data: { modelName: '', supportsNegativePrompt: false } }
      }

      const [model] = await db
        .select({
          modelName: nightcafeModels.modelName,
          supportsNegativePrompt: nightcafeModels.supportsNegativePrompt,
        })
        .from(nightcafeModels)
        .where(eq(nightcafeModels.modelName, modelName))
        .limit(1)

      if (!model) {
        return { data: { modelName, supportsNegativePrompt: false } }
      }

      return { data: model }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
