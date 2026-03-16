import { ipcMain } from 'electron'
import { drizzle } from 'drizzle-orm/postgres-js'
import { desc, eq, isNotNull } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { nightcafeModels, nightcafePresets } from '../../src/lib/schema'
import { syncNightCafeHuggingFaceModelcards } from '../services/huggingfaceSync'

type Database = ReturnType<typeof drizzle<typeof schema>>
type NightcafeModelFilters = {
  mediaType?: 'image' | 'video'
}

type NightcafePresetOption = {
  presetName: string
  category: string
  presetPrompt: string
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
          hfModelId: nightcafeModels.hfModelId,
          hfCardSummary: nightcafeModels.hfCardSummary,
          hfDownloads: nightcafeModels.hfDownloads,
          hfLikes: nightcafeModels.hfLikes,
          hfLastModified: nightcafeModels.hfLastModified,
          hfSyncStatus: nightcafeModels.hfSyncStatus,
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
          presetPrompt: nightcafePresets.presetPrompt,
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

  ipcMain.handle('nightcafeModels:refreshHuggingFace', async (_, input?: { force?: boolean }) => {
    try {
      const stats = await syncNightCafeHuggingFaceModelcards({
        db,
        force: Boolean(input?.force),
      })

      return { data: stats }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('nightcafeModels:getHuggingFaceSyncInfo', async () => {
    try {
      const latest = await db
        .select({ hfSyncedAt: nightcafeModels.hfSyncedAt })
        .from(nightcafeModels)
        .where(isNotNull(nightcafeModels.hfSyncedAt))
        .orderBy(desc(nightcafeModels.hfSyncedAt))
        .limit(1)

      const statuses = await db
        .select({ hfSyncStatus: nightcafeModels.hfSyncStatus })
        .from(nightcafeModels)

      const counts = statuses.reduce(
        (accumulator, item) => {
          const status = (item.hfSyncStatus || 'pending').toLowerCase()
          if (status === 'matched') accumulator.matched += 1
          else if (status === 'unmatched') accumulator.unmatched += 1
          else if (status === 'error') accumulator.error += 1
          else accumulator.pending += 1
          return accumulator
        },
        { matched: 0, unmatched: 0, error: 0, pending: 0 }
      )

      return {
        data: {
          lastSyncedAt: latest[0]?.hfSyncedAt ?? null,
          total: statuses.length,
          counts,
        },
      }
    } catch (error) {
      return { error: String(error) }
    }
  })
}


