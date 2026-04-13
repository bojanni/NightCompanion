import { useState } from 'react'
import { Check, Loader2, Trash2, Zap } from 'lucide-react'

import type { LocalEndpoint } from '../screens/Settings/types'

interface LocalEndpointCardProps {
  type: string
  endpoint?: LocalEndpoint
  actionLoading: string | null
  onSave: (url: string, apiKey?: string) => Promise<void>
  onDelete: () => Promise<void>
}

const PROVIDER_META: Record<string, { title: string; description: string; placeholder: string }> = {
  ollama: {
    title: 'Ollama',
    description: 'Run AI models locally with Ollama. Self-hosted, privacy-first inference.',
    placeholder: 'http://localhost:11434/v1',
  },
  lmstudio: {
    title: 'LM Studio',
    description: 'Host and serve local large language models with LM Studio.',
    placeholder: 'http://localhost:1234/v1',
  },
}

export function LocalEndpointCard({ type, endpoint, actionLoading, onSave, onDelete }: LocalEndpointCardProps) {
  const [url, setUrl] = useState(endpoint?.baseUrl || '')
  const [apiKey, setApiKey] = useState(endpoint?.apiKey || '')

  const title = type === 'ollama' ? 'Ollama' : 'LM Studio'
  const isSaving = actionLoading === type
  const isDeleting = actionLoading === `${type}-delete`
  const meta = PROVIDER_META[type] ?? { title, description: '', placeholder: 'http://localhost/v1' }
  const isAnyRoleActive = !!(endpoint?.is_active_gen || endpoint?.is_active_improve || endpoint?.is_active_vision || endpoint?.is_active_general)

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6 w-full animate-in fade-in slide-in-from-left-4 duration-300">

      {/* Header — matches ProviderConfigForm */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            {meta.title} Configuration
            {isAnyRoleActive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Zap size={10} /> Active
              </span>
            )}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{meta.description}</p>
        </div>

      {type === 'lmstudio' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Key (optional)</label>
          <input
            type="text"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Optional"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
          />
        </div>
      )}
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Base URL</label>
        <input
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={meta.placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
        />
      </div>

      {/* Save / Remove — matches ProviderConfigForm */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(url, apiKey)}
          disabled={isSaving || !url}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save Configuration
        </button>

        {endpoint && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 rounded-xl text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
