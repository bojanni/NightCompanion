import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  FolderPlus,
  Play,
  ImageIcon,
  Pencil,
  Trash2,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { notifications } from '@mantine/notifications'
import useGalleryState from '../hooks/useGalleryState'
import MediaRenderer from '../components/MediaRenderer'
import StarRating from '../components/StarRating'
import GridDensitySelector from '../components/GridDensitySelector'
import GalleryLightbox from '../components/GalleryLightbox'
import type { GalleryItem, Prompt } from '../lib/schema'
import { invalidateDashboardCache } from '../lib/cacheEvents'
import { useLanguage } from '../contexts/LanguageContext'

type DisplaySettings = {
  title: boolean
  rating: boolean
  model: boolean
}

const DEFAULT_DISPLAY: DisplaySettings = { title: true, rating: true, model: true }

function loadDisplaySettings(): DisplaySettings {
  try {
    const stored = localStorage.getItem('galleryDisplaySettings')
    if (stored) return JSON.parse(stored) as DisplaySettings
  } catch { /* ignore */ }
  return DEFAULT_DISPLAY
}

interface GalleryProps {
  initialImageId?: string
}

export default function Gallery({ initialImageId }: GalleryProps) {
  const { t } = useLanguage()
  const state = useGalleryState()
  const [promptOptions, setPromptOptions] = useState<Prompt[]>([])
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(loadDisplaySettings)
  const [showDisplayOptions, setShowDisplayOptions] = useState(false)
  const [slideshowMode, setSlideshowMode] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const items = state.items
  const setLightboxImage = state.setLightboxImage

  useEffect(() => {
    let ignore = false

    async function loadPrompts() {
      const result = await window.electronAPI.prompts.list()
      if (ignore || result.error || !result.data) return
      setPromptOptions(result.data)
    }

    void loadPrompts()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('galleryDisplaySettings', JSON.stringify(displaySettings))
  }, [displaySettings])

  const totalPages = Math.ceil(state.totalCount / state.pageSize)

  // Open lightbox for initial image ID when provided
  useEffect(() => {
    if (!initialImageId || items.length === 0) return

    const targetItem = items.find((item) => item.id === initialImageId)
    if (targetItem) {
      const idx = items.findIndex((i) => i.id === targetItem.id)
      setLightboxIndex(idx >= 0 ? idx : 0)
      setLightboxImage(targetItem)
    }
  }, [initialImageId, items, setLightboxImage])

  const openLightbox = (item: GalleryItem) => {
    const idx = items.findIndex((i) => i.id === item.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxImage(item)
  }

  const startSlideshow = () => {
    if (items.length === 0) return
    setLightboxIndex(0)
    setSlideshowMode(true)
    setLightboxImage(items[0])
  }

  const closeLightbox = () => {
    setLightboxImage(null)
    setSlideshowMode(false)
  }

  const handleSaveItem = async () => {
    state.setSaving(true)
    try {
      let imageUrl = state.formImageUrl || null
      if (state.formImageDataUrl) {
        const saved = await window.electronAPI.gallery.saveImage({
          dataUrl: state.formImageDataUrl,
          fileName: state.formImageFileName || undefined,
        })
        if (saved.error || !saved.data?.fileUrl) {
          notifications.show({ message: saved.error || 'Failed to save image', color: 'red' })
          return
        }
        imageUrl = saved.data.fileUrl
      }

      if (!imageUrl) {
        notifications.show({ message: 'Upload an image first.', color: 'yellow' })
        return
      }

      const metadata: Record<string, unknown> = {}
      if (typeof state.formConnectedPromptId === 'number') {
        metadata.connectedPromptId = state.formConnectedPromptId
      }

      const payload = {
        title: state.formTitle || null,
        imageUrl,
        videoUrl: null,
        thumbnailUrl: null,
        mediaType: 'image',
        promptUsed: state.formPromptUsed || null,
        model: state.formModel || null,
        rating: state.formRating,
        notes: state.formNotes || null,
        collectionId: state.formCollectionId,
        metadata,
      }

      if (state.editingItem) {
        const result = await window.electronAPI.gallery.updateItem(state.editingItem.id, payload)
        if (result.error) {
          notifications.show({ message: result.error, color: 'red' })
          return
        }
        invalidateDashboardCache()
        notifications.show({ message: 'Item updated', color: 'green' })
      } else {
        const result = await window.electronAPI.gallery.createItem(payload)
        if (result.error) {
          notifications.show({ message: result.error, color: 'red' })
          return
        }
        invalidateDashboardCache()
        notifications.show({ message: 'Item added', color: 'green' })
      }

      state.setShowItemEditor(false)
      void state.loadData()
    } catch (err) {
      notifications.show({ message: String(err), color: 'red' })
    } finally {
      state.setSaving(false)
    }
  }

  const handleSelectUploadImage = async (file: File) => {
    const reader = new FileReader()
    const result = await new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(file)
    })

    state.setFormImageDataUrl(result)
    state.setFormImageFileName(file.name)
    state.setFormImageUrl('')
  }

  const handleSaveCollection = async () => {
    if (!state.collName.trim()) {
      notifications.show({ message: 'Collection name is required', color: 'yellow' })
      return
    }
    try {
      const result = await window.electronAPI.gallery.createCollection({
        name: state.collName.trim(),
        description: state.collDesc.trim() || undefined,
        color: state.collColor,
      })
      if (result.error) {
        notifications.show({ message: result.error, color: 'red' })
        return
      }
      notifications.show({ message: 'Collection created', color: 'green' })
      state.setShowCollectionEditor(false)
      state.setCollName('')
      state.setCollDesc('')
      state.setCollColor('#6366f1')
      invalidateDashboardCache()
      void state.loadData()
    } catch (err) {
      notifications.show({ message: String(err), color: 'red' })
    }
  }

  const handleConfirmDeleteItem = async () => {
    if (!state.deleteItemConfirmId) return
    await state.handleDeleteItem(state.deleteItemConfirmId)
    state.setDeleteItemConfirmId(null)
  }

  const handleConfirmDeleteCollection = async () => {
    if (!state.deleteCollectionConfirmId) return
    await state.handleDeleteCollection(state.deleteCollectionConfirmId)
    state.setDeleteCollectionConfirmId(null)
  }

  const collectionColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of state.collections) {
      map.set(c.id, c.color ?? '#6366f1')
    }
    return map
  }, [state.collections])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-white">{t('gallery.title')}</h1>
        <p className="text-night-400 text-sm mt-1">
          {state.totalCount} item{state.totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Action bar */}
      <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => state.setShowCollectionEditor(true)}
          className="btn btn-ghost text-sm flex items-center gap-1.5"
        >
          <FolderPlus className="w-4 h-4" />
          {t('gallery.newCollection')}
        </button>
        <button
          type="button"
          disabled={state.items.length === 0}
          className="btn btn-ghost text-sm flex items-center gap-1.5 disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          {t('gallery.export')}
        </button>
        <button
          type="button"
          onClick={startSlideshow}
          disabled={state.items.length === 0}
          className="btn btn-ghost text-sm flex items-center gap-1.5 disabled:opacity-40"
        >
          <Play className="w-4 h-4" />
          Slideshow
        </button>
        <button
          type="button"
          onClick={() => setShowDisplayOptions((v) => !v)}
          className="btn btn-ghost text-sm flex items-center gap-1.5"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Display
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => state.openItemEditor(null)}
          className="btn btn-primary text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Image
        </button>
      </div>

      {/* Display options panel */}
      {showDisplayOptions && (
        <div className="px-6 pb-2">
          <div className="card p-3 flex items-center gap-4">
            {(['title', 'rating', 'model'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-night-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={displaySettings[key]}
                  onChange={() =>
                    setDisplaySettings((prev) => ({ ...prev, [key]: !prev[key] }))
                  }
                  className="accent-glow-purple"
                />
                Show {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-6 pb-2 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-500" />
          <input
            type="text"
            placeholder="Search gallery..."
            value={state.search}
            onChange={(e) => {
              state.setSearch(e.target.value)
              state.setCurrentPage(0)
            }}
            className="input pl-9 w-full"
          />
        </div>
        <StarRating
          rating={state.filterRating}
          onChange={(r) => {
            state.setFilterRating(r)
            state.setCurrentPage(0)
          }}
          size={16}
        />
        <GridDensitySelector storageKey="galleryGridDensity" defaultValue={3} />
      </div>

      {/* Collection pills */}
      {state.collections.length > 0 && (
        <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              state.setFilterCollection(null)
              state.setCurrentPage(0)
            }}
            className={`tag ${!state.filterCollection ? 'bg-glow-purple text-white' : ''}`}
          >
            All
          </button>
          {state.collections.map((coll) => (
            <div key={coll.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  state.setFilterCollection(coll.id)
                  state.setCurrentPage(0)
                }}
                className={`tag flex items-center gap-1.5 ${state.filterCollection === coll.id ? 'bg-glow-purple text-white' : ''}`}
              >
                <CollectionDot color={coll.color ?? '#6366f1'} />
                {coll.name}
              </button>
              <button
                type="button"
                aria-label={`Delete collection ${coll.name}`}
                onClick={() => state.setDeleteCollectionConfirmId(coll.id)}
                className="text-night-600 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {state.loading && state.items.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-night-500 text-sm">Loading...</div>
          </div>
        ) : state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="card p-8 flex flex-col items-center gap-3">
              <ImageIcon className="w-10 h-10 text-night-600" />
              <p className="text-night-400 text-sm">No images found</p>
            </div>
          </div>
        ) : (
          <div className="dynamic-grid">
            <AnimatePresence mode="popLayout">
              {state.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                >
                  <div className="bg-night-900 border border-night-800 rounded-2xl overflow-hidden hover:border-night-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                    <div
                      className="aspect-square bg-night-800 relative overflow-hidden cursor-pointer"
                      onClick={() => openLightbox(item)}
                    >
                      <MediaRenderer
                        item={item}
                        autoPlay={item.mediaType === 'video'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            state.openItemEditor(item)
                          }}
                          className="btn-ghost p-1.5 rounded-lg bg-black/50 backdrop-blur-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            state.setDeleteItemConfirmId(item.id)
                          }}
                          className="btn-ghost p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Collection indicator */}
                      {item.collectionId && (
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CollectionDot color={collectionColorMap.get(item.collectionId) ?? '#6366f1'} />
                        </div>
                      )}
                    </div>

                    <div className="p-3 space-y-1">
                      {displaySettings.title && item.title && (
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      )}
                      {displaySettings.rating && (
                        <StarRating rating={item.rating ?? 0} readonly size={12} />
                      )}
                      {displaySettings.model && item.model && (
                        <span className="text-xs text-night-500">{item.model}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              type="button"
              disabled={state.currentPage === 0}
              onClick={() => state.setCurrentPage(state.currentPage - 1)}
              className="btn btn-ghost p-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-night-400 text-sm">
              Page {state.currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={state.currentPage >= totalPages - 1}
              onClick={() => state.setCurrentPage(state.currentPage + 1)}
              className="btn btn-ghost p-2 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Item Editor Modal */}
      {state.showItemEditor && (
        <ModalOverlay onClose={() => state.setShowItemEditor(false)}>
          <div className="card p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {state.editingItem ? 'Edit Item' : 'Add Image'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="label">Title</label>
                <input
                  className="input w-full"
                  aria-label="Gallery item title"
                  value={state.formTitle}
                  onChange={(e) => state.setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Image Upload</label>
                <div className="space-y-2">
                  {(state.formImageDataUrl || state.formImageUrl) && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                      <div className="aspect-[16/9] bg-slate-950/60">
                        <img
                          src={state.formImageDataUrl || state.formImageUrl}
                          alt="Gallery upload preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload gallery image"
                    className="input w-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      void handleSelectUploadImage(file)
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="label">Model</label>
                <input
                  className="input w-full"
                  aria-label="Model"
                  value={state.formModel}
                  onChange={(e) => state.setFormModel(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Connected Prompt</label>
                <select
                  className="input w-full"
                  value={state.formConnectedPromptId === null ? '' : String(state.formConnectedPromptId)}
                  aria-label="Connected prompt"
                  onChange={(e) => {
                    const raw = e.target.value
                    const nextId = raw ? Number(raw) : null
                    state.setFormConnectedPromptId(Number.isFinite(nextId as number) ? nextId : null)

                    const selected = raw
                      ? promptOptions.find((p) => p.id === Number(raw))
                      : undefined
                    if (selected?.promptText) {
                      state.setFormPromptUsed(selected.promptText)
                    }
                  }}
                >
                  <option value="">None</option>
                  {promptOptions.map((prompt) => (
                    <option key={prompt.id} value={String(prompt.id)}>
                      {prompt.title || `Prompt #${prompt.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Prompt Used</label>
                <textarea
                  className="textarea w-full"
                  aria-label="Prompt used"
                  rows={3}
                  value={state.formPromptUsed}
                  onChange={(e) => state.setFormPromptUsed(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="textarea w-full"
                  aria-label="Notes"
                  rows={2}
                  value={state.formNotes}
                  onChange={(e) => state.setFormNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="label">Rating</label>
                  <StarRating rating={state.formRating} onChange={state.setFormRating} size={20} />
                </div>
                {state.collections.length > 0 && (
                  <div className="flex-1">
                    <label className="label">Collection</label>
                    <select
                      className="input w-full"
                      aria-label="Collection"
                      value={state.formCollectionId ?? ''}
                      onChange={(e) => state.setFormCollectionId(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {state.collections.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => state.setShowItemEditor(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveItem()}
                disabled={state.saving}
                className="btn btn-primary"
              >
                {state.saving ? 'Saving...' : state.editingItem ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Collection Editor Modal */}
      {state.showCollectionEditor && (
        <ModalOverlay onClose={() => state.setShowCollectionEditor(false)}>
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-white">New Collection</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input w-full"
                  aria-label="Collection name"
                  title="Collection name"
                  placeholder="My collection"
                  value={state.collName}
                  onChange={(e) => state.setCollName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea w-full"
                  aria-label="Collection description"
                  title="Collection description"
                  placeholder="Optional"
                  rows={2}
                  value={state.collDesc}
                  onChange={(e) => state.setCollDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Colour</label>
                <div className="flex gap-2">
                  {['#6366f1', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#ef4444'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Colour ${c}`}
                      onClick={() => state.setCollColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${state.collColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-night-900 scale-110' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <CollectionDotLarge color={c} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => state.setShowCollectionEditor(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="button" onClick={() => void handleSaveCollection()} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Item Confirmation */}
      {state.deleteItemConfirmId && (
        <ModalOverlay onClose={() => state.setDeleteItemConfirmId(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-white">Delete Item</h2>
            <p className="text-night-300 text-sm">Are you sure you want to delete this item? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => state.setDeleteItemConfirmId(null)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={() => void handleConfirmDeleteItem()} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Collection Confirmation */}
      {state.deleteCollectionConfirmId && (
        <ModalOverlay onClose={() => state.setDeleteCollectionConfirmId(null)}>
          <div className="card p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold text-white">Delete Collection</h2>
            <p className="text-night-300 text-sm">Items in this collection will not be deleted, only unlinked.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => state.setDeleteCollectionConfirmId(null)} className="btn btn-ghost">Cancel</button>
              <button type="button" onClick={() => void handleConfirmDeleteCollection()} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Lightbox */}
      <GalleryLightbox
        key={`${initialImageId || 'none'}:${state.lightboxImage?.id || 'closed'}`}
        images={state.items}
        promptOptions={promptOptions}
        initialIndex={lightboxIndex}
        isOpen={!!state.lightboxImage}
        onClose={closeLightbox}
        onUpdateRating={state.handleUpdateRating}
        autoPlay={slideshowMode}
        displaySettings={{ ...displaySettings, prompt: true }}
      />
    </div>
  )
}

// ─── Helper components ──────────────────────────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
    >
      {children}
    </div>
  )
}

function CollectionDot({ color }: { color: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundColor = color
  }, [color])
  return <span ref={ref} className="inline-block w-2.5 h-2.5 rounded-full shrink-0" />
}

function CollectionDotLarge({ color }: { color: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.backgroundColor = color
  }, [color])
  return <span ref={ref} className="inline-block w-full h-full rounded-full" />
}
