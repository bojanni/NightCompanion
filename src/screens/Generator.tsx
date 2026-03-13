import { useEffect, useState } from 'react'
import PromptBuilder from './PromptBuilder'

const DEFAULT_GREYLIST = ['jellyfish', 'neon', 'cyber']
const GREYLIST_SUGGESTIONS = [
  'jellyfish',
  'neon',
  'cyber',
  'glowing',
  'futuristic',
  'holographic',
  'sci-fi',
  'chrome',
  'vaporwave',
  'laser',
]

type PresetOption = {
  presetName: string
  category: string
}

export default function Generator() {
  const [tab, setTab] = useState<'generator' | 'builder'>('generator')
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')
  const [greylistEnabled, setGreylistEnabled] = useState(true)
  const [greylistWords, setGreylistWords] = useState<string[]>(DEFAULT_GREYLIST)
  const [greylistInput, setGreylistInput] = useState('')

  const normalizeGreylistWord = (value: string) => value.trim().toLowerCase()

  const addGreylistWord = () => {
    const normalized = normalizeGreylistWord(greylistInput)
    if (!normalized) return
    if (greylistWords.includes(normalized)) {
      setGreylistInput('')
      return
    }

    setGreylistWords((prev) => [...prev, normalized])
    setGreylistInput('')
  }

  const removeGreylistWord = (word: string) => {
    setGreylistWords((prev) => prev.filter((item) => item !== word))
  }

  const handleClearAll = () => {
    setSelectedPreset('')
    setGeneratedPrompt('')
    setStatus(null)
    setSavedTitle('')
  }

  useEffect(() => {
    let ignore = false

    async function loadPresets() {
      const result = await window.electronAPI.nightcafePresets.list()
      if (ignore || result.error || !result.data) return

      setPresetOptions(result.data)
    }

    loadPresets()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('generatorGreylist')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as { enabled?: boolean; words?: string[] }
      const words = (parsed.words ?? [])
        .map((word) => normalizeGreylistWord(word))
        .filter((word) => word.length > 0)

      setGreylistEnabled(parsed.enabled ?? true)
      setGreylistWords(words.length > 0 ? Array.from(new Set(words)) : DEFAULT_GREYLIST)
    } catch {
      setGreylistEnabled(true)
      setGreylistWords(DEFAULT_GREYLIST)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('generatorGreylist', JSON.stringify({
        enabled: greylistEnabled,
        words: greylistWords,
      }))
    } catch (e) {
      console.error('Failed to save greylist to localStorage:', e)
    }
  }, [greylistEnabled, greylistWords])

  const handleGenerate = async () => {
    setStatus(null)
    setLoading(true)

    try {
      const result = await window.electronAPI.generator.magicRandom({
        presetName: selectedPreset || undefined,
        greylistEnabled,
        greylistWords,
      })

      if (!result) {
        setStatus('Error: Generator returned an empty response.')
        return
      }

      if (result.error) {
        setStatus(result.error)
        return
      }

      if (!result.data) {
        setStatus('Error: Generator returned no data.')
        return
      }

      setGeneratedPrompt(result.data.prompt)
      if (!savedTitle.trim()) {
        const stamp = new Date().toLocaleString()
        setSavedTitle(`Magic Prompt ${stamp}`)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to generate prompt.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedPrompt) return
    await navigator.clipboard.writeText(generatedPrompt)
    setStatus('Prompt copied to clipboard.')
  }

  const handleImprove = async () => {
    if (!generatedPrompt.trim()) {
      setStatus('Nothing to improve yet. Generate (or paste) a prompt first.')
      return
    }

    setStatus(null)
    setImproving(true)

    try {
      const result = await window.electronAPI.generator.improvePrompt({
        prompt: generatedPrompt,
      })

      if (!result) {
        setStatus('Error: Improver returned an empty response.')
        return
      }

      if (result.error) {
        setStatus(result.error)
        return
      }

      if (!result.data?.prompt) {
        setStatus('Error: Improver returned no data.')
        return
      }

      setGeneratedPrompt(result.data.prompt)
      if (!savedTitle.trim()) {
        const stamp = new Date().toLocaleString()
        setSavedTitle(`Improved Prompt ${stamp}`)
      }
      setStatus('Prompt improved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to improve prompt.')
    } finally {
      setImproving(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!generatedPrompt || !savedTitle.trim()) return

    const result = await window.electronAPI.prompts.create({
      title: savedTitle.trim(),
      promptText: generatedPrompt,
      negativePrompt: '',
      model: '',
      notes: 'Generated with Magic Random (AI)',
      tags: ['ai-random'],
    })

    if (result.error) {
      setStatus(`Error: ${result.error}`)
      return
    }

    setStatus('Saved to Prompt Library.')
  }

  const greylistSuggestions = GREYLIST_SUGGESTIONS.filter((item) => {
    const normalizedInput = normalizeGreylistWord(greylistInput)
    if (!normalizedInput) return !greylistWords.includes(item)
    return item.includes(normalizedInput) && !greylistWords.includes(item)
  })

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Generator</h1>
        <p className="text-sm text-night-400 mt-1">Generate prompts with AI or build them modularly in one place.</p>

        <div className="mt-5 inline-flex rounded-xl border border-night-600/50 bg-night-900/40 p-1">
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'generator' ? 'bg-glow-purple text-white' : 'text-night-300 hover:text-white hover:bg-night-800'}`}
            onClick={() => setTab('generator')}
          >
            Magic Random
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'builder' ? 'bg-glow-purple text-white' : 'text-night-300 hover:text-white hover:bg-night-800'}`}
            onClick={() => setTab('builder')}
          >
            Prompt Builder
          </button>
        </div>

        {/* Greylist - visible for both Magic Random and Prompt Builder tabs */}
        <div className="card mt-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Greylist</h2>
              <p className="text-xs text-night-400 mt-1">Words the AI should try to avoid or use with low probability.</p>
            </div>
            <label className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors ${greylistEnabled ? 'border-green-500/60 bg-green-500/20 text-green-300' : 'border-night-600 bg-night-800 text-night-300'}`}>
              <input
                type="checkbox"
                checked={greylistEnabled}
                onChange={(e) => setGreylistEnabled(e.target.checked)}
                className="mr-1 h-3.5 w-3.5 accent-green-500"
                aria-label="Enable greylist"
              />
              {greylistEnabled ? 'On' : 'Off'}
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <input
                type="text"
                list="generator-greylist-suggestions"
                value={greylistInput}
                onChange={(e) => setGreylistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  addGreylistWord()
                }}
                className="input"
                placeholder="Add word to greylist"
              />
              <datalist id="generator-greylist-suggestions">
                {greylistSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <button type="button" onClick={addGreylistWord} className="btn-ghost border border-night-600/50">
              Add
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {greylistWords.length === 0 ? (
              <p className="text-xs text-night-400">No greylist words added.</p>
            ) : (
              greylistWords.map((word) => (
                <span key={word} className="tag-removable">
                  {word}
                  <button
                    type="button"
                    onClick={() => removeGreylistWord(word)}
                    className="rounded px-1 text-night-300 hover:bg-night-700 hover:text-white"
                    aria-label={`Remove ${word}`}
                  >
                    x
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {tab === 'generator' ? (
          <>
            <div className="card mt-6 p-5">
              <div>
                <label htmlFor="generator-preset" className="label">NightCafe Preset</label>
                <select
                  id="generator-preset"
                  aria-label="NightCafe Preset"
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="input"
                >
                  <option value="">Geen preset</option>
                  {presetOptions.map((preset) => (
                    <option key={preset.presetName} value={preset.presetName}>
                      {preset.presetName}{preset.category ? ` (${preset.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={handleGenerate} disabled={loading} className="btn-primary">
                  {loading ? 'Generating...' : 'Magic Random (AI)'}
                </button>
                <button onClick={handleCopy} disabled={!generatedPrompt} className="btn-ghost border border-night-600/50">
                  Copy Prompt
                </button>
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={!generatedPrompt.trim() || loading || improving}
                  className="btn-ghost border border-night-600/50"
                >
                  {improving ? 'Improving...' : 'Improve Prompt'}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={loading}
                  className="btn-ghost border border-night-600/50"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="card mt-5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Generated Prompt</h2>
                <span className="text-[10px] text-night-500">{generatedPrompt.length} characters</span>
              </div>

              <textarea
                className="textarea mt-3 min-h-48"
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                placeholder="Your generated prompt will appear here."
              />

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={savedTitle}
                  onChange={(e) => setSavedTitle(e.target.value)}
                  className="input"
                  placeholder="Title to save in Prompt Library"
                />
                <button
                  onClick={handleSaveToLibrary}
                  disabled={!generatedPrompt || !savedTitle.trim()}
                  className="btn-ghost border border-night-600/50"
                >
                  Save to Library
                </button>
              </div>

              {status && (
                <p className={`mt-3 text-xs ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {status}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="mt-1 card border-night-700/50">
            <PromptBuilder embedded greylistEnabled={greylistEnabled} greylistWords={greylistWords} />
          </div>
        )}
      </div>
    </div>
  )
}
