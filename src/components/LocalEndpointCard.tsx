import { useState } from 'react'
import { Check, Loader2, Server, Trash2, Zap, Eye, BookOpen } from 'lucide-react'

import type { LocalEndpoint } from '../screens/Settings/types'
import type { AIRole } from '../lib/constants'

interface LocalEndpointCardProps {
  type: string
  endpoint?: LocalEndpoint
  actionLoading: string | null
  onSave: (url: string, modelGen: string, modelImprove: string, modelVision: string, modelGeneral: string) => Promise<void>
  onDelete: () => Promise<void>
  onSetActive: (role: AIRole) => Promise<void>
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

export function LocalEndpointCard({ type, endpoint, actionLoading, onSave, onDelete, onSetActive }: LocalEndpointCardProps) {
  const [url, setUrl] = useState(endpoint?.baseUrl || '')
  const [modelGen, setModelGen] = useState(endpoint?.model_gen || endpoint?.model_name || '')
  const [modelImprove, setModelImprove] = useState(endpoint?.model_improve || endpoint?.model_name || '')
  const [modelVision, setModelVision] = useState(endpoint?.model_vision || endpoint?.model_name || '')
  const [modelGeneral, setModelGeneral] = useState(endpoint?.model_general || endpoint?.model_name || '')

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

      {/* Model Selection — matches ProviderConfigForm model section */}
      <div className="space-y-4 pt-4 border-t border-slate-800/50">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Server size={14} className="text-teal-500" />
          Model Selection
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Generation Model</label>
            <input
              type="text"
              value={modelGen}
              onChange={(event) => setModelGen(event.target.value)}
              placeholder="e.g. llama3.2"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Improvement Model</label>
            <input
              type="text"
              value={modelImprove}
              onChange={(event) => setModelImprove(event.target.value)}
              placeholder="e.g. llama3.2"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Vision Model</label>
            <input
              type="text"
              value={modelVision}
              onChange={(event) => setModelVision(event.target.value)}
              placeholder="e.g. llava"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Research & Reasoning Model</label>
            <input
              type="text"
              value={modelGeneral}
              onChange={(event) => setModelGeneral(event.target.value)}
              placeholder="e.g. llama3.2"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Save / Remove — matches ProviderConfigForm */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave(url, modelGen, modelImprove, modelVision, modelGeneral)}
          disabled={isSaving || !url || !modelGen}
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

      {/* Role Activation — matches ProviderConfigForm */}
      {endpoint && (
        <div className="pt-6 border-t border-slate-800/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <button
              onClick={() => onSetActive('generation')}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${endpoint.is_active_gen ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Zap size={16} />
              {endpoint.is_active_gen ? 'Active Gen' : 'Set Gen'}
            </button>
            <button
              onClick={() => onSetActive('improvement')}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${endpoint.is_active_improve ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Zap size={16} />
              {endpoint.is_active_improve ? 'Active Improve' : 'Set Improve'}
            </button>
            <button
              onClick={() => onSetActive('vision')}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${endpoint.is_active_vision ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <Eye size={16} />
              {endpoint.is_active_vision ? 'Active Vision' : 'Set Vision'}
            </button>

            <button
              onClick={() => onSetActive('general')}
              className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${endpoint.is_active_general ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
            >
              <BookOpen size={16} />
              {endpoint.is_active_general ? 'Active Research' : 'Set Research & Reasoning'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
