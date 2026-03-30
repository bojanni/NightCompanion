import { useEffect, useState } from 'react'
import { FolderOpen, RefreshCw, Settings as SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'

import { PageContainer } from '../components/PageContainer'

type HfSyncInfo = {
  lastSyncedAt: string | Date | null
  total: number
  counts: {
    matched: number
    unmatched: number
    error: number
    pending: number
  }
}

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [aiApiRequestLoggingEnabled, setAiApiRequestLoggingEnabled] = useState(false)
  const [nativeWindowFrameEnabled, setNativeWindowFrameEnabled] = useState(false)
  const [usageCurrency, setUsageCurrency] = useState<'usd' | 'eur'>('usd')
  const [eurRate, setEurRate] = useState('1')
  const [storeAiPromptResponseForUsage, setStoreAiPromptResponseForUsage] = useState(false)
  const [nightCompanionFolderPath, setNightCompanionFolderPath] = useState('')
  const [savingNightCompanionFolderPath, setSavingNightCompanionFolderPath] = useState(false)
  const [nightCompanionFolderMessage, setNightCompanionFolderMessage] = useState<string | null>(null)
  const [isRefreshingHf, setIsRefreshingHf] = useState(false)
  const [hfSyncMessage, setHfSyncMessage] = useState<string | null>(null)
  const [hfSyncInfo, setHfSyncInfo] = useState<HfSyncInfo | null>(null)

  async function handleUsageCurrencyChange(next: 'usd' | 'eur') {
    setUsageCurrency(next)
    await window.electronAPI.settings.saveAiConfigState({
      usageCurrency: next,
    })
  }

  async function handleEurRateChange(next: string) {
    setEurRate(next)

    const parsed = Number(next)
    if (!Number.isFinite(parsed) || parsed <= 0) return

    await window.electronAPI.settings.saveAiConfigState({
      eurRate: parsed,
    })
  }

  async function handleStorePromptResponseToggle() {
    const next = !storeAiPromptResponseForUsage
    setStoreAiPromptResponseForUsage(next)
    await window.electronAPI.settings.saveAiConfigState({
      storeAiPromptResponseForUsage: next,
    })
  }

  async function handleResetUsage() {
    const confirmed = window.confirm('Reset usage counters? This will reset session totals. You can also clear history (DB).')
    if (!confirmed) return

    const clearHistory = window.confirm('Also clear usage history?')
    const result = await window.electronAPI.usage.reset({ clearHistory })
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Usage counters reset.')
  }

  const loadHuggingFaceSyncInfo = async () => {
    const result = await window.electronAPI.nightcafeModels.getHuggingFaceSyncInfo()
    if (result.error || !result.data) {
      setHfSyncInfo(null)
      return
    }

    setHfSyncInfo(result.data)
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      const [settingsResult, folderPathResult] = await Promise.all([
        window.electronAPI.settings.getAiConfigState(),
        window.electronAPI.settings.getNightCompanionFolderPath(),
      ])
      await loadHuggingFaceSyncInfo()
      if (!active)
        return

      setAiApiRequestLoggingEnabled(Boolean(settingsResult.data?.aiApiRequestLoggingEnabled))
      setNativeWindowFrameEnabled(Boolean(settingsResult.data?.nativeWindowFrameEnabled))
      setUsageCurrency(settingsResult.data?.usageCurrency === 'eur' ? 'eur' : 'usd')
      setEurRate(typeof settingsResult.data?.eurRate === 'number' && Number.isFinite(settingsResult.data.eurRate)
        ? String(settingsResult.data.eurRate)
        : '1')
      setStoreAiPromptResponseForUsage(Boolean(settingsResult.data?.storeAiPromptResponseForUsage))
      setNightCompanionFolderPath(folderPathResult.data || '')
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function handleToggle() {
    const nextValue = !aiApiRequestLoggingEnabled
    setAiApiRequestLoggingEnabled(nextValue)

    await window.electronAPI.settings.saveAiConfigState({
      aiApiRequestLoggingEnabled: nextValue,
    })
  }

  async function handleNativeWindowFrameToggle() {
    const nextValue = !nativeWindowFrameEnabled
    setNativeWindowFrameEnabled(nextValue)

    await window.electronAPI.settings.saveAiConfigState({
      nativeWindowFrameEnabled: nextValue,
    })
  }

  async function handleRefreshNightCafeHuggingFace() {
    setIsRefreshingHf(true)
    setHfSyncMessage(null)

    const result = await window.electronAPI.nightcafeModels.refreshHuggingFace({ force: true })
    if (result.error || !result.data) {
      setHfSyncMessage(result.error || 'Hugging Face modelcard sync mislukt.')
      setIsRefreshingHf(false)
      return
    }

    setHfSyncMessage(
      `Sync klaar: verwerkt ${result.data.processed}/${result.data.total}, matched ${result.data.matched}, unmatched ${result.data.unmatched}, failed ${result.data.failed}.`
    )
    await loadHuggingFaceSyncInfo()
    setIsRefreshingHf(false)
  }

  async function handleBrowseNightCompanionFolder() {
    const result = await window.electronAPI.settings.selectNightCompanionFolderPath()
    if (result.error) {
      setNightCompanionFolderMessage(result.error)
      return
    }

    if (!result.data) return
    setNightCompanionFolderPath(result.data)
    setNightCompanionFolderMessage(null)
  }

  async function handleSaveNightCompanionFolder() {
    const nextPath = nightCompanionFolderPath.trim()
    if (!nextPath) {
      setNightCompanionFolderMessage('Folder path is required.')
      return
    }

    setSavingNightCompanionFolderPath(true)
    setNightCompanionFolderMessage(null)

    const result = await window.electronAPI.settings.saveNightCompanionFolderPath(nextPath)

    if (result.error || !result.data) {
      setNightCompanionFolderMessage(result.error || 'Opslaan van folderpad is mislukt.')
      setSavingNightCompanionFolderPath(false)
      return
    }

    setNightCompanionFolderPath(result.data)
    setNightCompanionFolderMessage('NightCompanion folder location opgeslagen.')
    setSavingNightCompanionFolderPath(false)
  }

  async function handleResetNightCompanionFolder() {
    const confirmed = window.confirm('Reset NightCompanion folder location to the default AppData Local path?')
    if (!confirmed) return

    setSavingNightCompanionFolderPath(true)
    setNightCompanionFolderMessage(null)

    const result = await window.electronAPI.settings.resetNightCompanionFolderPath()

    if (result.error || !result.data) {
      setNightCompanionFolderMessage(result.error || 'Reset naar standaardlocatie is mislukt.')
      setSavingNightCompanionFolderPath(false)
      return
    }

    setNightCompanionFolderPath(result.data)
    setNightCompanionFolderMessage('NightCompanion folder teruggezet naar standaardlocatie.')
    setSavingNightCompanionFolderPath(false)
  }

  const formattedLastSyncedAt = (() => {
    if (!hfSyncInfo?.lastSyncedAt) return 'Nog niet gesynchroniseerd'
    const parsed = new Date(hfSyncInfo.lastSyncedAt)
    if (Number.isNaN(parsed.getTime())) return 'Onbekend'
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()}`
  })()

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <PageContainer className="space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <SettingsIcon className="w-6 h-6 text-white" />
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white">Usage</p>
              <p className="text-xs text-slate-500">Tokens and cost estimation display preferences</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Currency</p>
                <p className="text-xs text-slate-500">USD is native for OpenRouter pricing; EUR uses a manual exchange rate</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (!loading) void handleUsageCurrencyChange('usd')
                  }}
                  className={`btn-compact ${usageCurrency === 'usd' ? 'btn-compact-primary' : 'btn-compact-ghost'}`}
                >
                  USD
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (!loading) void handleUsageCurrencyChange('eur')
                  }}
                  className={`btn-compact ${usageCurrency === 'eur' ? 'btn-compact-primary' : 'btn-compact-ghost'}`}
                >
                  EUR
                </button>
              </div>
            </div>

            {usageCurrency === 'eur' && (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">EUR rate</p>
                  <p className="text-xs text-slate-500">1 USD = ? EUR</p>
                </div>
                <input
                  type="text"
                  value={eurRate}
                  onChange={(event) => {
                    void handleEurRateChange(event.target.value)
                  }}
                  className="w-28 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Store prompt/response for usage</p>
                <p className="text-xs text-slate-500">Opt-in: store text to explain which prompt an event belonged to</p>
              </div>
              <button
                type="button"
                aria-label="Toggle storing prompt/response"
                title="Toggle storing prompt/response"
                disabled={loading}
                onClick={() => {
                  if (!loading) void handleStorePromptResponseToggle()
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  storeAiPromptResponseForUsage ? 'bg-teal-500' : 'bg-slate-600'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    storeAiPromptResponseForUsage ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500">Application preferences and diagnostics</p>
        </div>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Diagnostics</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Native Windows title bar</p>
              <p className="text-xs text-slate-500">Gebruik de standaard Windows titelbalk in plaats van de custom frameless balk</p>
            </div>
            <button
              type="button"
              aria-label="Toggle native Windows title bar"
              title="Toggle native Windows title bar"
              disabled={loading}
              onClick={() => {
                if (!loading) void handleNativeWindowFrameToggle()
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                nativeWindowFrameEnabled ? 'bg-teal-500' : 'bg-slate-600'
              } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  nativeWindowFrameEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">AI API request logging</p>
              <p className="text-xs text-slate-500">Log AI request/response payloads to a local JSONL file for debugging</p>
            </div>
            <button
              type="button"
              aria-label="Toggle AI API request logging"
              title="Toggle AI API request logging"
              disabled={loading}
              onClick={() => {
                if (!loading) void handleToggle()
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                aiApiRequestLoggingEnabled ? 'bg-teal-500' : 'bg-slate-600'
              } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiApiRequestLoggingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">NightCompanion folder location</p>
              <p className="text-xs text-slate-500">Default: C:\Users\&lt;user&gt;\AppData\Local\NightCompanion</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={nightCompanionFolderPath}
                onChange={(event) => setNightCompanionFolderPath(event.target.value)}
                placeholder="Select folder path"
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="button"
                onClick={() => void handleBrowseNightCompanionFolder()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-500"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse
              </button>
              <button
                type="button"
                disabled={savingNightCompanionFolderPath || loading}
                onClick={() => void handleSaveNightCompanionFolder()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                type="button"
                disabled={savingNightCompanionFolderPath || loading}
                onClick={() => void handleResetNightCompanionFolder()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reset default
              </button>
            </div>
            {nightCompanionFolderMessage && (
              <p className="text-xs text-slate-400">{nightCompanionFolderMessage}</p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">NightCafe modelcards (Hugging Face)</p>
                <p className="text-xs text-slate-500">Refresh extra model metadata: summary, likes, downloads, and update date</p>
                <p className="mt-1 text-xs text-slate-400">Laatste sync: {formattedLastSyncedAt}</p>
                {hfSyncInfo && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Matched {hfSyncInfo.counts.matched} · Unmatched {hfSyncInfo.counts.unmatched} · Errors {hfSyncInfo.counts.error} · Pending {hfSyncInfo.counts.pending}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isRefreshingHf) void handleRefreshNightCafeHuggingFace()
                }}
                disabled={isRefreshingHf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHf ? 'animate-spin' : ''}`} />
                Refresh modelcards
              </button>
            </div>
            {hfSyncMessage && (
              <p className="text-xs text-slate-400">{hfSyncMessage}</p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800/50 space-y-3">
            <div>
              <p className="text-sm font-semibold text-white">Danger zone</p>
              <p className="text-xs text-slate-500">Reset counters and local state</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (!loading) void handleResetUsage()
              }}
              className="btn-danger"
            >
              Reset usage counters
            </button>
          </div>
        </section>
      </PageContainer>
    </div>
  )
}
