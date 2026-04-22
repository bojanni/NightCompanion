import { useState, useEffect, useMemo, useRef } from 'react'
import type { Prompt, PromptVersion, StyleProfile, PromptMutationInput } from '../types'
import PromptPreview from './PromptPreview'
import { Check, Star, StarHalf } from 'lucide-react'

type FormData = PromptMutationInput

type NightcafePresetOption = {
  presetName: string
  category: string
  presetPrompt: string
}
type ImageDraft = {
  id: string
  url: string
  dataUrl: string | null
  fileName: string | null
  note: string
  model: string
  seed: string
  stylePreset: string
  createdAt: string
  promptSource?: 'generated' | 'improved' | 'custom'
  customPrompt: string
  mediaType: 'image' | 'video'
  thumbnailUrl: string
  durationSeconds: number | null
  collectionId: string | null
}

const MAX_TAG_COUNT = 15

type Props = {
  initial?: Prompt
  onSubmit: (data: FormData) => Promise<string | null>
  onClose: () => void
}

function getStarFill(rating: number, starIndex: number) {
  if (rating >= starIndex) return 'full'
  if (rating >= starIndex - 0.5) return 'half'
  return 'empty'
}

function isSameRating(left: number, right: number) {
  return Math.abs(left - right) < 0.001
}

function detectMediaTypeFromUrl(url: string): 'image' | 'video' {
  const lowerUrl = url.toLowerCase()
  if (
    lowerUrl.endsWith('.mp4') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.mov') ||
    lowerUrl.endsWith('.m4v') ||
    lowerUrl.endsWith('.avi')
  ) {
    return 'video'
  }

  return 'image'
}

export default function PromptForm({ initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [promptText, setPromptText] = useState(initial?.promptText ?? '')
  const [negativePrompt, setNegativePrompt] = useState(initial?.negativePrompt ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [seed, setSeed] = useState(initial?.seed ?? '')
  const [isTemplate, setIsTemplate] = useState(initial?.isTemplate ?? false)
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false)
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const improvedPromptValue = useMemo(() => {
    const candidate = (initial as unknown as { improvedPrompt?: string } | undefined)?.improvedPrompt
    return typeof candidate === 'string' ? candidate : ''
  }, [initial])

  const [images, setImages] = useState<ImageDraft[]>(() => {
    const stored = Array.isArray(initial?.imagesJson) ? initial.imagesJson : []
    if (stored.length > 0) {
      return stored.map((image) => ({
        id: image.id,
        url: image.url,
        dataUrl: null,
        fileName: null,
        note: image.note ?? '',
        model: image.model ?? '',
        seed: image.seed ?? '',
        stylePreset: typeof (image as unknown as { stylePreset?: unknown }).stylePreset === 'string'
          ? String((image as unknown as { stylePreset: string }).stylePreset)
          : (initial?.stylePreset ?? ''),
        createdAt: image.createdAt ?? new Date().toISOString(),
        promptSource: (() => {
          const saved = (image as unknown as { promptSource?: 'generated' | 'improved' | 'custom' | 'original' }).promptSource
          const customPrompt = typeof (image as unknown as { customPrompt?: unknown }).customPrompt === 'string'
            ? String((image as unknown as { customPrompt: string }).customPrompt).trim()
            : ''
          if (customPrompt) return 'custom'
          if (saved === 'original') return 'generated'
          if (saved === 'generated' || saved === 'improved' || saved === 'custom') return saved
          return 'generated'
        })(),
        customPrompt: typeof (image as unknown as { customPrompt?: unknown }).customPrompt === 'string'
          ? String((image as unknown as { customPrompt: string }).customPrompt)
          : '',
        mediaType: (() => {
          const candidate = (image as unknown as { mediaType?: unknown }).mediaType
          if (candidate === 'video' || candidate === 'image') return candidate
          return detectMediaTypeFromUrl(image.url)
        })(),
        thumbnailUrl: typeof (image as unknown as { thumbnailUrl?: unknown }).thumbnailUrl === 'string'
          ? String((image as unknown as { thumbnailUrl: string }).thumbnailUrl)
          : '',
        durationSeconds: typeof (image as unknown as { durationSeconds?: unknown }).durationSeconds === 'number'
          ? (image as unknown as { durationSeconds: number }).durationSeconds
          : null,
        collectionId: typeof (image as unknown as { collectionId?: unknown }).collectionId === 'string'
          ? String((image as unknown as { collectionId: string }).collectionId)
          : null,
      }))
    }
    if (initial?.imageUrl) {
      const now = new Date().toISOString()
      const id = typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

      return [{
        id,
        url: initial.imageUrl,
        dataUrl: null,
        fileName: null,
        note: '',
        model: initial.model ?? '',
        seed: initial.seed ?? '',
        stylePreset: initial.stylePreset ?? '',
        createdAt: now,
        promptSource: 'generated',
        customPrompt: '',
        mediaType: 'image',
        thumbnailUrl: '',
        durationSeconds: null,
        collectionId: null,
      }]
    }

    return []
  })
  const [readingImages, setReadingImages] = useState(false)
  const [suggestedModel, setSuggestedModel] = useState(initial?.suggestedModel ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>((initial?.tags ?? []).slice(0, MAX_TAG_COUNT))
  const [generatingTags, setGeneratingTags] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [presetOptions, setPresetOptions] = useState<NightcafePresetOption[]>([])
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<number | ''>('')

  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const imagesInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!initial

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadNightcafePresets() {
      const result = await window.electronAPI.nightcafePresets.list()
      if (ignore || result.error || !result.data) return

      const options = result.data
        .filter((option) => option.presetName)
        .sort((a, b) => a.presetName.localeCompare(b.presetName))

      setPresetOptions(options)
    }

    loadNightcafePresets()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadNightcafeModels() {
      const result = await window.electronAPI.nightcafeModels.list({ mediaType: 'image' })
      if (ignore || result.error || !result.data) return

      const options = result.data
        .map((item) => item.modelName)
        .filter((name, index, arr) => name && arr.indexOf(name) === index)

      setModelOptions(options)
    }

    loadNightcafeModels()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    if (!isEdit || !initial?.id) return

    async function loadVersions() {
      setLoadingVersions(true)
      const result = await window.electronAPI.prompts.listVersions(initial.id)
      if (!ignore && !result.error && result.data) {
        setVersions(result.data)
      }
      if (!ignore) setLoadingVersions(false)
    }

    loadVersions()

    return () => {
      ignore = true
    }
  }, [isEdit, initial?.id])

  useEffect(() => {
    let ignore = false

    async function loadStyleProfiles() {
      const result = await window.electronAPI.styleProfiles.list()
      if (ignore || result.error || !result.data) return
      setStyleProfiles(result.data)
    }

    loadStyleProfiles()

    return () => {
      ignore = true
    }
  }, [])

  const selectedStyleProfile = useMemo(
    () => styleProfiles.find((profile) => profile.id === selectedStyleProfileId),
    [styleProfiles, selectedStyleProfileId]
  )

  const restoreFromVersion = (version: PromptVersion) => {
    setTitle(version.title)
    setImages(() => {
      const stored = Array.isArray(version.imagesJson) ? version.imagesJson : []
      if (stored.length > 0) {
        return stored.map((image) => ({
          id: image.id,
          url: image.url,
          dataUrl: null,
          fileName: null,
          note: image.note ?? '',
          model: image.model ?? '',
          seed: image.seed ?? '',
          stylePreset: typeof (image as unknown as { stylePreset?: unknown }).stylePreset === 'string'
            ? String((image as unknown as { stylePreset: string }).stylePreset)
            : (version.stylePreset ?? ''),
          createdAt: image.createdAt ?? new Date().toISOString(),
          promptSource: (() => {
            const saved = (image as unknown as { promptSource?: 'generated' | 'improved' | 'custom' | 'original' }).promptSource
            const customPrompt = typeof (image as unknown as { customPrompt?: unknown }).customPrompt === 'string'
              ? String((image as unknown as { customPrompt: string }).customPrompt).trim()
              : ''
            if (customPrompt) return 'custom'
            if (saved === 'original') return 'generated'
            if (saved === 'generated' || saved === 'improved' || saved === 'custom') return saved
            return 'generated'
          })(),
          customPrompt: typeof (image as unknown as { customPrompt?: unknown }).customPrompt === 'string'
            ? String((image as unknown as { customPrompt: string }).customPrompt)
            : '',
          mediaType: (() => {
            const candidate = (image as unknown as { mediaType?: unknown }).mediaType
            if (candidate === 'video' || candidate === 'image') return candidate
            return detectMediaTypeFromUrl(image.url)
          })(),
          thumbnailUrl: typeof (image as unknown as { thumbnailUrl?: unknown }).thumbnailUrl === 'string'
            ? String((image as unknown as { thumbnailUrl: string }).thumbnailUrl)
            : '',
          durationSeconds: typeof (image as unknown as { durationSeconds?: unknown }).durationSeconds === 'number'
            ? (image as unknown as { durationSeconds: number }).durationSeconds
            : null,
          collectionId: typeof (image as unknown as { collectionId?: unknown }).collectionId === 'string'
            ? String((image as unknown as { collectionId: string }).collectionId)
            : null,
        }))
      }

      if (version.imageUrl) {
        const now = new Date().toISOString()
        const id = typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`

        return [{
          id,
          url: version.imageUrl,
          dataUrl: null,
          fileName: null,
          note: '',
          model: version.model ?? '',
          seed: version.seed ?? '',
          stylePreset: version.stylePreset ?? '',
          createdAt: now,
          promptSource: 'generated',
          customPrompt: '',
          mediaType: 'image',
          thumbnailUrl: '',
          durationSeconds: null,
          collectionId: null,
        }]
      }

      return []
    })
    setPromptText(version.promptText)
    setNegativePrompt(version.negativePrompt)
    setModel(version.model)
    setSuggestedModel(version.suggestedModel ?? '')
    setSeed(version.seed ?? '')
    setIsTemplate(version.isTemplate)
    setIsFavorite(version.isFavorite)
    setRating(version.rating ?? 0)
    setNotes(version.notes ?? '')
    setTags((version.tags ?? []).slice(0, MAX_TAG_COUNT))
    setTagInput('')
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (tags.length >= MAX_TAG_COUNT) {
      setTagInput('')
      return
    }
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const handleGenerateTags = async () => {
    if (!promptText.trim()) {
      setError('Enter a prompt before generating tags with AI.')
      return
    }

    setGeneratingTags(true)
    setError(null)

    try {
      const result = await window.electronAPI.generator.generateTags({
        title: title.trim(),
        prompt: promptText.trim(),
        negativePrompt: negativePrompt.trim(),
        existingTags: tags,
        maxTags: MAX_TAG_COUNT,
      })

      if (result.error || !result.data?.tags) {
        setError(result.error || 'AI could not generate tags.')
        return
      }

      setTags(result.data.tags.slice(0, MAX_TAG_COUNT))
      setTagInput('')
    } catch {
      setError('AI could not generate tags.')
    } finally {
      setGeneratingTags(false)
    }
  }

  const handleImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    setReadingImages(true)
    setError(null)

    const now = new Date().toISOString()
    const next: ImageDraft[] = []

    for (const file of selected) {
      try {
        const dataUrl = await readFileAsDataUrl(file)
        const id = typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`

        next.push({
          id,
          url: '',
          dataUrl,
          fileName: file.name,
          note: '',
          model: model.trim(),
          seed: seed.trim(),
          stylePreset: '',
          createdAt: now,
          promptSource: 'generated',
          customPrompt: '',
          mediaType: file.type.startsWith('video/') ? 'video' : 'image',
          thumbnailUrl: '',
          durationSeconds: null,
          collectionId: null,
        })
      } catch {
        setError('Could not read one of the selected media files.')
      }
    }

    if (next.length > 0) {
      setImages((prev) => [...prev, ...next])
    }

    setReadingImages(false)
    if (imagesInputRef.current) imagesInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const updateImage = (id: string, patch: Partial<Omit<ImageDraft, 'id'>>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...patch } : img))
    )
  }

  const makeCoverImage = (id: string) => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id)
      if (index <= 0) return prev
      const next = [...prev]
      const [picked] = next.splice(index, 1)
      next.unshift(picked)
      return next
    })
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !promptText.trim()) return

    setSubmitting(true)
    setError(null)

    const coverStylePreset = images[0]?.stylePreset?.trim() ?? ''

    const err = await onSubmit({
      title: title.trim(),
      promptText: promptText.trim(),
      negativePrompt: negativePrompt.trim(),
      model: model.trim(),
      suggestedModel: suggestedModel.trim(),
      seed: seed.trim(),
      stylePreset: coverStylePreset,
      isTemplate,
      isFavorite,
      rating: rating || null,
      notes: notes.trim(),
      tags: tags.slice(0, MAX_TAG_COUNT),
      images: images.map((image) => ({
        id: image.id,
        url: image.url,
        dataUrl: image.dataUrl,
        fileName: image.fileName,
        note: image.note,
        model: image.model,
        seed: image.seed,
        stylePreset: image.stylePreset.trim(),
        createdAt: image.createdAt,
        promptSource: image.customPrompt.trim()
          ? 'custom'
          : image.promptSource === 'custom'
            ? 'generated'
            : (image.promptSource ?? 'generated'),
        customPrompt: image.customPrompt.trim(),
        mediaType: image.mediaType,
        thumbnailUrl: image.thumbnailUrl.trim(),
        durationSeconds: image.durationSeconds ?? undefined,
        collectionId: image.collectionId,
      })),
    })

    if (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-slate-950/80 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] flex flex-col card border-slate-700 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/50">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Prompt' : 'New Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex overflow-hidden flex-col flex-1">
          <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* Title */}
            <div>
              <label className="label">Title *</label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g. Dreamy forest at twilight"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Prompt Media</label>
                <span className="text-[10px] text-slate-500">optional</span>
              </div>

              {images.length > 0 ? (
                <div className="space-y-3">
                  {images.map((image, index) => {
                    const previewUrl = image.dataUrl || image.url
                    const isCustomPromptActive = (image.promptSource ?? 'generated') === 'custom' || image.customPrompt.trim().length > 0

                    return (
                      <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                        <div className="aspect-[16/9] bg-slate-950/60">
                          {image.mediaType === 'video' ? (
                            <video
                              src={previewUrl}
                              className="object-cover w-full h-full"
                              controls
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt="Prompt preview"
                              className="object-cover w-full h-full"
                              onError={(event) => {
                                ;(event.currentTarget.parentElement as HTMLDivElement | null)?.classList.add('hidden')
                              }}
                            />
                          )}
                        </div>
                        <div className="px-3 py-3 space-y-3 border-t border-slate-800/60">
                          <div className="flex gap-3 justify-between items-center">
                            <p className="text-[11px] text-slate-500 truncate">
                              {image.fileName || (index === 0 ? 'Cover media' : 'Stored prompt media')}
                            </p>
                            <div className="flex gap-2 items-center">
                              {index !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => makeCoverImage(image.id)}
                                  className="btn-ghost border border-slate-700/50 px-2.5 py-1 text-[11px]"
                                  disabled={readingImages}
                                >
                                  Set cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="btn-ghost border border-red-900/50 px-2.5 py-1 text-[11px] text-red-300 hover:text-red-200"
                                disabled={readingImages}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="label">Media Note</label>
                            <textarea
                              value={image.note}
                              onChange={(e) => updateImage(image.id, { note: e.target.value })}
                              className="textarea"
                              rows={2}
                              placeholder="Optional note about this image…"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <label className="label">Generated By (Model)</label>
                              <select
                                value={modelOptions.includes(image.model) ? image.model : ''}
                                onChange={(e) => updateImage(image.id, { model: e.target.value })}
                                aria-label="Generated by (model)"
                                className="input"
                              >
                                <option value="">— kies model —</option>
                                {modelOptions.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label">Media Seed</label>
                              <input
                                type="text"
                                value={image.seed}
                                onChange={(e) => updateImage(image.id, { seed: e.target.value })}
                                className="input"
                                placeholder="e.g. 123456789"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="label">Media Style Preset</label>
                            <div className="flex gap-2">
                              <select
                                value={presetOptions.some((p) => p.presetName === image.stylePreset) ? image.stylePreset : ''}
                                onChange={(e) => updateImage(image.id, { stylePreset: e.target.value })}
                                aria-label="Select media style preset"
                                className="w-1/2 input"
                              >
                                <option value="">- kies preset -</option>
                                {presetOptions.map((preset) => (
                                  <option key={preset.presetName} value={preset.presetName}>
                                    {preset.presetName}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={image.stylePreset}
                                onChange={(e) => updateImage(image.id, { stylePreset: e.target.value })}
                                className="w-1/2 input"
                                placeholder="of typ een presetnaam"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="label !mb-2">Prompt used</label>
                            <button
                              type="button"
                              onClick={() => {
                                const enableCustom = !image.customPrompt.trim() && (image.promptSource ?? 'generated') !== 'custom'
                                if (enableCustom) {
                                  updateImage(image.id, { promptSource: 'custom', customPrompt: promptText })
                                  return
                                }

                                updateImage(image.id, {
                                  promptSource: image.promptSource === 'custom' || image.customPrompt.trim() ? 'generated' : 'custom',
                                  customPrompt: image.promptSource === 'custom' || image.customPrompt.trim() ? '' : promptText,
                                })
                              }}
                              className={isCustomPromptActive ? 'btn-compact-primary' : 'btn-compact-ghost'}
                            >
                              <span className="inline-flex items-center gap-2">
                                <span className={isCustomPromptActive ? 'text-white' : 'text-slate-400'}>
                                  {isCustomPromptActive ? <Check size={14} /> : <span className="w-[14px]" />}
                                </span>
                                Use custom prompt for this media item
                              </span>
                            </button>

                            {isCustomPromptActive && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="label !mb-0">Custom Prompt</label>
                                  <span className="text-[10px] text-slate-500">{image.customPrompt.length} chars</span>
                                </div>
                                <textarea
                                  value={image.customPrompt}
                                  onChange={(e) => updateImage(image.id, {
                                    customPrompt: e.target.value,
                                    // Keep the editor active while users clear/paste content.
                                    promptSource: 'custom',
                                  })}
                                  className="textarea"
                                  rows={3}
                                  placeholder="Enter a custom prompt for this image..."
                                />
                              </div>
                            )}

                            {(image.promptSource ?? 'generated') !== 'custom' && !image.customPrompt.trim() && improvedPromptValue.trim() && (
                              <p className="mt-2 text-[10px] text-slate-500">
                                This image currently uses the saved generated or improved prompt.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                  )
                })}

                  <button
                    type="button"
                    onClick={() => imagesInputRef.current?.click()}
                    className="px-4 py-4 w-full text-left rounded-2xl border border-dashed transition-colors border-slate-700 bg-slate-900/30 hover:border-amber-500/40 hover:bg-slate-900/50"
                    disabled={readingImages}
                  >
                    <p className="text-sm font-medium text-slate-300">
                      {readingImages ? 'Reading media…' : 'Add media'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Saved locally under your user profile in NightCompanion/images.
                    </p>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imagesInputRef.current?.click()}
                  className="px-4 py-5 w-full text-left rounded-2xl border border-dashed transition-colors border-slate-700 bg-slate-900/30 hover:border-amber-500/40 hover:bg-slate-900/50"
                  disabled={readingImages}
                >
                  <p className="text-sm font-medium text-slate-300">
                    {readingImages ? 'Reading media…' : 'Upload prompt media'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Saved locally under your user profile in NightCompanion/images.
                  </p>
                </button>
              )}

              <input
                ref={imagesInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleImagesSelect}
                aria-label="Upload prompt media"
                className="hidden"
              />
            </div>

            {/* Prompt text */}
            <div>
              <label className="label !mb-0">Prompt *</label>
              
              <div className="mt-2">
                <textarea
                  value={promptText}
                  readOnly
                  className="textarea"
                  rows={3}
                  placeholder="Describe what you want to generate…"
                />
              </div>

            </div>

            {/* Negative prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Negative Prompt</label>
                <span className="text-[10px] text-slate-500">optional</span>
              </div>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="textarea"
                rows={2}
                placeholder="Things to avoid…"
              />
            </div>

            <div>
              <label className="label">Suggested Model</label>
              <input
                type="text"
                value={suggestedModel}
                readOnly
                aria-label="Suggested model"
                className="input bg-slate-900/60 text-slate-400"
                placeholder="No suggested model saved"
              />
              <p className="text-[10px] text-slate-600 mt-1">Saved from Generator model advice and not editable here.</p>
            </div>

            <div>
              <label className="label">Style Profile (preview only)</label>
              <select
                value={selectedStyleProfileId}
                onChange={(e) => setSelectedStyleProfileId(e.target.value ? Number(e.target.value) : '')}
                aria-label="Select style profile"
                className="input"
              >
                <option value="">none</option>
                {styleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setIsTemplate((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg border text-xs transition-colors ${isTemplate ? 'text-teal-300 bg-teal-500/15 border-teal-500/40' : 'bg-slate-800 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => setIsFavorite((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg border text-xs transition-colors ${isFavorite ? 'text-rose-300 bg-rose-500/15 border-rose-500/40' : 'bg-slate-800 border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  Favorite
                </button>
              </div>
            </div>

            <div>
              <label className="label">Rating</label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div
                    key={value}
                    className={`relative w-9 h-9 rounded-lg border transition-colors ${rating >= value - 0.5 ? 'text-glow-amber border-glow-amber/40 bg-glow-amber/10' : 'text-slate-600 border-slate-700/50 hover:text-slate-500'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setRating((prev) => (isSameRating(prev, value - 0.5) ? 0 : value - 0.5))}
                      className="absolute inset-y-0 left-0 z-10 w-1/2"
                      aria-label={`Set rating ${value - 0.5}`}
                      title={`Set rating ${value - 0.5}`}
                    />
                    <button
                      type="button"
                      onClick={() => setRating((prev) => (isSameRating(prev, value) ? 0 : value))}
                      className="absolute inset-y-0 right-0 z-10 w-1/2"
                      aria-label={`Set rating ${value}`}
                      title={`Set rating ${value}`}
                    />
                    <div className="flex absolute inset-0 justify-center items-center pointer-events-none">
                      {getStarFill(rating, value) === 'full' && <Star size={16} fill="currentColor" />}
                      {getStarFill(rating, value) === 'half' && <StarHalf size={16} fill="currentColor" />}
                      {getStarFill(rating, value) === 'empty' && <Star size={16} />}
                    </div>
                  </div>
                ))}
                <span className="text-xs text-slate-500 min-w-[3rem] ml-1">{rating ? rating.toFixed(1) : '0.0'}/5</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Tags</label>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-slate-500">{tags.length}/{MAX_TAG_COUNT}</span>
                  <button
                    type="button"
                    onClick={handleGenerateTags}
                    disabled={generatingTags || !promptText.trim() || tags.length >= MAX_TAG_COUNT}
                    className="btn-ghost border border-slate-700/50 px-2.5 py-1 text-[11px]"
                  >
                    {generatingTags ? 'Generating...' : 'Add Tags with AI'}
                  </button>
                </div>
              </div>
              <div className="input flex flex-wrap gap-1.5 min-h-[42px] cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
                {tags.map((tag) => (
                  <span key={tag} className="flex-shrink-0 tag-removable">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="leading-none transition-colors text-slate-500 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  disabled={tags.length >= MAX_TAG_COUNT}
                  className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 min-w-[120px] flex-1"
                  placeholder={tags.length >= MAX_TAG_COUNT ? 'Maximum of 15 tags reached' : tags.length === 0 ? 'Add tags, press Enter…' : ''}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Press Enter or comma to add a tag. Maximum 15 tags.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea"
                rows={2}
                placeholder="Personal notes about this prompt…"
              />
            </div>

            {isEdit && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">History</label>
                  <span className="text-[10px] text-slate-500">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                </div>

                {loadingVersions ? (
                  <div className="px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900/40 text-slate-500">
                    Loading history…
                  </div>
                ) : versions.length === 0 ? (
                  <div className="px-3 py-2 text-xs rounded-lg border border-slate-800 bg-slate-900/40 text-slate-500">
                    No previous versions yet.
                  </div>
                ) : (
                  <div className="rounded-lg border divide-y border-slate-800 bg-slate-900/40 divide-slate-700/60">
                    {versions.slice(0, 8).map((version) => (
                      <div key={version.id} className="flex gap-3 justify-between items-center px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs truncate text-slate-300">v{version.versionNumber} · {version.title || 'Untitled'}</p>
                          <p className="text-[10px] text-slate-500">{new Date(version.createdAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreFromVersion(version)}
                          className="btn-ghost border border-slate-700/50 px-2.5 py-1 text-[11px]"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 text-sm text-red-300 rounded-lg border bg-red-950/50 border-red-800/50">
                {error}
              </div>
            )}
            </div>

            <div className="overflow-y-auto p-4 border-t border-slate-800/50 lg:border-t-0 lg:border-l md:p-5">
              <div className="lg:sticky lg:top-0">
                <PromptPreview
                  promptText={promptText}
                  negativePrompt={negativePrompt}
                  styleSnippet={selectedStyleProfile?.basePromptSnippet ?? ''}
                  styleNegative={selectedStyleProfile?.commonNegativePrompts ?? ''}
                  model={model}
                  maxWords={70}
                  onSave={() => formRef.current?.requestSubmit()}
                  saveLabel={isEdit ? 'Save changes' : 'Create prompt'}
                  saveDisabled={submitting || !title.trim() || !promptText.trim()}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end items-center px-6 py-4 border-t border-slate-800/50 bg-slate-900/30">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !promptText.trim()}
              className="btn-primary"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create prompt'}
            </button>
          </div>
        </form>
      </div>

    </div>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Invalid file read result.'))
    }
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
