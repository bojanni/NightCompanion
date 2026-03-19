import type { KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, ChevronDown, Code2, Eye, FileText, Globe, Mic, Video } from 'lucide-react'

import type { ModelOption } from '../screens/Settings/types'

interface ProviderInfo {
  id: string
  name: string
  type: 'cloud' | 'local'
}

interface ModelSelectorProps {
  value: string
  onChange: (id: string) => void
  models: ModelOption[]
  providers?: ProviderInfo[]
  placeholder?: string
  className?: string
  sortMode?: 'cheapest' | 'alphabetical'
}

function formatPerMillion(priceText: string | null | undefined): string | null {
  if (!priceText) return null

  const parsed = Number(priceText)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 0) return '$0.00'

  const perMillion = parsed * 1_000_000
  if (perMillion === 0) return '$0.00'
  if (perMillion > 0 && perMillion < 0.01) return '<$0.01'
  return `$${perMillion.toFixed(2)}`
}

function buildComputedPriceLabel(model: Pick<ModelOption, 'promptPrice' | 'completionPrice'>): string {
  const promptPerMillion = formatPerMillion(model.promptPrice)
  const completionPerMillion = formatPerMillion(model.completionPrice)

  if (promptPerMillion && completionPerMillion)
    return `${promptPerMillion}/${completionPerMillion}`

  return ''
}

function isFreeModel(model: Pick<ModelOption, 'promptPrice' | 'completionPrice'>): boolean {
  const promptPerMillion = formatPerMillion(model.promptPrice)
  const completionPerMillion = formatPerMillion(model.completionPrice)
  return Boolean(promptPerMillion && completionPerMillion && promptPerMillion === '$0.00' && completionPerMillion === '$0.00')
}

function getCombinedPrice(model: Pick<ModelOption, 'promptPrice' | 'completionPrice'>): number {
  const prompt = Number(model.promptPrice || '')
  const completion = Number(model.completionPrice || '')

  if (!Number.isFinite(prompt) || !Number.isFinite(completion))
    return Number.POSITIVE_INFINITY

  return prompt + completion
}

function getProviderDisplayName(provider: string | undefined): string {
  if (!provider) return ''
  const map: Record<string, string> = {
    openrouter: 'OpenRouter',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
  }
  return map[provider.toLowerCase()] ?? (provider.charAt(0).toUpperCase() + provider.slice(1))
}

type CapabilityKey = 'text' | 'vision' | 'reasoning' | 'web_search' | 'code' | 'audio' | 'video'

function normalizeCapability(value: string): CapabilityKey | null {
  const key = value.trim().toLowerCase()
  if (key === 'text') return 'text'
  if (key === 'vision') return 'vision'
  if (key === 'reasoning') return 'reasoning'
  if (key === 'web_search') return 'web_search'
  if (key === 'code') return 'code'
  if (key === 'audio') return 'audio'
  if (key === 'video') return 'video'
  return null
}

function getCapabilityChips(capabilities: string[]): Array<{
  key: CapabilityKey
  label: string
  icon: React.ReactNode
  className: string
}> {
  const normalized = new Set<CapabilityKey>()
  for (const item of capabilities) {
    const key = normalizeCapability(item)
    if (key) normalized.add(key)
  }

  if (normalized.size === 0) normalized.add('text')

  const ordered: CapabilityKey[] = ['text', 'vision', 'reasoning', 'web_search', 'code', 'audio', 'video']
  const chips: Array<{
    key: CapabilityKey
    label: string
    icon: React.ReactNode
    className: string
  }> = []

  for (const key of ordered) {
    if (!normalized.has(key)) continue
    if (key === 'text') {
      chips.push({
        key,
        label: 'Text',
        icon: <FileText className="w-3 h-3" />,
        className: 'bg-slate-500/15 text-slate-200 border-slate-500/25',
      })
      continue
    }
    if (key === 'vision') {
      chips.push({
        key,
        label: 'Vision',
        icon: <Eye className="w-3 h-3" />,
        className: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
      })
      continue
    }
    if (key === 'reasoning') {
      chips.push({
        key,
        label: 'Reasoning',
        icon: <Brain className="w-3 h-3" />,
        className: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25',
      })
      continue
    }
    if (key === 'web_search') {
      chips.push({
        key,
        label: 'Web search',
        icon: <Globe className="w-3 h-3" />,
        className: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
      })
      continue
    }
    if (key === 'code') {
      chips.push({
        key,
        label: 'Code',
        icon: <Code2 className="w-3 h-3" />,
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
      })
      continue
    }
    if (key === 'audio') {
      chips.push({
        key,
        label: 'Audio',
        icon: <Mic className="w-3 h-3" />,
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
      })
      continue
    }
    if (key === 'video') {
      chips.push({
        key,
        label: 'Video',
        icon: <Video className="w-3 h-3" />,
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
      })
    }
  }

  return chips
}

export default function ModelSelector({ value, onChange, models, placeholder, className, sortMode = 'alphabetical' }: ModelSelectorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const sortedModels = useMemo(() => {
    return [...models].sort((first, second) => {
      if (sortMode === 'cheapest') {
        const firstPrice = getCombinedPrice(first)
        const secondPrice = getCombinedPrice(second)
        if (firstPrice !== secondPrice)
          return firstPrice - secondPrice
      }

      const firstLabel = first.label || first.name || first.id
      const secondLabel = second.label || second.name || second.id
      return firstLabel.localeCompare(secondLabel)
    })
  }, [models, sortMode])

  const selectedModel = useMemo(
    () => sortedModels.find((model) => model.id === value),
    [sortedModels, value]
  )

  const selectedModelName = selectedModel?.displayName || selectedModel?.name || selectedModel?.label || selectedModel?.id || ''
  const selectedPriceLabel = selectedModel
    ? (isFreeModel(selectedModel) ? 'Free' : buildComputedPriceLabel(selectedModel))
    : ''
  const selectedProviderName = getProviderDisplayName(selectedModel?.provider)

  // Auto-focus the search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current)
        return

      if (containerRef.current.contains(event.target as Node))
        return

      setIsOpen(false)
      setHighlightedIndex(0)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const filteredModels = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle)
      return sortedModels

    return sortedModels.filter((model) => {
      const modelName = (model.displayName || model.name || model.label || model.id).toLowerCase()
      const description = (model.description || '').toLowerCase()
      return modelName.includes(needle) || description.includes(needle) || model.id.toLowerCase().includes(needle)
    })
  }, [sortedModels, query])

  useEffect(() => {
    if (highlightedIndex >= filteredModels.length) {
      queueMicrotask(() => {
        setHighlightedIndex(0)
      })
    }
  }, [filteredModels, highlightedIndex])

  function openDropdown() {
    setIsOpen(true)
    setQuery('')
    setHighlightedIndex(0)
  }

  function selectModel(model: ModelOption) {
    onChange(model.id)
    setIsOpen(false)
    setQuery('')
    setHighlightedIndex(0)
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((previous) => (previous + 1) % Math.max(filteredModels.length, 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((previous) => (previous - 1 + Math.max(filteredModels.length, 1)) % Math.max(filteredModels.length, 1))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const highlightedModel = filteredModels[highlightedIndex]
      if (highlightedModel)
        selectModel(highlightedModel)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(0)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className || ''}`.trim()}>
      <button
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        aria-haspopup="listbox"
        className="group flex items-center gap-2 w-full rounded-2xl border border-cyan-500/35 bg-slate-800/90 px-3 py-2.5 text-left hover:border-cyan-400/50 transition-colors"
      >
        <span className="w-16 shrink-0 text-[11px] leading-4 text-teal-300 font-semibold text-right">
          {selectedPriceLabel || 'Free'}
        </span>
        <span className="flex-1 min-w-0">
          {selectedModelName
            ? (
              <>
                <span className="block text-sm font-semibold text-white truncate">{selectedModelName}</span>
                {selectedProviderName && (
                  <span className="block text-xs text-slate-400 truncate">• {selectedProviderName.toLowerCase()}</span>
                )}
              </>
            )
            : (
              <span className="block text-sm text-slate-400">{placeholder || 'Select a model...'}</span>
            )}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-500 group-hover:text-slate-300 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[26rem] p-3">
          <div className="px-1 pb-2 shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Search models"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setHighlightedIndex(0)
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search models..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          <div role="listbox" aria-label="Model options" className="overflow-auto pr-1 space-y-2">
            {filteredModels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No models found</div>
            ) : (
              filteredModels.map((model, index) => {
                const modelName = model.displayName || model.name || model.label || model.id
                const providerName = getProviderDisplayName(model.provider)
                const description = model.description?.trim() || ''
                const capabilityTags = model.capabilities ?? []
                const capabilityChips = getCapabilityChips(capabilityTags)
                const promptPerMillion = formatPerMillion(model.promptPrice)
                const completionPerMillion = formatPerMillion(model.completionPrice)
                const isFree = isFreeModel(model)
                const isHighlighted = index === highlightedIndex
                const isSelected = model.id === value

                return (
                  <div
                    key={model.id}
                    role="option"
                    tabIndex={-1}
                    className={`rounded-2xl border p-3 transition-colors cursor-pointer ${
                      isHighlighted ? 'border-cyan-500/55 bg-slate-800/80' : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60'
                    } ${isSelected ? 'ring-1 ring-cyan-500/40' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      selectModel(model)
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 shrink-0 text-[11px] text-slate-400 leading-5 pt-1">
                        <div>In: <span className="text-cyan-300">{isFree ? 'Free' : (promptPerMillion || '—')}</span></div>
                        <div>Out: <span className="text-cyan-300">{isFree ? 'Free' : (completionPerMillion || '—')}</span></div>
                      </div>

                      <div className="min-w-0 flex-1 border-l border-slate-700 pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-100'} truncate`}>
                            {modelName}
                          </span>
                          {isFree && <span className="text-[11px] text-teal-300 shrink-0">Free</span>}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {providerName && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/25 leading-none">
                              ● {providerName.toLowerCase()}
                            </span>
                          )}
                          {capabilityChips.map((capability) => (
                            <span
                              key={`${model.id}-${capability.key}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border leading-none ${capability.className}`}
                            >
                              {capability.icon}
                              {capability.label}
                            </span>
                          ))}
                        </div>

                        {description && (
                          <>
                            <div
                              className="mt-1.5 text-xs text-slate-400 line-clamp-2"
                            >
                              {description}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
