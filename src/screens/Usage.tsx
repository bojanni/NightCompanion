import { useEffect, useMemo, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { PageContainer } from '../components/PageContainer'
import { useLanguage } from '../contexts/LanguageContext'

type UsageTotals = {
  calls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
}

type UsageCategory = 'generation' | 'improvement' | 'vision' | 'research_reasoning'

type UsageBreakdownModelRow = UsageTotals & {
  providerId: string
  modelId: string
  displayName: string
}

type UsageBreakdown = {
  categories: Record<UsageCategory, UsageTotals>
  topModels: UsageBreakdownModelRow[]
}

type DailyRow = {
  day: string
  calls: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
}

function formatCost(value: number): string {
  if (!Number.isFinite(value)) return '0.0000'
  return value.toFixed(4)
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString()
}

export default function Usage() {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<DailyRow[]>([])
    const { t } = useLanguage()
  const [breakdown, setBreakdown] = useState<UsageBreakdown | null>(null)
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [eurRate, setEurRate] = useState<number>(1)

  const fetchAll = async (nextDays: number) => {
    setLoading(true)
    try {
      const [dailyResult, breakdownResult, settingsResult] = await Promise.all([
        window.electronAPI.usage.listDaily({ days: nextDays }),
        window.electronAPI.usage.getBreakdown({ days: nextDays, topModelsLimit: 8 }),
        window.electronAPI.settings.getAiConfigState(),
      ])

      if (dailyResult.error || !dailyResult.data) {
        throw new Error(dailyResult.error || 'Failed to load usage history.')
      }

      setRows(dailyResult.data as DailyRow[])

      if (!breakdownResult.error && breakdownResult.data) {
        setBreakdown(breakdownResult.data as UsageBreakdown)
      } else {
        setBreakdown(null)
      }

      const rawCurrency = settingsResult.data?.usageCurrency
      if (rawCurrency === 'usd' || rawCurrency === 'eur') setCurrency(rawCurrency)

      const rawRate = settingsResult.data?.eurRate
      if (typeof rawRate === 'number' && Number.isFinite(rawRate) && rawRate > 0) setEurRate(rawRate)
    } catch (error) {
      notifications.show({ message: String(error), color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAll(days)
  }, [days])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.calls += row.calls
        acc.promptTokens += row.promptTokens
        acc.completionTokens += row.completionTokens
        acc.totalTokens += row.totalTokens
        acc.costUsd += row.costUsd
        return acc
      },
      { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 }
    )
  }, [rows])

  const cost = currency === 'eur'
    ? { label: 'EUR', value: totals.costUsd * (eurRate || 1) }
    : { label: 'USD', value: totals.costUsd }

  const breakdownRows = useMemo(() => {
    if (!breakdown) return [] as Array<{ key: UsageCategory; label: string; totals: UsageTotals }>

    const labelByCategory: Record<UsageCategory, string> = {
      generation: 'Generation',
      improvement: 'Improvement',
      vision: 'Vision',
      research_reasoning: 'Research & Reasoning',
    }

    const categories = (Object.keys(breakdown.categories) as UsageCategory[])
      .map((key) => ({ key, label: labelByCategory[key], totals: breakdown.categories[key] }))
      .sort((a, b) => b.totals.calls - a.totals.calls)

    return categories
  }, [breakdown])

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <PageContainer className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('usage.title')}</h1>
            <p className="text-sm text-slate-500">{t('usage.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="input !py-1.5 !text-xs !w-auto"
              value={String(days)}
              aria-label="Usage date range"
              onChange={(event) => {
                const nextDays = Math.max(1, Math.min(365, Number(event.target.value) || 30))
                setDays(nextDays)
                void fetchAll(nextDays)
              }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                void fetchAll(days)
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Usage by Category</p>
              <p className="text-xs text-slate-500">Across the selected range</p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !breakdown ? (
            <div className="text-sm text-slate-500">No breakdown available yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {breakdownRows.map((item) => {
                const itemCost = currency === 'eur'
                  ? item.totals.costUsd * (eurRate || 1)
                  : item.totals.costUsd

                return (
                  <div key={item.key} className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.totals.calls} calls</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">{formatTokens(item.totals.totalTokens)} tokens</div>
                      <div className="text-[11px] text-slate-400">{formatCost(itemCost)} {currency === 'eur' ? 'EUR' : 'USD'}</div>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-600">In {formatTokens(item.totals.promptTokens)} · Out {formatTokens(item.totals.completionTokens)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Most Used Models</p>
              <p className="text-xs text-slate-500">Ranked by calls (then tokens)</p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !breakdown || breakdown.topModels.length === 0 ? (
            <div className="text-sm text-slate-500">No model usage data yet.</div>
          ) : (
            <div className="space-y-2">
              {breakdown.topModels.map((model) => {
                const modelCost = currency === 'eur'
                  ? model.costUsd * (eurRate || 1)
                  : model.costUsd

                return (
                  <div key={`${model.providerId}:${model.modelId}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{model.displayName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{model.providerId} · {model.modelId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">{model.calls} calls</div>
                      <div className="text-[11px] text-slate-500">{formatTokens(model.totalTokens)} tokens</div>
                      <div className="text-[11px] text-slate-600">{formatCost(modelCost)} {currency === 'eur' ? 'EUR' : 'USD'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Totals</p>
              <p className="text-xs text-slate-500">Across the selected range</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{formatCost(cost.value)} {cost.label}</p>
              <p className="text-xs text-slate-500">{formatTokens(totals.totalTokens)} tokens</p>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-4">
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-slate-500">No usage events yet.</div>
            ) : (
              <div className="space-y-2">
                {rows.map((row) => {
                  const dayLabel = new Date(row.day).toLocaleDateString()
                  const rowCost = currency === 'eur'
                    ? row.costUsd * (eurRate || 1)
                    : row.costUsd

                  return (
                    <div key={row.day} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{dayLabel}</div>
                        <div className="text-[11px] text-slate-500">In {formatTokens(row.promptTokens)} · Out {formatTokens(row.completionTokens)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{formatCost(rowCost)} {currency === 'eur' ? 'EUR' : 'USD'}</div>
                        <div className="text-[11px] text-slate-500">{formatTokens(row.totalTokens)} tokens</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </PageContainer>
    </div>
  )
}
