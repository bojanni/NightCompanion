import { useEffect, useMemo, useState } from 'react'
import type { StyleProfile } from '../types'
import PromptPreview from '../components/PromptPreview'

type Part = {
  id: string
  label: string
  placeholder: string
  value: string
}

const DEFAULT_PARTS: Part[] = [
  { id: 'subject', label: 'Subject', placeholder: 'e.g. a lone wolf standing on a cliff', value: '' },
  { id: 'style', label: 'Art Style', placeholder: 'e.g. oil painting, impressionist, digital art', value: '' },
  { id: 'lighting', label: 'Lighting', placeholder: 'e.g. golden hour, dramatic rim lighting, moonlight', value: '' },
  { id: 'mood', label: 'Mood / Atmosphere', placeholder: 'e.g. ethereal, melancholic, dreamlike', value: '' },
  { id: 'artist', label: 'Artist References', placeholder: 'e.g. in the style of Alphonse Mucha, Greg Rutkowski', value: '' },
  { id: 'technical', label: 'Technical Details', placeholder: 'e.g. 8k, highly detailed, cinematic, trending on ArtStation', value: '' },
]

type PromptBuilderProps = {
  embedded?: boolean
  greylistEnabled?: boolean
  greylistWords?: string[]
  maxWords?: number
}

export default function PromptBuilder({ embedded = false, greylistEnabled = true, greylistWords = [], maxWords = 70 }: PromptBuilderProps) {
  const [parts, setParts] = useState<Part[]>(DEFAULT_PARTS)
  const [separator, setSeparator] = useState<', ' | '. ' | ' | '>( ', ')
  const [savedTitle, setSavedTitle] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [styleProfiles, setStyleProfiles] = useState<StyleProfile[]>([])
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<number | ''>('')

  const updatePart = (id: string, value: string) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)))
  }

  const builtPrompt = parts
    .map((p) => p.value.trim())
    .filter(Boolean)
    .join(separator)

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

  const composedPrompt = useMemo(
    () => [builtPrompt.trim(), selectedStyleProfile?.basePromptSnippet?.trim() ?? ''].filter(Boolean).join(', '),
    [builtPrompt, selectedStyleProfile?.basePromptSnippet]
  )

  const composedNegative = useMemo(
    () => (selectedStyleProfile?.commonNegativePrompts ?? '').trim(),
    [selectedStyleProfile?.commonNegativePrompts]
  )

  // Detect greylist words in the built prompt
  const detectedGreylistWords = useMemo(() =>
    greylistEnabled && greylistWords.length > 0
      ? greylistWords.filter(word => 
          composedPrompt.toLowerCase().includes(word.toLowerCase())
        )
      : [],
    [greylistEnabled, greylistWords, composedPrompt]
  )

  const handleSaveToLibrary = async () => {
    if (!composedPrompt || !savedTitle.trim()) return

    // Check for duplicates
    const existingPromptsResult = await window.electronAPI.prompts.list()
    if (existingPromptsResult.error || !existingPromptsResult.data) {
      setSaveMsg('Error: Failed to check for duplicates.')
      return
    }

    const duplicate = existingPromptsResult.data.find(
      prompt => 
        prompt.promptText.trim() === composedPrompt.trim() && 
        prompt.title.trim() === savedTitle.trim()
    )

    if (duplicate) {
      await window.electronAPI.dialog.showMessageBox({
        type: 'warning',
        title: 'Duplicate Prompt',
        message: 'A prompt with this title and content already exists in your library.',
        buttons: ['OK']
      })
      return
    }

    const result = await window.electronAPI.prompts.create({
      title: savedTitle.trim(),
      promptText: composedPrompt,
      negativePrompt: composedNegative,
      model: '',
      suggestedModel: '',
      notes: 'Created with Prompt Builder',
      tags: [],
    })
    if (result.error) {
      setSaveMsg(`Error: ${result.error}`)
    } else {
      setSaveMsg('Saved to Prompt Library!')
      setSavedTitle('')
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  const handleClear = () => {
    setParts(DEFAULT_PARTS)
    setSavedTitle('')
  }

  return (
    <div className={`${embedded ? 'flex min-h-[560px] flex-col lg:flex-row' : 'no-drag-region flex h-full flex-col lg:flex-row'}`}>
      {/* Left: part inputs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex items-center justify-between px-8 pb-5 ${embedded ? 'pt-5' : 'pt-8'}`}>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Prompt Builder</h1>
            <p className="text-sm text-night-400 mt-0.5">Compose prompts from modular parts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-night-400">Join with</span>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value as typeof separator)}
                className="input w-28 text-xs"
                aria-label="Prompt separator"
                title="Prompt separator"
              >
                <option value=", ">comma</option>
                <option value=". ">period</option>
                <option value=" | ">pipe</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-night-400">Style profile</span>
              <select
                value={selectedStyleProfileId}
                onChange={(e) => setSelectedStyleProfileId(e.target.value ? Number(e.target.value) : '')}
                className="input w-44 text-xs"
                aria-label="Style profile"
              >
                <option value="">none</option>
                {styleProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleClear} className="btn-ghost text-xs">Clear all</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
          {parts.map((part) => (
            <div key={part.id}>
              <label className="label">{part.label}</label>
              <textarea
                value={part.value}
                onChange={(e) => updatePart(part.id, e.target.value)}
                className="textarea"
                rows={2}
                placeholder={part.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Right: output panel */}
      <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-night-700/50 flex flex-col bg-night-900/30">
        <div className="px-5 pt-8 pb-4 border-b border-night-700/50">
          <h2 className="text-sm font-semibold text-white mb-0.5">Built Prompt</h2>
          <p className="text-[10px] text-night-500">{composedPrompt.length} characters</p>
        </div>

        {/* Greylist warning */}
        {detectedGreylistWords.length > 0 && (
          <div className="px-5 py-2 bg-glow-amber/10 border-b border-glow-amber/40">
            <p className="text-[10px] text-glow-amber">
              ⚠️ Greylist words detected: {detectedGreylistWords.join(', ')}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PromptPreview
            promptText={builtPrompt}
            styleSnippet={selectedStyleProfile?.basePromptSnippet ?? ''}
            styleNegative={selectedStyleProfile?.commonNegativePrompts ?? ''}
            maxWords={maxWords}
            greylistWords={greylistEnabled ? greylistWords : []}
            onSave={handleSaveToLibrary}
            saveLabel="Save"
            saveDisabled={!composedPrompt || !savedTitle.trim()}
          />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-night-700/50 space-y-3">
          <div className="space-y-2">
            <input
              type="text"
              value={savedTitle}
              onChange={(e) => setSavedTitle(e.target.value)}
              className="input text-xs"
              placeholder="Title to save as…"
            />
            <button
              onClick={handleSaveToLibrary}
              disabled={!composedPrompt || !savedTitle.trim()}
              className="w-full btn-ghost text-xs border border-night-600/50"
            >
              Save to Library
            </button>
          </div>

          {saveMsg && (
            <p className={`text-xs text-center animate-fade-in ${saveMsg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {saveMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
