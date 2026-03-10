import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Prompt } from '../types'
import PromptForm from '../components/PromptForm'
import { Check, Copy, Edit3, Filter, Plus, Search, SlidersHorizontal, Trash2, Zap } from 'lucide-react'
import { toast } from 'sonner'

const PAGE_SIZE = 20

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; prompt: Prompt }

type FilterType = 'all' | 'with-model' | 'with-tags'

export default function Library() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [showTagFilters, setShowTagFilters] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>({ mode: 'closed' })

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await window.electronAPI.prompts.list({
      search: search || undefined,
      model: modelFilter || undefined,
    })
    if (result.error) {
      setError(result.error)
    } else {
      setPrompts(result.data!)
    }
    setLoading(false)
  }, [search, modelFilter])

  useEffect(() => {
    const timeout = setTimeout(fetchPrompts, 200)
    return () => clearTimeout(timeout)
  }, [fetchPrompts])

  useEffect(() => {
    setCurrentPage(0)
  }, [search, modelFilter, filterType, selectedTag])

  const handleCreate = async (data: Parameters<typeof window.electronAPI.prompts.create>[0]) => {
    const result = await window.electronAPI.prompts.create(data)
    if (result.error) return result.error
    await fetchPrompts()
    setForm({ mode: 'closed' })
    return null
  }

  const handleUpdate = async (
    id: number,
    data: Parameters<typeof window.electronAPI.prompts.update>[1]
  ) => {
    const result = await window.electronAPI.prompts.update(id, data)
    if (result.error) return result.error
    await fetchPrompts()
    setForm({ mode: 'closed' })
    return null
  }

  const handleDelete = async (id: number) => {
    const result = await window.electronAPI.prompts.delete(id)
    if (result.error) {
      setError(result.error)
      return
    }
    setPrompts((prev) => prev.filter((p) => p.id !== id))
    if (form.mode === 'edit' && form.prompt.id === id) {
      setForm({ mode: 'closed' })
    }
    toast.success('Prompt verwijderd')
  }

  const handleCopy = async (prompt: Prompt) => {
    await navigator.clipboard.writeText(prompt.promptText)
    setCopiedId(prompt.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const allModels = [...new Set(prompts.map((p) => p.model).filter(Boolean))].sort()
  const allTags = [...new Set(prompts.flatMap((p) => p.tags || []))].sort()

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      if (filterType === 'with-model' && !prompt.model) return false
      if (filterType === 'with-tags' && (!prompt.tags || prompt.tags.length === 0)) return false
      if (selectedTag && !prompt.tags.includes(selectedTag)) return false
      return true
    })
  }, [prompts, filterType, selectedTag])

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PAGE_SIZE))
  const pagePrompts = useMemo(() => {
    const start = currentPage * PAGE_SIZE
    return filteredPrompts.slice(start, start + PAGE_SIZE)
  }, [filteredPrompts, currentPage])

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1))
  }, [totalPages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 pt-8 pb-5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prompt Library</h1>
          <p className="text-sm text-night-400 mt-0.5">
            {loading ? 'Loading…' : `${filteredPrompts.length} prompt${filteredPrompts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setForm({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20">
          <Plus size={16} />
          New Prompt
        </button>
      </div>

      <div
        className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-night-900/40 mx-8 p-4 rounded-2xl border border-night-700/50 mb-5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-night-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="w-full pl-10 pr-4 py-2.5 bg-night-900 border border-night-700 rounded-xl text-white placeholder-night-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
            />
          </div>
          <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="input sm:w-56">
            <option value="">Alle modellen</option>
            {allModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button
            onClick={() => setShowTagFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${showTagFilters || selectedTag ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-night-900 border-night-700 text-night-400 hover:text-white'}`}
          >
            <Filter size={14} />
            Tags
          </button>
        </div>

        <div className="flex gap-2">
          {([
            { id: 'all', label: 'All', icon: <SlidersHorizontal size={13} /> },
            { id: 'with-model', label: 'Model', icon: <Zap size={13} /> },
            { id: 'with-tags', label: 'Tags', icon: <Filter size={13} /> },
          ] as const).map((entry) => (
            <button
              key={entry.id}
              onClick={() => setFilterType(entry.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${filterType === entry.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-night-900 text-night-400 hover:text-white border border-night-700'}`}
            >
              {entry.icon}
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {showTagFilters && allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mx-8 mb-5 p-4 bg-night-900 border border-night-700 rounded-xl" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${!selectedTag ? 'bg-white/10 text-white' : 'text-night-400 hover:text-white'}`}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag((prev) => (prev === tag ? null : tag))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${selectedTag === tag ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-night-800 border-night-700 text-night-300 hover:text-white'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto px-8 pb-8"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-night-500 text-sm animate-pulse">Loading prompts…</div>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <EmptyState onNew={() => setForm({ mode: 'create' })} hasFilters={!!(search || modelFilter)} />
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {pagePrompts.map((prompt) => {
                const preview = prompt.promptText.length > 170
                  ? `${prompt.promptText.slice(0, 170)}...`
                  : prompt.promptText

                return (
                  <div key={prompt.id} className="bg-night-900 border border-night-700 rounded-2xl flex flex-col hover:border-night-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group w-full min-w-0 overflow-hidden">
                    <div className="p-5 pb-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">{prompt.title || 'Untitled'}</h3>
                          {prompt.model && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md flex-shrink-0">
                              Model
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(prompt)}
                            className="p-1.5 hover:bg-night-800 text-night-500 hover:text-emerald-400 rounded-lg transition-colors"
                            title="Copy"
                          >
                            {copiedId === prompt.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => setForm({ mode: 'edit', prompt })}
                            className="p-1.5 hover:bg-night-800 text-night-500 hover:text-blue-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Prompt verwijderen?')) return
                              await handleDelete(prompt.id)
                            }}
                            className="p-1.5 hover:bg-red-900/20 text-night-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-night-500 mb-2">
                        <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                        {prompt.updatedAt !== prompt.createdAt && (
                          <span>Updated</span>
                        )}
                      </div>

                      <p className="text-xs text-night-300 mb-3 leading-relaxed line-clamp-3 h-[3.75rem]">{preview}</p>

                      <div className="h-12 overflow-hidden mb-4">
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.length > 0 ? (
                            prompt.tags.slice(0, 8).map((tag) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border bg-night-800 border-night-700 text-night-300">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-night-600 italic py-0.5">No tags</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 mt-auto">
                      <div className="rounded-xl border border-night-700 bg-night-950/40 p-3">
                        <p className="text-[11px] text-night-400 line-clamp-2">
                          {prompt.negativePrompt || 'No negative prompt set.'}
                        </p>
                        {prompt.model && (
                          <p className="text-[10px] text-night-500 mt-2 truncate">{prompt.model}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 bg-night-900 border border-night-700 rounded-md text-sm text-night-400 disabled:opacity-50 hover:bg-night-800 hover:text-white transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-night-400">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage + 1 >= totalPages}
                  className="px-3 py-1 bg-night-900 border border-night-700 rounded-md text-sm text-night-400 disabled:opacity-50 hover:bg-night-800 hover:text-white transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {form.mode !== 'closed' && (
        <PromptForm
          initial={form.mode === 'edit' ? form.prompt : undefined}
          onSubmit={(data) =>
            form.mode === 'edit'
              ? handleUpdate(form.prompt.id, data)
              : handleCreate(data)
          }
          onClose={() => setForm({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew, hasFilters }: { onNew: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-night-800 border border-night-600/50 flex items-center justify-center mb-4 shadow-glow-sm">
        <span className="text-3xl text-night-500">✦</span>
      </div>
      <h3 className="text-lg font-medium text-night-200 mb-1">
        {hasFilters ? 'No prompts match your search' : 'No prompts yet'}
      </h3>
      <p className="text-sm text-night-500 mb-5 max-w-sm">
        {hasFilters
          ? 'Try adjusting your filters or search terms.'
          : 'Start building your creative library by saving your first prompt.'}
      </p>
      {!hasFilters && (
        <button onClick={onNew} className="btn-primary">
          <span className="text-lg leading-none">+</span>
          Add your first prompt
        </button>
      )}
    </div>
  )
}
