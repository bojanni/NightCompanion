import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageContainer } from '../components/PageContainer'

type DailyRow = {
  day: string
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
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [eurRate, setEurRate] = useState<number>(1)

  const fetchAll = async (nextDays: number) => {
    setLoading(true)
    try {
      const [dailyResult, settingsResult] = await Promise.all([
        window.electronAPI.usage.listDaily({ days: nextDays }),
        window.electronAPI.settings.getAiConfigState(),
      ])

      if (dailyResult.error || !dailyResult.data) {
        throw new Error(dailyResult.error || 'Failed to load usage history.')
      }

      setRows(dailyResult.data as DailyRow[])

      const rawCurrency = settingsResult.data?.usageCurrency
      if (rawCurrency === 'usd' || rawCurrency === 'eur') setCurrency(rawCurrency)

      const rawRate = settingsResult.data?.eurRate
      if (typeof rawRate === 'number' && Number.isFinite(rawRate) && rawRate > 0) setEurRate(rawRate)
    } catch (error) {
      toast.error(String(error))
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
        acc.promptTokens += row.promptTokens
        acc.completionTokens += row.completionTokens
        acc.totalTokens += row.totalTokens
        acc.costUsd += row.costUsd
        return acc
      },
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 }
    )
  }, [rows])

  const cost = currency === 'eur'
    ? { label: 'EUR', value: totals.costUsd * (eurRate || 1) }
    : { label: 'USD', value: totals.costUsd }

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <PageContainer className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Usage</h1>
            <p className="text-sm text-slate-500">Tokens and estimated costs</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="input !py-1.5 !text-xs !w-auto"
              value={String(days)}
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
