import { useState, useEffect, useMemo, useRef } from 'react'
import type { Prompt, PromptVersion, NewPrompt, StyleProfile } from '../types'
import PromptPreview from './PromptPreview'

type FormData = Omit<NewPrompt, 'createdAt' | 'updatedAt'>

type Props = {
  initial?: Prompt
  onSubmit: (data: FormData) => Promise<string | null>
  onClose: () => void
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
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<number | ''>('')

  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
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
    setPromptText(version.promptText)
    setNegativePrompt(version.negativePrompt)
    setModel(version.model)
    setIsTemplate(version.isTemplate)
    setIsFavorite(version.isFavorite)
    setRating(version.rating ?? 0)
    setNotes(version.notes ?? '')
    setTags(version.tags ?? [])
    setTagInput('')
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

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
      promptText: promptText.trim(),
      negativePrompt: negativePrompt.trim(),
      model: model.trim(),
      isTemplate,
      isFavorite,
      rating: rating || null,
      notes: notes.trim(),
      tags,
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
              <label className="label">Style Profile (preview only)</label>
              <select
                value={selectedStyleProfileId}
                onChange={(e) => setSelectedStyleProfileId(e.target.value ? Number(e.target.value) : '')}
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
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating((prev) => (prev === value ? 0 : value))}
                    className={`w-9 h-9 rounded-lg border text-base transition-colors ${rating >= value ? 'text-yellow-400 border-yellow-600/50 bg-yellow-900/20' : 'text-night-600 border-night-600/50 hover:text-night-400'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="label">Tags</label>
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
                  className="bg-transparent border-none outline-none text-sm text-night-200 placeholder-night-500 min-w-[120px] flex-1"
                  placeholder={tags.length === 0 ? 'Add tags, press Enter…' : ''}
                />
              </div>
              <p className="text-[10px] text-night-600 mt-1">Press Enter or comma to add a tag</p>
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

            <div className="border-t border-night-700/50 lg:border-t-0 lg:border-l border-night-700/50 overflow-y-auto p-4 md:p-5">
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
