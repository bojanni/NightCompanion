import { Loader2, RefreshCw, Server, Zap, Eye, BookOpen } from 'lucide-react'
import ModelSelector from '../../../../components/ModelSelector'
import type { ActivationButtonsProps, ModelSelectorSectionProps } from '../types'

export function ModelSelectorSection({
  selectedModelGen,
  selectedModelImprove,
  selectedModelVision,
  selectedModelGeneral,
  onModelChange,
  models,
  providersInfo,
  modelSortMode,
  setModelSortMode,
  onRefresh,
  isRefreshing,
  lastUpdatedAt,
}: ModelSelectorSectionProps) {
  const generalModels = models.filter((m) =>
    m.capabilities?.includes('reasoning') ||
    m.capabilities?.includes('web_search')
  )

  const selectedGeneral = models.find((m) => m.id === selectedModelGeneral)

  const hasGeneralCandidates = generalModels.length > 0
  const generalOptions = hasGeneralCandidates
    ? (generalModels.some((m) => m.id === selectedModelGeneral)
        ? generalModels
        : (selectedGeneral
          ? [selectedGeneral, ...generalModels]
          : generalModels))
    : models

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800/50">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Server size={14} className="text-teal-500" />
          Model Selection
        </h4>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setModelSortMode('cheapest')}
              className={`px-2.5 py-1.5 text-xs transition-colors ${modelSortMode === 'cheapest' ? 'bg-teal-500 text-slate-900 font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Cheapest
            </button>
            <button
              type="button"
              onClick={() => setModelSortMode('alphabetical')}
              className={`px-2.5 py-1.5 text-xs transition-colors ${modelSortMode === 'alphabetical' ? 'bg-teal-500 text-slate-900 font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Alphabetical
            </button>
          </div>

          {lastUpdatedAt && (
            <span className="text-[11px] text-slate-500">
              Last updated {lastUpdatedAt}
            </span>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs text-slate-500 hover:text-teal-400 flex items-center gap-1.5 transition-colors"
            aria-label="Refresh Models"
          >
            {isRefreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh Models
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs text-slate-400 mb-2">Generation Model</label>
          <ModelSelector
            value={selectedModelGen}
            onChange={(id) => onModelChange(id, selectedModelImprove, selectedModelVision, selectedModelGeneral)}
            models={models}
            providers={providersInfo}
            placeholder="Select generation model..."
            sortMode={modelSortMode}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">Improvement Model</label>
          <ModelSelector
            value={selectedModelImprove}
            onChange={(id) => onModelChange(selectedModelGen, id, selectedModelVision, selectedModelGeneral)}
            models={models}
            providers={providersInfo}
            placeholder="Select improvement model..."
            sortMode={modelSortMode}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">Vision Model</label>
          <ModelSelector
            value={selectedModelVision}
            onChange={(id) => onModelChange(selectedModelGen, selectedModelImprove, id, selectedModelGeneral)}
            models={models.filter((m) =>
              m.capabilities?.includes('vision') ||
              m.id.toLowerCase().includes('vision') ||
              m.id.toLowerCase().includes('gpt-4') ||
              m.id.toLowerCase().includes('gemini') ||
              m.id.toLowerCase().includes('claude-3')
            )}
            providers={providersInfo}
            placeholder="Select vision model..."
            sortMode={modelSortMode}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-2">Research & Reasoning Model</label>
          <ModelSelector
            value={selectedModelGeneral}
            onChange={(id) => onModelChange(selectedModelGen, selectedModelImprove, selectedModelVision, id)}
            models={generalOptions}
            providers={providersInfo}
            placeholder="Select research model..."
            sortMode={modelSortMode}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

export function ActivationButtons({
  provider,
  activeMeta,
  actionLoading,
  onSetActive,
}: ActivationButtonsProps) {
  return (
    <div className="pt-6 mt-4 border-t border-slate-800/50 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <button
          onClick={() => onSetActive('generation')}
          disabled={actionLoading === `${provider.id}-generation`}
          className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_gen ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
        >
          <Zap size={16} className={actionLoading === `${provider.id}-generation` ? 'animate-spin' : ''} />
          {activeMeta.is_active_gen ? 'Active Gen' : 'Set Gen'}
        </button>

        <button
          onClick={() => onSetActive('improvement')}
          disabled={actionLoading === `${provider.id}-improvement`}
          className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_improve ? 'bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
        >
          <Zap size={16} className={actionLoading === `${provider.id}-improvement` ? 'animate-spin' : ''} />
          {activeMeta.is_active_improve ? 'Active Improve' : 'Set Improve'}
        </button>

        <button
          onClick={() => onSetActive('vision')}
          disabled={actionLoading === `${provider.id}-vision`}
          className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_vision ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
        >
          <Eye size={16} className={actionLoading === `${provider.id}-vision` ? 'animate-spin' : ''} />
          {activeMeta.is_active_vision ? 'Active Vision' : 'Set Vision'}
        </button>

        <button
          onClick={() => onSetActive('general')}
          disabled={actionLoading === `${provider.id}-general`}
          className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-medium text-xs transition-all border ${activeMeta.is_active_general ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'}`}
        >
          <BookOpen size={16} className={actionLoading === `${provider.id}-general` ? 'animate-spin' : ''} />
          {activeMeta.is_active_general ? 'Active Research & Reasoning' : 'Set Research & Reasoning'}
        </button>
      </div>
    </div>
  )
}
