import { useState, useEffect, useMemo, useRef } from 'react'
import type { Prompt, PromptVersion, StyleProfile, PromptMutationInput } from '../types'
import PromptPreview from './PromptPreview'
import { Star, StarHalf } from 'lucide-react'

type FormData = PromptMutationInput
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
  const [isTemplate, setIsTemplate] = useState(initial?.isTemplate ?? false)
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false)
  const [rating, setRating] = useState<number>(initial?.rating ?? 0)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string | null>(null)
  const [readingImage, setReadingImage] = useState(false)
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
  const imageInputRef = useRef<HTMLInputElement>(null)
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
    setImageUrl(version.imageUrl ?? '')
    setImageDataUrl(null)
    setImageFileName(null)
    setPromptText(version.promptText)
    setNegativePrompt(version.negativePrompt)
    setModel(version.model)
    setSuggestedModel(version.suggestedModel ?? '')
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setReadingImage(true)
    setError(null)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImageUrl(dataUrl)
      setImageDataUrl(dataUrl)
      setImageFileName(file.name)
    } catch {
      setError('Could not read the selected image.')
    } finally {
      setReadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleRemoveImage = () => {
    setImageUrl('')
    setImageDataUrl(null)
    setImageFileName(null)
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

    const err = await onSubmit({
      title: title.trim(),
      imageUrl: imageDataUrl ? '' : imageUrl.trim(),
      imageDataUrl,
      imageFileName,
      removeImage: !imageDataUrl && !imageUrl.trim() && Boolean(initial?.imageUrl),
      promptText: promptText.trim(),
      negativePrompt: negativePrompt.trim(),
      model: model.trim(),
      suggestedModel: suggestedModel.trim(),
      isTemplate,
      isFavorite,
      rating: rating || null,
      notes: notes.trim(),
      tags: tags.slice(0, MAX_TAG_COUNT),
    })

    if (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-950/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] flex flex-col card border-night-600 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-night-700/50">
          <h2 className="text-base font-semibold text-white">
            {isEdit ? 'Edit Prompt' : 'New Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="text-night-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-night-700 text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
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
                <label className="label !mb-0">Prompt Image</label>
                <span className="text-[10px] text-night-500">optional</span>
              </div>

              {imageUrl ? (
                <div className="rounded-2xl border border-night-700 bg-night-900/40 overflow-hidden">
                  <div className="aspect-[16/9] bg-night-950/60">
                    <img
                      src={imageUrl}
                      alt="Prompt preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-night-700/60">
                    <p className="text-[11px] text-night-400 truncate">
                      {imageFileName || 'Stored prompt image'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="btn-ghost border border-night-600/50 px-2.5 py-1 text-[11px]"
                        disabled={readingImage}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="btn-ghost border border-red-900/50 px-2.5 py-1 text-[11px] text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full rounded-2xl border border-dashed border-night-600 bg-night-900/30 px-4 py-5 text-left transition-colors hover:border-amber-500/40 hover:bg-night-900/50"
                  disabled={readingImage}
                >
                  <p className="text-sm font-medium text-night-200">
                    {readingImage ? 'Reading image…' : 'Upload prompt image'}
                  </p>
                  <p className="mt-1 text-xs text-night-500">
                    Saved locally under your user profile in NightCompanion/images.
                  </p>
                </button>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                aria-label="Upload prompt image"
                className="hidden"
              />
            </div>

            {/* Prompt text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Prompt *</label>
                <span className="text-[10px] text-night-500">{promptText.length} chars</span>
              </div>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="textarea"
                rows={5}
                placeholder="Describe what you want to generate…"
                required
              />
            </div>

            {/* Negative prompt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Negative Prompt</label>
                <span className="text-[10px] text-night-500">optional</span>
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
                  className="input w-1/2"
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
                  className="input w-1/2"
                  placeholder="of typ een modelnaam"
                />
              </div>
            </div>

            <div>
              <label className="label">Suggested Model</label>
              <input
                type="text"
                value={suggestedModel}
                readOnly
                aria-label="Suggested model"
                className="input bg-night-900/60 text-night-300"
                placeholder="No suggested model saved"
              />
              <p className="text-[10px] text-night-600 mt-1">Saved from Generator model advice and not editable here.</p>
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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplate((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg border text-xs transition-colors ${isTemplate ? 'bg-teal-500/15 border-teal-500/40 text-teal-300' : 'bg-night-800 border-night-700 text-night-300 hover:text-white'}`}
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => setIsFavorite((prev) => !prev)}
                  className={`px-3 py-2 rounded-lg border text-xs transition-colors ${isFavorite ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' : 'bg-night-800 border-night-700 text-night-300 hover:text-white'}`}
                >
                  Favorite
                </button>
              </div>
            </div>

            <div>
              <label className="label">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div
                    key={value}
                    className={`relative w-9 h-9 rounded-lg border transition-colors ${rating >= value - 0.5 ? 'text-glow-amber border-glow-amber/40 bg-glow-amber/10' : 'text-night-600 border-night-600/50 hover:text-night-400'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setRating((prev) => (isSameRating(prev, value - 0.5) ? 0 : value - 0.5))}
                      className="absolute inset-y-0 left-0 w-1/2 z-10"
                      aria-label={`Set rating ${value - 0.5}`}
                      title={`Set rating ${value - 0.5}`}
                    />
                    <button
                      type="button"
                      onClick={() => setRating((prev) => (isSameRating(prev, value) ? 0 : value))}
                      className="absolute inset-y-0 right-0 w-1/2 z-10"
                      aria-label={`Set rating ${value}`}
                      title={`Set rating ${value}`}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {getStarFill(rating, value) === 'full' && <Star size={16} fill="currentColor" />}
                      {getStarFill(rating, value) === 'half' && <StarHalf size={16} fill="currentColor" />}
                      {getStarFill(rating, value) === 'empty' && <Star size={16} />}
                    </div>
                  </div>
                ))}
                <span className="text-xs text-night-400 min-w-[3rem] ml-1">{rating ? rating.toFixed(1) : '0.0'}/5</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Tags</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-night-500">{tags.length}/{MAX_TAG_COUNT}</span>
                  <button
                    type="button"
                    onClick={handleGenerateTags}
                    disabled={generatingTags || !promptText.trim() || tags.length >= MAX_TAG_COUNT}
                    className="btn-ghost border border-night-600/50 px-2.5 py-1 text-[11px]"
                  >
                    {generatingTags ? 'Generating...' : 'Add Tags with AI'}
                  </button>
                </div>
              </div>
              <div className="input flex flex-wrap gap-1.5 min-h-[42px] cursor-text" onClick={() => document.getElementById('tag-input')?.focus()}>
                {tags.map((tag) => (
                  <span key={tag} className="tag-removable flex-shrink-0">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-night-500 hover:text-white transition-colors leading-none"
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
                  className="bg-transparent border-none outline-none text-sm text-night-200 placeholder-night-500 min-w-[120px] flex-1"
                  placeholder={tags.length >= MAX_TAG_COUNT ? 'Maximum of 15 tags reached' : tags.length === 0 ? 'Add tags, press Enter…' : ''}
                />
              </div>
              <p className="text-[10px] text-night-600 mt-1">Press Enter or comma to add a tag. Maximum 15 tags.</p>
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
                  <span className="text-[10px] text-night-500">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
                </div>

                {loadingVersions ? (
                  <div className="rounded-lg border border-night-700 bg-night-900/40 px-3 py-2 text-xs text-night-400">
                    Loading history…
                  </div>
                ) : versions.length === 0 ? (
                  <div className="rounded-lg border border-night-700 bg-night-900/40 px-3 py-2 text-xs text-night-500">
                    No previous versions yet.
                  </div>
                ) : (
                  <div className="rounded-lg border border-night-700 bg-night-900/40 divide-y divide-night-700/60">
                    {versions.slice(0, 8).map((version) => (
                      <div key={version.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs text-night-200 truncate">v{version.versionNumber} · {version.title || 'Untitled'}</p>
                          <p className="text-[10px] text-night-500">{new Date(version.createdAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreFromVersion(version)}
                          className="btn-ghost border border-night-600/50 px-2.5 py-1 text-[11px]"
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
              <div className="px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
                {error}
              </div>
            )}
            </div>

            <div className="border-t border-night-700/50 lg:border-t-0 lg:border-l overflow-y-auto p-4 md:p-5">
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
          <div className="px-6 py-4 border-t border-night-700/50 flex items-center justify-end gap-3 bg-night-900/30">
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
