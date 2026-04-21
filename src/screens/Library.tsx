import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Prompt } from '../types'
import PromptForm from '../components/PromptForm'
import Gallery from './Gallery'
import { BookTemplate, Check, Copy, Edit3, Eye, EyeOff, Filter, Heart, Plus, Search, SlidersHorizontal, Star, StarHalf, Trash2, X } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useLanguage } from '../contexts/LanguageContext'

import { invalidateDashboardCache } from '../lib/cacheEvents'
import LibrarySkeleton from '../components/skeletons/LibrarySkeleton'

const PAGE_SIZE = 20

type FormState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; prompt: Prompt }

type FilterType = 'all' | 'templates' | 'favorites'

type LightboxItem = {
  url: string
  title: string
  promptText: string
  rating: number
  model: string
  stylePreset: string
  isCustomPrompt: boolean
  isImprovedPrompt: boolean
}

type PromptImageView = {
  url: string
  model: string
  stylePreset: string
  customPrompt: string
  promptSource: 'generated' | 'improved' | 'custom'
}

type LightboxPosition = {
  promptIndex: number
  imageIndex: number
}

type LibraryView = 'prompts' | 'media'

type LibraryProps = {
  initialView?: LibraryView
  initialImageId?: string
}

function getPromptImages(prompt: Prompt): PromptImageView[] {
  const images: PromptImageView[] = []

  if (Array.isArray(prompt.imagesJson)) {
    for (const image of prompt.imagesJson) {
      const candidate = typeof image?.url === 'string' ? image.url.trim() : ''
      if (!candidate) continue

      const customPrompt = typeof image?.customPrompt === 'string' ? image.customPrompt.trim() : ''
      const promptSource = customPrompt
        ? 'custom'
        : image?.promptSource === 'improved'
          ? 'improved'
          : 'generated'

      images.push({
        url: candidate,
        model: typeof image?.model === 'string' ? image.model.trim() : '',
        stylePreset: typeof image?.stylePreset === 'string' ? image.stylePreset.trim() : (prompt.stylePreset ?? ''),
        customPrompt,
        promptSource,
      })
    }
  }

  const fallback = typeof prompt.imageUrl === 'string' ? prompt.imageUrl.trim() : ''
  if (fallback && !images.some((image) => image.url === fallback)) {
    images.push({
      url: fallback,
      model: prompt.model || prompt.suggestedModel || '',
      stylePreset: prompt.stylePreset || '',
      customPrompt: '',
      promptSource: 'generated',
    })
  }

  return images
}

function getStarFill(rating: number, starIndex: number) {
  if (rating >= starIndex) return 'full'
  if (rating >= starIndex - 0.5) return 'half'
  return 'empty'
}

function isSameRating(left: number, right: number) {
  return Math.abs(left - right) < 0.001
}

function hasImprovedPrompt(prompt: Prompt): boolean {
  const explicitImproved = (prompt as Prompt & { improvedPrompt?: string | null }).improvedPrompt
  if (typeof explicitImproved === 'string' && explicitImproved.trim()) return true

  const originalPrompt = typeof prompt.originalPrompt === 'string' ? prompt.originalPrompt.trim() : ''
  const currentPrompt = typeof prompt.promptText === 'string' ? prompt.promptText.trim() : ''
  return Boolean(originalPrompt) && originalPrompt !== currentPrompt
}

export default function Library({ initialView = 'prompts', initialImageId }: LibraryProps) {
  const { t } = useLanguage()
  const [view, setView] = useState<LibraryView>(initialView)
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
  const [lightboxPosition, setLightboxPosition] = useState<LightboxPosition | null>(null)
  const [lightboxVisible, setLightboxVisible] = useState(false)
  const [lightboxOverlayVisible, setLightboxOverlayVisible] = useState(true)
  const [lightboxPromptCopied, setLightboxPromptCopied] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; promptId: number | null }>({ isOpen: false, promptId: null })
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)

  const allModels = [...new Set(prompts.map((p) => p.model).filter(Boolean))].sort()
  const allTags = [...new Set(prompts.flatMap((p) => p.tags || []))].sort()

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      if (filterType === 'templates' && !prompt.isTemplate) return false
      if (filterType === 'favorites' && !prompt.isFavorite) return false
      if (selectedTag && !prompt.tags.includes(selectedTag)) return false
      return true
    })
  }, [prompts, filterType, selectedTag])

  const openLightbox = useCallback((promptId: number, imageIndex = 0) => {
    const promptIndex = filteredPrompts.findIndex((prompt) => prompt.id === promptId)
    if (promptIndex === -1) return

    const promptImages = getPromptImages(filteredPrompts[promptIndex])
    if (promptImages.length === 0) return

    const clampedIndex = Math.max(0, Math.min(imageIndex, promptImages.length - 1))
    setLightboxPosition({ promptIndex, imageIndex: clampedIndex })
    setLightboxOverlayVisible(true)
    setLightboxPromptCopied(false)

    const raf = window.requestAnimationFrame(() => {
      setLightboxVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [filteredPrompts])

  const lightboxImage = useMemo<LightboxItem | null>(() => {
    if (!lightboxPosition) return null

    const prompt = filteredPrompts[lightboxPosition.promptIndex]
    if (!prompt) return null

    const promptImages = getPromptImages(prompt)
    if (promptImages.length === 0) return null

    const currentImage = promptImages[lightboxPosition.imageIndex]
    if (!currentImage) return null

    return {
      url: currentImage.url,
      title: prompt.title || 'Prompt image',
      promptText: currentImage.customPrompt || prompt.promptText,
      rating: prompt.rating ?? 0,
      model: currentImage.model || prompt.model || prompt.suggestedModel || '',
      stylePreset: currentImage.stylePreset || (prompt.stylePreset ?? ''),
      isCustomPrompt: Boolean(currentImage.customPrompt) || currentImage.promptSource === 'custom',
      isImprovedPrompt: hasImprovedPrompt(prompt),
    }
  }, [filteredPrompts, lightboxPosition])

  const lightboxImageCount = useMemo(() => {
    if (!lightboxPosition) return 0
    const prompt = filteredPrompts[lightboxPosition.promptIndex]
    if (!prompt) return 0
    return getPromptImages(prompt).length
  }, [filteredPrompts, lightboxPosition])

  const goToNextLightboxImage = useCallback(() => {
    if (!lightboxPosition) return
    if (filteredPrompts.length === 0) return

    const currentPrompt = filteredPrompts[lightboxPosition.promptIndex]
    if (!currentPrompt) return

    const currentImages = getPromptImages(currentPrompt)
    if (currentImages.length === 0) return

    if (lightboxPosition.imageIndex < currentImages.length - 1) {
      setLightboxPosition({
        promptIndex: lightboxPosition.promptIndex,
        imageIndex: lightboxPosition.imageIndex + 1,
      })
      return
    }

    for (let offset = 1; offset <= filteredPrompts.length; offset += 1) {
      const nextPromptIndex = (lightboxPosition.promptIndex + offset) % filteredPrompts.length
      const nextPromptImages = getPromptImages(filteredPrompts[nextPromptIndex])
      if (nextPromptImages.length > 0) {
        setLightboxPosition({ promptIndex: nextPromptIndex, imageIndex: 0 })
        return
      }
    }
  }, [filteredPrompts, lightboxPosition])

  const goToPreviousLightboxImage = useCallback(() => {
    if (!lightboxPosition) return
    if (filteredPrompts.length === 0) return

    const currentPrompt = filteredPrompts[lightboxPosition.promptIndex]
    if (!currentPrompt) return

    const currentImages = getPromptImages(currentPrompt)
    if (currentImages.length === 0) return

    if (lightboxPosition.imageIndex > 0) {
      setLightboxPosition({
        promptIndex: lightboxPosition.promptIndex,
        imageIndex: lightboxPosition.imageIndex - 1,
      })
      return
    }

    for (let offset = 1; offset <= filteredPrompts.length; offset += 1) {
      const previousPromptIndex = (lightboxPosition.promptIndex - offset + filteredPrompts.length) % filteredPrompts.length
      const previousPromptImages = getPromptImages(filteredPrompts[previousPromptIndex])
      if (previousPromptImages.length > 0) {
        setLightboxPosition({
          promptIndex: previousPromptIndex,
          imageIndex: previousPromptImages.length - 1,
        })
        return
      }
    }
  }, [filteredPrompts, lightboxPosition])

  const closeLightbox = useCallback(() => {
    setLightboxVisible(false)
    setLightboxPromptCopied(false)
  }, [])

  const toggleLightboxOverlay = useCallback(() => {
    setLightboxOverlayVisible((prev) => !prev)
  }, [])

  const closePromptDetails = useCallback(() => {
    setSelectedPrompt(null)
  }, [])

  useEffect(() => {
    if (!lightboxImage || lightboxVisible) return

    const timeout = window.setTimeout(() => {
      setLightboxPosition(null)
    }, 210)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [lightboxImage, lightboxVisible])

  useEffect(() => {
    if (!lightboxImage) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox()
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextLightboxImage()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousLightboxImage()
      }

      if (event.key.toLowerCase() === 'i') {
        setLightboxOverlayVisible((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeLightbox, goToNextLightboxImage, goToPreviousLightboxImage, lightboxImage])

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

  const handleCreate = async (data: Parameters<typeof window.electronAPI.prompts.create>[0]) => {
    const result = await window.electronAPI.prompts.create(data)
    if (result.error) return result.error
    await fetchPrompts()
    invalidateDashboardCache()
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
    invalidateDashboardCache()
    setForm({ mode: 'closed' })
    return null
  }

  const handleDelete = async (id: number) => {
    const result = await window.electronAPI.prompts.delete(id)
    if (result.error) {
      setError(result.error)
      return
    }
    invalidateDashboardCache()
    setPrompts((prev) => prev.filter((p) => p.id !== id))
    if (form.mode === 'edit' && form.prompt.id === id) {
      setForm({ mode: 'closed' })
    }
    notifications.show({ message: t('library.promptDeleted'), color: 'green' })
  }

  const handleCopy = async (prompt: Prompt) => {
    await navigator.clipboard.writeText(prompt.promptText)
    setCopiedId(prompt.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const handleCopyLightboxPrompt = useCallback(async () => {
    if (!lightboxImage?.promptText?.trim()) {
      notifications.show({ message: t('library.noPromptTextToCopy'), color: 'yellow' })
      return
    }

    try {
      await navigator.clipboard.writeText(lightboxImage.promptText)
      setLightboxPromptCopied(true)
      window.setTimeout(() => setLightboxPromptCopied(false), 1500)
      notifications.show({ message: t('library.promptCopied'), color: 'green' })
    } catch {
      notifications.show({ message: t('library.promptCopyFailed'), color: 'red' })
    }
  }, [lightboxImage, t])

  const handleToggleFavorite = async (prompt: Prompt) => {
    const result = await window.electronAPI.prompts.update(prompt.id, {
      isFavorite: !prompt.isFavorite,
    })

    if (result.error) {
      setError(result.error)
      return
    }

    setPrompts((prev) =>
      prev.map((item) => (item.id === prompt.id ? { ...item, isFavorite: !item.isFavorite } : item))
    )
  }

  const handleSetRating = async (prompt: Prompt, rating: number) => {
    const currentRating = prompt.rating ?? 0
    const nextRating = isSameRating(currentRating, rating) ? null : rating
    const result = await window.electronAPI.prompts.update(prompt.id, { rating: nextRating })

    if (result.error) {
      setError(result.error)
      return
    }

    setPrompts((prev) => prev.map((item) => (item.id === prompt.id ? { ...item, rating: nextRating } : item)))
  }

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PAGE_SIZE))
  const safeCurrentPage = Math.min(currentPage, totalPages - 1)
  const pagePrompts = useMemo(() => {
    const start = safeCurrentPage * PAGE_SIZE
    return filteredPrompts.slice(start, start + PAGE_SIZE)
  }, [filteredPrompts, safeCurrentPage])

  useEffect(() => {
    setView(initialView)
  }, [initialView])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 pt-8 pb-5 no-drag-region">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">{t('library.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {view === 'prompts'
              ? `${filteredPrompts.length} prompt${filteredPrompts.length !== 1 ? 's' : ''}`
              : t('gallery.title')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'prompts' && (
            <button onClick={() => setForm({ mode: 'create' })} className="btn-primary"><Plus size={16} /> {t('library.newPrompt')}</button>
          )}
          <div className="inline-flex rounded-xl border border-slate-700/50 bg-slate-900/40 p-1">
            {([
              { id: 'prompts', label: t('library.viewPrompts') },
              { id: 'media', label: t('library.viewMedia') },
            ] as const).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setView(entry.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${view === entry.id ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'prompts' && (
        <>
          <div
            className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-slate-900/40 mx-8 p-4 rounded-2xl border border-slate-800/50 mb-5 no-drag-region"
          >
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(0)
                  }}
                  placeholder={t('library.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm"
                />
              </div>
              <select
                value={modelFilter}
                onChange={(e) => {
                  setModelFilter(e.target.value)
                  setCurrentPage(0)
                }}
                aria-label="Filter prompts by model"
                className="input sm:w-56"
              >
                <option value="">{t('library.modelFilterAll')}</option>
                {allModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={() => setShowTagFilters((prev) => !prev)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${showTagFilters || selectedTag ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
              >
                <Filter size={14} />
                Tags
              </button>
            </div>

            <div className="flex gap-2">
              {([
                { id: 'all', label: 'All', icon: <SlidersHorizontal size={13} /> },
                { id: 'templates', label: 'Templates', icon: <BookTemplate size={13} /> },
                { id: 'favorites', label: 'Favorites', icon: <Heart size={13} /> },
              ] as const).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setFilterType(entry.id)
                    setCurrentPage(0)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${filterType === entry.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                >
                  {entry.icon}
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {showTagFilters && allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mx-8 mb-5 p-4 bg-slate-900 border border-slate-800 rounded-xl no-drag-region">
              <button
                onClick={() => {
                  setSelectedTag(null)
                  setCurrentPage(0)
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${!selectedTag ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                All tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag((prev) => (prev === tag ? null : tag))
                    setCurrentPage(0)
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${selectedTag === tag ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div
        className="flex-1 overflow-y-auto px-8 pb-8 no-drag-region"
      >
        {view === 'media' ? (
          <Gallery embedded initialImageId={initialImageId} />
        ) : (
          <>
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <LibrarySkeleton />
        ) : filteredPrompts.length === 0 ? (
          <EmptyState onNew={() => setForm({ mode: 'create' })} hasFilters={!!(search || modelFilter)} />
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {pagePrompts.map((prompt) => {
                const preview = prompt.promptText.length > 170
                  ? `${prompt.promptText.slice(0, 170)}...`
                  : prompt.promptText
                const promptImages = getPromptImages(prompt)
                const coverImageUrl = promptImages[0]?.url || ''
                const coverImageModel = promptImages[0]?.model || prompt.model || prompt.suggestedModel || ''
                const coverImagePreset = promptImages[0]?.stylePreset || (prompt.stylePreset ?? '')

                return (
                  <div
                    key={prompt.id}
                    className={`bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group w-full min-w-0 overflow-hidden ${coverImageUrl ? 'flex flex-col md:flex-row' : 'flex flex-col'}`}
                    onClick={() => setSelectedPrompt(prompt)}
                  >
                    {coverImageUrl ? (
                      <div className="aspect-[16/9] bg-slate-950/60 overflow-hidden border-b border-slate-800/60 md:border-b-0 md:border-r md:w-56 md:aspect-auto md:min-h-full">
                        <img
                          src={coverImageUrl}
                          alt={prompt.title || 'Prompt image'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] cursor-zoom-in"
                          onClick={(event) => {
                            event.stopPropagation()
                            openLightbox(prompt.id, 0)
                          }}
                          onError={(event) => {
                            ;(event.currentTarget.parentElement as HTMLDivElement | null)?.classList.add('hidden')
                          }}
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-1 min-w-0 flex-col">
                      <div className="p-5 pb-0">
                        <button
                          type="button"
                          className="flex items-start gap-2 min-w-0 text-left"
                          onClick={() => setSelectedPrompt(prompt)}
                          aria-label={`Open details for ${prompt.title || 'prompt'}`}
                          title="Open details"
                        >
                          <h3 className="text-sm font-semibold text-white line-clamp-2">{prompt.title || 'Untitled'}</h3>
                          {prompt.isTemplate && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-teal-500/10 text-teal-400 rounded-md flex-shrink-0">
                              Template
                            </span>
                          )}
                          {hasImprovedPrompt(prompt) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-md border border-emerald-500/30 flex-shrink-0">
                              <Check size={11} />
                              Improved
                            </span>
                          )}
                        </button>

                        <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleCopy(prompt)
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors"
                            title="Copy"
                            aria-label="Copy prompt"
                          >
                            {copiedId === prompt.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleToggleFavorite(prompt)
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title={prompt.isFavorite ? 'Unfavorite' : 'Favorite'}
                            aria-label={prompt.isFavorite ? 'Unfavorite prompt' : 'Favorite prompt'}
                          >
                            <Heart size={14} className={prompt.isFavorite ? 'fill-rose-400 text-rose-400' : ''} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              setForm({ mode: 'edit', prompt })
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded-lg transition-colors"
                            title="Edit"
                            aria-label="Edit prompt"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              setDeleteDialog({ isOpen: true, promptId: prompt.id })
                            }}
                            className="p-1.5 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete"
                            aria-label="Delete prompt"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelectedPrompt(prompt)}
                          aria-label={`Open details for ${prompt.title || 'prompt'}`}
                          title="Open details"
                        >
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
                            <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                            {prompt.updatedAt !== prompt.createdAt && (
                              <span>Updated</span>
                            )}
                            {prompt.suggestedModel && (
                              <span className="truncate">Suggested: {prompt.suggestedModel}</span>
                            )}
                          </div>

                          {prompt.stylePreset && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-800 border-slate-800 text-slate-300">
                                Preset: {prompt.stylePreset}
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-3 h-[3.75rem]">{preview}</p>

                          <div className="h-12 overflow-hidden mb-4">
                            <div className="flex flex-wrap gap-1">
                              {prompt.tags.length > 0 ? (
                                prompt.tags.slice(0, 8).map((tag) => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-800 border-slate-800 text-slate-400">
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-600 italic py-0.5">No tags</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="px-5 pb-5 mt-auto">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                          <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <div key={value} className="relative w-4 h-4 text-slate-600 hover:text-slate-400">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleSetRating(prompt, value - 0.5)
                                  }}
                                  className="absolute inset-y-0 left-0 w-1/2 z-10"
                                  aria-label={`Set rating ${value - 0.5}`}
                                  title={`Set rating ${value - 0.5}`}
                                />
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleSetRating(prompt, value)
                                  }}
                                  className="absolute inset-y-0 right-0 w-1/2 z-10"
                                  aria-label={`Set rating ${value}`}
                                  title={`Set rating ${value}`}
                                />
                                <div className={`absolute inset-0 pointer-events-none ${((prompt.rating || 0) >= value - 0.5) ? 'text-glow-amber' : 'text-slate-600'}`}>
                                  {getStarFill(prompt.rating || 0, value) === 'full' && <Star size={14} fill="currentColor" />}
                                  {getStarFill(prompt.rating || 0, value) === 'half' && <StarHalf size={14} fill="currentColor" />}
                                  {getStarFill(prompt.rating || 0, value) === 'empty' && <Star size={14} />}
                                </div>
                              </div>
                            ))}
                            <span className="text-[10px] text-slate-500 ml-1">{prompt.rating ? prompt.rating.toFixed(1) : '0.0'}</span>
                          </div>
                          {coverImageModel && (
                            <p className="text-[10px] text-slate-500 mt-2 truncate">Used model: {coverImageModel}</p>
                          )}
                          {coverImagePreset && (
                            <p className="text-[10px] text-slate-500 mt-1 truncate">Preset: {coverImagePreset}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedPrompt && (
              <ModalOverlay onClose={closePromptDetails}>
                <div
                  className="card w-full max-w-[min(96vw,80rem)] max-h-[96vh] p-6 overflow-hidden flex flex-col"
                  onClick={(event) => event.stopPropagation()}
                  role="document"
                >
                  <div className="flex items-start justify-between gap-4 flex-shrink-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h2 className="text-lg font-semibold text-white truncate">{selectedPrompt.title || 'Untitled'}</h2>
                        <div className="flex items-center gap-1 text-glow-amber">
                          {[1, 2, 3, 4, 5].map((value) => {
                            const fill = getStarFill(selectedPrompt.rating || 0, value)

                            if (fill === 'full') {
                              return <Star key={value} size={14} fill="currentColor" />
                            }

                            if (fill === 'half') {
                              return <StarHalf key={value} size={14} fill="currentColor" />
                            }

                            return <Star key={value} size={14} className="text-white/35" />
                          })}
                          <span className="ml-1 text-xs font-medium text-white/70">
                            {selectedPrompt.rating ? selectedPrompt.rating.toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{new Date(selectedPrompt.createdAt).toLocaleString()}</span>
                        {selectedPrompt.updatedAt !== selectedPrompt.createdAt && <span>Updated</span>}
                        {(selectedPrompt.model || selectedPrompt.suggestedModel) && (
                          <span className="truncate">Model: {selectedPrompt.model || selectedPrompt.suggestedModel}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => void handleCopy(selectedPrompt)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors"
                        aria-label="Copy prompt"
                        title="Copy"
                      >
                        {copiedId === selectedPrompt.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleFavorite(selectedPrompt)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        aria-label={selectedPrompt.isFavorite ? 'Unfavorite prompt' : 'Favorite prompt'}
                        title={selectedPrompt.isFavorite ? 'Unfavorite' : 'Favorite'}
                      >
                        <Heart size={14} className={selectedPrompt.isFavorite ? 'fill-rose-400 text-rose-400' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ mode: 'edit', prompt: selectedPrompt })
                          closePromptDetails()
                        }}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-blue-400 rounded-lg transition-colors"
                        aria-label="Edit prompt"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteDialog({ isOpen: true, promptId: selectedPrompt.id })
                          closePromptDetails()
                        }}
                        className="p-1.5 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        aria-label="Delete prompt"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={closePromptDetails}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-white rounded-lg transition-colors"
                        aria-label="Close"
                        title="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex-1 overflow-y-auto pr-1">
                  {(() => {
                    const modalCover = Array.isArray(selectedPrompt.imagesJson) && selectedPrompt.imagesJson.length > 0
                      ? selectedPrompt.imagesJson[0].url
                      : selectedPrompt.imageUrl

                    return (
                      <div className={modalCover ? 'flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6' : ''}>
                        {modalCover ? (
                          <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 md:w-[45%] md:min-w-96 md:max-w-[48rem] md:flex-shrink-0">
                            <div className="aspect-[16/9] md:aspect-auto md:h-full">
                              <img
                                src={modalCover}
                                alt={selectedPrompt.title || 'Prompt image'}
                                className="h-full w-full object-cover cursor-zoom-in"
                                onClick={() =>
                                  openLightbox(selectedPrompt.id, 0)
                                }
                              />
                            </div>
                          </div>
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Prompt</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200">
                                {selectedPrompt.promptText}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Negative prompt</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-400">
                                {selectedPrompt.negativePrompt || 'No negative prompt set.'}
                              </p>
                            </div>
                          </div>

                          {selectedPrompt.stylePreset && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Style preset</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-400">
                                {selectedPrompt.stylePreset}
                              </p>
                            </div>
                          )}

                          {selectedPrompt.tags?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Tags</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedPrompt.tags.map((tag) => (
                                  <span key={tag} className="tag">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedPrompt.notes && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Notes</p>
                              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-400">
                                {selectedPrompt.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  </div>

                </div>
              </ModalOverlay>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={safeCurrentPage === 0}
                  className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-500 disabled:opacity-50 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-500 px-3">
                  {safeCurrentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safeCurrentPage + 1 >= totalPages}
                  className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-500 disabled:opacity-50 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>

      {view === 'prompts' && form.mode !== 'closed' && (
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

      {view === 'prompts' && lightboxImage && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className={`absolute inset-0 overflow-hidden transition-opacity will-change-[opacity] ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={lightboxImage.url}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-150 blur-3xl opacity-60 will-change-transform"
            />
            <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggleLightboxOverlay()
            }}
            className={`absolute top-4 left-4 z-[130] inline-flex items-center gap-2 rounded-full bg-black/50 border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-black/70 transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
            aria-label={lightboxOverlayVisible ? 'Hide overlay information' : 'Show overlay information'}
            title={lightboxOverlayVisible ? 'Hide overlay information (I)' : 'Show overlay information (I)'}
          >
            {lightboxOverlayVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            Info
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              closeLightbox()
            }}
            className={`absolute top-4 right-4 z-[130] rounded-full bg-black/50 border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-black/70 transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
          >
            Close
          </button>

          {lightboxImage.model && (
            <div
              className={`absolute top-16 right-4 z-[130] max-w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-black/45 px-4 py-2 text-right text-white shadow-2xl backdrop-blur-xl transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible && lightboxOverlayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">Used model</p>
              <p className="mt-1 text-sm font-medium text-white/95 break-words">{lightboxImage.model}</p>
            </div>
          )}

          {lightboxImage.isCustomPrompt && (
            <div
              className={`absolute top-16 left-4 z-[130] rounded-full border border-amber-300/60 bg-amber-500/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100 shadow-xl backdrop-blur-xl transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible && lightboxOverlayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
              onClick={(event) => event.stopPropagation()}
            >
              Custom
            </div>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goToPreviousLightboxImage()
            }}
            className={`absolute left-4 top-1/2 z-[130] -translate-y-1/2 rounded-full bg-black/50 border border-white/20 px-3 py-2 text-white hover:bg-black/70 transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}
            aria-label="Previous image"
            title="Previous image (Left arrow)"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              goToNextLightboxImage()
            }}
            className={`absolute right-4 top-1/2 z-[130] -translate-y-1/2 rounded-full bg-black/50 border border-white/20 px-3 py-2 text-white hover:bg-black/70 transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-out ${lightboxVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
            aria-label="Next image"
            title="Next image (Right arrow)"
          >
            ›
          </button>

          <img
            src={lightboxImage.url}
            alt={lightboxImage.title}
            onClick={(event) => event.stopPropagation()}
            className={`relative z-[90] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] object-contain rounded-2xl shadow-2xl transition-all will-change-transform ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-[cubic-bezier(0.22,1,0.36,1)] ${lightboxVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
          />

          <div
            className={`pointer-events-none absolute inset-x-4 bottom-4 z-[130] flex justify-center transition-all ${lightboxVisible ? 'duration-[320ms]' : 'duration-200'} ease-[cubic-bezier(0.22,1,0.36,1)] ${lightboxVisible && lightboxOverlayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <div
              className="pointer-events-auto w-full max-w-3xl rounded-[28px] border border-white/15 bg-black/45 px-5 py-4 text-white shadow-2xl backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{lightboxImage.title}</h3>
                  {lightboxPosition && lightboxImageCount > 1 && (
                    <span className="inline-flex min-w-[3.25rem] items-center justify-center whitespace-nowrap px-2.5 py-0.5 text-[11px] leading-none tabular-nums rounded-full border border-white/15 bg-black/35 text-white/80">
                      {lightboxPosition.imageIndex + 1} / {lightboxImageCount}
                    </span>
                  )}
                  {lightboxImage.isImprovedPrompt && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 text-emerald-100">
                      <Check size={12} />
                      Improved
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopyLightboxPrompt()}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-black/35 p-2 text-white/90 hover:bg-black/55 transition-colors"
                    aria-label={lightboxPromptCopied ? 'Prompt copied' : 'Copy prompt'}
                    title={lightboxPromptCopied ? 'Copied' : 'Copy prompt'}
                  >
                    {lightboxPromptCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <div className="flex items-center justify-center gap-1 text-glow-amber">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const fill = getStarFill(lightboxImage.rating, value)

                    if (fill === 'full') {
                      return <Star key={value} size={16} fill="currentColor" />
                    }

                    if (fill === 'half') {
                      return <StarHalf key={value} size={16} fill="currentColor" />
                    }

                    return <Star key={value} size={16} className="text-white/35" />
                  })}
                  <span className="ml-2 text-sm font-medium text-white/90">
                    {lightboxImage.rating > 0 ? lightboxImage.rating.toFixed(1) : '0.0'} / 5.0
                  </span>
                  </div>
                </div>
              </div>

              {lightboxImage.stylePreset && (
                <div className="mb-3 flex justify-center">
                  <span className="text-[11px] px-3 py-1 rounded-full border border-white/15 bg-black/35 text-white/85">
                    Preset: {lightboxImage.stylePreset}
                  </span>
                </div>
              )}

              <p className="text-center text-sm leading-relaxed text-white/92 whitespace-pre-wrap">
                {lightboxImage.promptText}
              </p>
            </div>
          </div>
        </div>
      )}
      {view === 'prompts' && (
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          title={t('library.deleteTitle')}
          message={t('library.deleteMessage')}
          confirmLabel={t('library.deleteConfirm')}
          cancelLabel={t('library.deleteCancel')}
          type="warning"
          onConfirm={async () => {
            if (deleteDialog.promptId) {
              await handleDelete(deleteDialog.promptId)
            }
            setDeleteDialog({ isOpen: false, promptId: null })
          }}
          onCancel={() => setDeleteDialog({ isOpen: false, promptId: null })}
        />
      )}
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
    >
      {children}
    </div>
  )
}

function EmptyState({ onNew, hasFilters }: { onNew: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center mb-4 shadow-glow-sm">
        <span className="text-3xl text-slate-500">✦</span>
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-1">
        {hasFilters ? 'No prompts match your search' : 'No prompts yet'}
      </h3>
      <p className="text-sm text-slate-500 mb-5 max-w-sm">
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
