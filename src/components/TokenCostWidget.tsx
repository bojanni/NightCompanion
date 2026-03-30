import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Screen } from '../types'

type Props = {
  onNavigate: (screen: Screen) => void
}

type TabKey = 'session' | 'last' | 'today'

type UsageSummaryState = {
  session: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number }
  today: { promptTokens: number; completionTokens: number; totalTokens: number; costUsd: number }
  lastAction: null | {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsd: number
    providerId: string
    modelId: string
    endpoint: string
    createdAt: string
  }
}

function buildEmptySummary(): UsageSummaryState {
  return {
    session: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
    today: { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 },
    lastAction: null,
  }
}

function formatCost(value: number): string {
  if (!Number.isFinite(value)) return '0.0000'
  return value.toFixed(4)
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString()
}

export default function TokenCostWidget({ onNavigate }: Props) {
  const [tab, setTab] = useState<TabKey>('session')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<UsageSummaryState>(() => buildEmptySummary())
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd')
  const [eurRate, setEurRate] = useState<number>(1)

  const fetchAll = async () => {
    try {
      const [summaryResult, settingsResult] = await Promise.all([
        window.electronAPI.usage.getSummary(),
        window.electronAPI.settings.getAiConfigState(),
      ])

      if (summaryResult.error || !summaryResult.data) {
        throw new Error(summaryResult.error || 'Failed to load usage summary.')
      }

      setSummary(summaryResult.data)

      const rawCurrency = settingsResult.data?.usageCurrency
      if (rawCurrency === 'usd' || rawCurrency === 'eur') setCurrency(rawCurrency)

      const rawRate = settingsResult.data?.eurRate
      if (typeof rawRate === 'number' && Number.isFinite(rawRate) && rawRate > 0) setEurRate(rawRate)

      setLoading(false)
    } catch (error) {
      setLoading(false)
      toast.error(String(error))
    }
  }

  useEffect(() => {
    void fetchAll()
    const handle = window.setInterval(() => {
      void fetchAll()
    }, 15_000)

    return () => {
      window.clearInterval(handle)
    }
  }, [])

  const active = useMemo(() => {
    if (tab === 'today') return summary.today
    if (tab === 'session') return summary.session

    if (!summary.lastAction) {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0 }
    }

    return {
      promptTokens: summary.lastAction.promptTokens,
      completionTokens: summary.lastAction.completionTokens,
      totalTokens: summary.lastAction.totalTokens,
      costUsd: summary.lastAction.costUsd,
    }
  }, [summary, tab])

  const { costLabel, costValue } = useMemo(() => {
    const costUsd = active.costUsd || 0
    if (currency === 'eur') {
      const eur = costUsd * (eurRate || 1)
      return { costLabel: 'EUR', costValue: eur }
    }

    return { costLabel: 'USD', costValue: costUsd }
  }, [active.costUsd, currency, eurRate])

  const lastMeta = summary.lastAction
    ? `${summary.lastAction.providerId} · ${summary.lastAction.modelId}`
    : '—'

  const tabButton = (key: TabKey, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={[
        'px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors',
        tab === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-white">Usage</div>
        <div className="flex items-center gap-1 bg-slate-950/50 border border-slate-800 rounded-xl p-0.5">
          {tabButton('session', 'Session')}
          {tabButton('last', 'Last')}
          {tabButton('today', 'Today')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-2.5 py-2">
          <div className="text-[10px] text-slate-500">Tokens</div>
          <div className="text-sm font-semibold text-white leading-none">
            {loading ? '—' : formatTokens(active.totalTokens)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            In {loading ? '—' : formatTokens(active.promptTokens)} · Out {loading ? '—' : formatTokens(active.completionTokens)}
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-xl px-2.5 py-2">
          <div className="text-[10px] text-slate-500">Cost ({costLabel})</div>
          <div className="text-sm font-semibold text-white leading-none">
            {loading ? '—' : formatCost(costValue)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {tab === 'last' ? lastMeta : currency === 'eur' ? `Rate ${formatCost(eurRate)}` : 'OpenRouter only'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          className="btn-compact-ghost"
          onClick={() => {
            onNavigate('usage')
          }}
        >
          View history
        </button>

        <button
          type="button"
          className="btn-compact-ghost"
          onClick={() => {
            void fetchAll()
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
