import { useState, useEffect, useMemo, useRef } from 'react'
import type { Prompt, PromptVersion, StyleProfile, PromptMutationInput } from '../types'
import PromptPreview from './PromptPreview'
import { Star, StarHalf } from 'lucide-react'

type FormData = PromptMutationInput
type ImageDraft = {
  id: string
  url: string
  dataUrl: string | null
  fileName: string | null
  note: string
  model: string
  seed: string
  createdAt: string
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
  const [improvedPrompt, setImprovedPrompt] = useState('')
  const [selectedPromptType, setSelectedPromptType] = useState<'original' | 'improved'>('original')
  const [imagePromptSelection, setImagePromptSelection] = useState<{ [imageId: string]: 'original' | 'improved' | 'custom' }>({})
  const [imageCustomPrompts, setImageCustomPrompts] = useState<{ [imageId: string]: string }>({})
  const [showImagePromptDialog, setShowImagePromptDialog] = useState(false)
  const [pendingImageId, setPendingImageId] = useState<string | null>(null)
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
        createdAt: image.createdAt ?? new Date().toISOString(),
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
        createdAt: now,
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
          createdAt: image.createdAt ?? new Date().toISOString(),
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
          createdAt: now,
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
          createdAt: now,
        })
      } catch {
        setError('Could not read one of the selected images.')
      }
    }

    if (next.length > 0) {
      setImages((prev) => [...prev, ...next])
      // Show prompt selection dialog for the first uploaded image
      setPendingImageId(next[0].id)
      setShowImagePromptDialog(true)
    }

    setReadingImages(false)
    if (imagesInputRef.current) imagesInputRef.current.value = ''
  }

  const handleImagePromptSelection = (imageId: string, selection: 'original' | 'improved' | 'custom') => {
    setImagePromptSelection(prev => ({ ...prev, [imageId]: selection }))
  }

  const handleImageCustomPrompt = (imageId: string, customPrompt: string) => {
    setImageCustomPrompts(prev => ({ ...prev, [imageId]: customPrompt }))
  }

  const handleImagePromptDialogClose = () => {
    setShowImagePromptDialog(false)
    setPendingImageId(null)
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
    const selectedPrompt = selectedPromptType === 'improved' && improvedPrompt ? improvedPrompt : promptText
    if (!title.trim() || !selectedPrompt.trim()) return

    setSubmitting(true)
    setError(null)

    const err = await onSubmit({
      title: title.trim(),
      promptText: selectedPrompt.trim(),
      negativePrompt: negativePrompt.trim(),
      model: model.trim(),
      suggestedModel: suggestedModel.trim(),
      seed: seed.trim(),
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
        createdAt: image.createdAt,
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
                <label className="label !mb-0">Prompt Images</label>
                <span className="text-[10px] text-slate-500">optional</span>
              </div>

              {images.length > 0 ? (
                <div className="space-y-3">
                  {images.map((image, index) => {
                    const previewUrl = image.dataUrl || image.url

                    return (
                      <div key={image.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                        <div className="aspect-[16/9] bg-slate-950/60">
                          <img
                            src={previewUrl}
                            alt="Prompt preview"
                            className="object-cover w-full h-full"
                            onError={(event) => {
                              ;(event.currentTarget.parentElement as HTMLDivElement | null)?.classList.add('hidden')
                            }}
                          />
                        </div>
                        <div className="px-3 py-3 space-y-3 border-t border-slate-800/60">
                          <div className="flex gap-3 justify-between items-center">
                            <p className="text-[11px] text-slate-500 truncate">
                              {image.fileName || (index === 0 ? 'Cover image' : 'Stored prompt image')}
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
                            <label className="label">Image Note</label>
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
                              <input
                                type="text"
                                value={image.model}
                                onChange={(e) => updateImage(image.id, { model: e.target.value })}
                                className="input"
                                placeholder="e.g. SDXL, Flux, etc."
                              />
                            </div>
                            <div>
                              <label className="label">Image Seed</label>
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
                            <label className="label mb-2">Prompt Selection</label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`prompt-${image.id}`}
                                  value="original"
                                  checked={imagePromptSelection[image.id] === 'original' || !imagePromptSelection[image.id]}
                                  onChange={() => handleImagePromptSelection(image.id, 'original')}
                                  className="w-3 h-3 text-teal-500 border-slate-600"
                                />
                                <span className="text-slate-300">Use original prompt</span>
                              </label>
                              
                              {improvedPrompt && (
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    name={`prompt-${image.id}`}
                                    value="improved"
                                    checked={imagePromptSelection[image.id] === 'improved'}
                                    onChange={() => handleImagePromptSelection(image.id, 'improved')}
                                    className="w-3 h-3 text-teal-500 border-slate-600"
                                  />
                                  <span className="text-slate-300">Use improved prompt</span>
                                </label>
                              )}
                              
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`prompt-${image.id}`}
                                  value="custom"
                                  checked={imagePromptSelection[image.id] === 'custom'}
                                  onChange={() => handleImagePromptSelection(image.id, 'custom')}
                                  className="w-3 h-3 text-teal-500 border-slate-600"
                                />
                                <span className="text-slate-300">Custom prompt</span>
                              </label>
                            </div>
                            
                            {imagePromptSelection[image.id] === 'custom' && (
                              <div className="mt-2">
                                <textarea
                                  value={imageCustomPrompts[image.id] || ''}
                                  onChange={(e) => handleImageCustomPrompt(image.id, e.target.value)}
                                  className="textarea w-full"
                                  rows={2}
                                  placeholder="Enter custom prompt for this image..."
                                />
                              </div>
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
                      {readingImages ? 'Reading images…' : 'Add images'}
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
                    {readingImages ? 'Reading images…' : 'Upload prompt images'}
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
                accept="image/*"
                onChange={handleImagesSelect}
                aria-label="Upload prompt images"
                className="hidden"
              />
            </div>

            {/* Prompt text */}
            <div>
              <label className="label !mb-0">Prompt *</label>
              
              {/* Original Prompt */}
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="original-prompt"
                    checked={selectedPromptType === 'original'}
                    onChange={() => setSelectedPromptType('original')}
                    className="w-4 h-4 text-teal-500 border-slate-600 rounded focus:ring-teal-500 focus:ring-2"
                  />
                  <label htmlFor="original-prompt" className="text-sm font-medium text-white">Original Prompt</label>
                  <span className="text-[10px] text-slate-500 ml-auto">{promptText.length} chars</span>
                </div>
                <textarea
                  value={promptText}
                  readOnly
                  className="textarea"
                  rows={3}
                  placeholder="Describe what you want to generate…"
                />
              </div>

              {/* Improved Prompt */}
              {improvedPrompt && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="improved-prompt"
                      checked={selectedPromptType === 'improved'}
                      onChange={() => setSelectedPromptType('improved')}
                      className="w-4 h-4 text-teal-500 border-slate-600 rounded focus:ring-teal-500 focus:ring-2"
                    />
                    <label htmlFor="improved-prompt" className="text-sm font-medium text-white">Improved Prompt</label>
                    <span className="text-[10px] text-slate-500 ml-auto">{improvedPrompt.length} chars</span>
                  </div>
                  <textarea
                    value={improvedPrompt}
                    readOnly
                    className="textarea"
                    rows={3}
                    placeholder="Improved version of the prompt…"
                  />
                </div>
              )}

              {/* Edit field for the selected prompt */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0">Edit {selectedPromptType === 'improved' ? 'Improved' : 'Original'} Prompt *</label>
                  <span className="text-[10px] text-slate-500">
                    {(selectedPromptType === 'improved' && improvedPrompt ? improvedPrompt.length : promptText.length)} chars
                  </span>
                </div>
                <textarea
                  value={selectedPromptType === 'improved' && improvedPrompt ? improvedPrompt : promptText}
                  onChange={(e) => {
                    if (selectedPromptType === 'improved') {
                      setImprovedPrompt(e.target.value)
                    } else {
                      setPromptText(e.target.value)
                    }
                  }}
                  className="textarea"
                  rows={5}
                  placeholder="Describe what you want to generate…"
                  required
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

            {/* Model */}
            <div>
              <label className="label">Model</label>
              <div className="flex gap-2">
                <select
                  value={modelOptions.includes(model) ? model : ''}
                  onChange={(e) => setModel(e.target.value)}
                  aria-label="Select model"
                  className="w-1/2 input"
                >
                  <option value="">— kies model —</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-1/2 input"
                  placeholder="of typ een modelnaam"
                />
              </div>
            </div>

            <div>
              <label className="label">Seed</label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="input"
                placeholder="e.g. 123456789"
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
                  promptText={selectedPromptType === 'improved' && improvedPrompt ? improvedPrompt : promptText}
                  negativePrompt={negativePrompt}
                  styleSnippet={selectedStyleProfile?.basePromptSnippet ?? ''}
                  styleNegative={selectedStyleProfile?.commonNegativePrompts ?? ''}
                  model={model}
                  maxWords={70}
                  onSave={() => formRef.current?.requestSubmit()}
                  saveLabel={isEdit ? 'Save changes' : 'Create prompt'}
                  saveDisabled={submitting || !title.trim() || !(selectedPromptType === 'improved' && improvedPrompt ? improvedPrompt : promptText).trim()}
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

      {/* Image Prompt Selection Dialog */}
      {showImagePromptDialog && pendingImageId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Prompt for Image</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="image-prompt"
                  value="original"
                  checked={imagePromptSelection[pendingImageId] === 'original'}
                  onChange={() => handleImagePromptSelection(pendingImageId, 'original')}
                  className="w-4 h-4 text-teal-500 border-slate-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Original Prompt</div>
                  <div className="text-sm text-slate-400 mt-1">Use the main prompt text</div>
                </div>
              </label>

              {improvedPrompt && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="image-prompt"
                    value="improved"
                    checked={imagePromptSelection[pendingImageId] === 'improved'}
                    onChange={() => handleImagePromptSelection(pendingImageId, 'improved')}
                    className="w-4 h-4 text-teal-500 border-slate-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">Improved Prompt</div>
                    <div className="text-sm text-slate-400 mt-1">Use the improved version</div>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="image-prompt"
                  value="custom"
                  checked={imagePromptSelection[pendingImageId] === 'custom'}
                  onChange={() => handleImagePromptSelection(pendingImageId, 'custom')}
                  className="w-4 h-4 text-teal-500 border-slate-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Custom Prompt</div>
                  <div className="text-sm text-slate-400 mt-1">Enter a custom prompt for this image</div>
                </div>
              </label>
            </div>

            {imagePromptSelection[pendingImageId] === 'custom' && (
              <div className="mt-4">
                <label className="label !mb-2">Custom Prompt</label>
                <textarea
                  value={imageCustomPrompts[pendingImageId] || ''}
                  onChange={(e) => handleImageCustomPrompt(pendingImageId, e.target.value)}
                  className="textarea w-full"
                  rows={3}
                  placeholder="Enter a custom prompt for this image..."
                />
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={handleImagePromptDialogClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImagePromptDialogClose}
                className="btn-primary"
                disabled={imagePromptSelection[pendingImageId] === 'custom' && !imageCustomPrompts[pendingImageId]?.trim()}
              >
                Set Prompt
              </button>
            </div>
          </div>
        </div>
      )}
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
