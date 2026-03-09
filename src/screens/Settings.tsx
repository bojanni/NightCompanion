import { useEffect, useState } from 'react'

type OpenRouterForm = {
  apiKey: string
  model: string
  siteUrl: string
  appName: string
}

const DEFAULT_FORM: OpenRouterForm = {
  apiKey: '',
  model: 'openai/gpt-4o-mini',
  siteUrl: '',
  appName: 'NightCompanion',
}

export default function Settings() {
  const [form, setForm] = useState<OpenRouterForm>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const result = await window.electronAPI.settings.getOpenRouter()
      if (!active) return

      if (result.error) {
        setStatus(`Error: ${result.error}`)
      } else if (result.data) {
        setForm(result.data)
      } else {
        setStatus('Error: Settings API returned no data.')
      }
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const update = (key: keyof OpenRouterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setStatus(null)
    setSaving(true)

    const result = await window.electronAPI.settings.saveOpenRouter(form)
    setSaving(false)

    if (result.error) {
      setStatus(`Error: ${result.error}`)
      return
    }

    if (result.data) {
      setForm(result.data)
      setStatus('Settings saved.')
      return
    }

    setStatus('Error: Settings API returned no data.')
  }

  if (loading) {
    return (
      <div className="no-drag-region h-full flex items-center justify-center">
        <p className="text-sm text-night-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-night-400 mt-1">Configure your OpenRouter credentials for AI-powered prompt generation.</p>

        <div className="card mt-6 p-5 space-y-4">
          <div>
            <label className="label">OpenRouter API Key</label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => update('apiKey', e.target.value)}
              className="input"
              placeholder="sk-or-v1-..."
            />
          </div>

          <div>
            <label className="label">Model</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => update('model', e.target.value)}
              className="input"
              placeholder="openai/gpt-4o-mini"
            />
          </div>

          <div>
            <label className="label">HTTP Referer (optional)</label>
            <input
              type="text"
              value={form.siteUrl}
              onChange={(e) => update('siteUrl', e.target.value)}
              className="input"
              placeholder="https://your-app-site.example"
            />
          </div>

          <div>
            <label className="label">App Name / Title Header (optional)</label>
            <input
              type="text"
              value={form.appName}
              onChange={(e) => update('appName', e.target.value)}
              className="input"
              placeholder="NightCompanion"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <span className="text-xs text-night-500">Stored locally on this machine.</span>
          </div>

          {status && (
            <p className={`text-xs ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
