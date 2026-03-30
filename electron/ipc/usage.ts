import { ipcMain } from 'electron'
import { drizzle } from 'drizzle-orm/postgres-js'
import { desc, gte, sql } from 'drizzle-orm'
import * as schema from '../../src/lib/schema'
import { aiUsageEvents } from '../../src/lib/schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

type UsageTotals = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
}

type UsageEventSummary = UsageTotals & {
  providerId: string
  modelId: string
  endpoint: string
  createdAt: string
}

type UsageSummary = {
  session: UsageTotals
  today: UsageTotals
  lastAction: UsageEventSummary | null
}

type UsageDailyTotals = UsageTotals & {
  day: string
}

const sessionTotals: UsageTotals = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  costUsd: 0,
}

export function bumpSessionTotals(delta: UsageTotals) {
  sessionTotals.promptTokens += delta.promptTokens
  sessionTotals.completionTokens += delta.completionTokens
  sessionTotals.totalTokens += delta.totalTokens
  sessionTotals.costUsd += delta.costUsd
}

export function resetSessionTotals() {
  sessionTotals.promptTokens = 0
  sessionTotals.completionTokens = 0
  sessionTotals.totalTokens = 0
  sessionTotals.costUsd = 0
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildTotals(input: { promptTokens?: unknown; completionTokens?: unknown; totalTokens?: unknown; costUsd?: unknown }): UsageTotals {
  const promptTokens = toNumber(input.promptTokens)
  const completionTokens = toNumber(input.completionTokens)
  const totalTokens = Number.isFinite(toNumber(input.totalTokens)) && toNumber(input.totalTokens) > 0
    ? toNumber(input.totalTokens)
    : promptTokens + completionTokens
  const costUsd = toNumber(input.costUsd)

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
  }
}

function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function registerUsageIpc({ db }: { db: Database }) {
  ipcMain.handle('usage:getSummary', async () => {
    try {
      const startOfToday = getStartOfToday()

      const todayRows = await db
        .select({
          promptTokens: sql<number>`coalesce(sum(${aiUsageEvents.promptTokens}), 0)`,
          completionTokens: sql<number>`coalesce(sum(${aiUsageEvents.completionTokens}), 0)`,
          totalTokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
          costUsd: sql<number>`coalesce(sum(${aiUsageEvents.costUsd}), 0)`,
        })
        .from(aiUsageEvents)
        .where(gte(aiUsageEvents.createdAt, startOfToday))

      const today = buildTotals(todayRows[0] || {})

      const lastRows = await db
        .select({
          providerId: aiUsageEvents.providerId,
          modelId: aiUsageEvents.modelId,
          endpoint: aiUsageEvents.endpoint,
          promptTokens: aiUsageEvents.promptTokens,
          completionTokens: aiUsageEvents.completionTokens,
          totalTokens: aiUsageEvents.totalTokens,
          costUsd: aiUsageEvents.costUsd,
          createdAt: aiUsageEvents.createdAt,
        })
        .from(aiUsageEvents)
        .orderBy(desc(aiUsageEvents.createdAt))
        .limit(1)

      const last = lastRows[0]

      const lastAction: UsageEventSummary | null = last
        ? {
          ...buildTotals(last),
          providerId: String(last.providerId || ''),
          modelId: String(last.modelId || ''),
          endpoint: String(last.endpoint || ''),
          createdAt: new Date(last.createdAt).toISOString(),
        }
        : null

      const summary: UsageSummary = {
        session: { ...sessionTotals },
        today,
        lastAction,
      }

      return { data: summary }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('usage:listDaily', async (_, input?: { days?: number }) => {
    try {
      const days = Number.isFinite(input?.days) ? Math.max(1, Math.min(365, Math.floor(input?.days as number))) : 30
      const start = new Date()
      start.setDate(start.getDate() - (days - 1))
      start.setHours(0, 0, 0, 0)

      const rows = await db
        .select({
          day: sql<string>`date_trunc('day', ${aiUsageEvents.createdAt})`,
          promptTokens: sql<number>`coalesce(sum(${aiUsageEvents.promptTokens}), 0)`,
          completionTokens: sql<number>`coalesce(sum(${aiUsageEvents.completionTokens}), 0)`,
          totalTokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
          costUsd: sql<number>`coalesce(sum(${aiUsageEvents.costUsd}), 0)`,
        })
        .from(aiUsageEvents)
        .where(gte(aiUsageEvents.createdAt, start))
        .groupBy(sql`date_trunc('day', ${aiUsageEvents.createdAt})`)
        .orderBy(sql`date_trunc('day', ${aiUsageEvents.createdAt}) desc`)

      const data: UsageDailyTotals[] = rows.map((row) => {
        const totals = buildTotals(row)
        const dayValue = new Date(String(row.day))
        return {
          day: dayValue.toISOString(),
          ...totals,
        }
      })

      return { data }
    } catch (error) {
      return { error: String(error) }
    }
  })

  ipcMain.handle('usage:reset', async (_, input?: { clearHistory?: boolean }) => {
    try {
      resetSessionTotals()

      if (input?.clearHistory) {
        await db.delete(aiUsageEvents)
      }

      return { data: undefined }
    } catch (error) {
      return { error: String(error) }
    }
  })
}
