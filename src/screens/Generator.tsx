import { useEffect, useState } from 'react'
import PromptBuilder from './PromptBuilder'

type PresetOption = {
  presetName: string
  category: string
}

export default function Generator() {
  const [tab, setTab] = useState<'generator' | 'builder'>('generator')
  const [theme, setTheme] = useState('')
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')

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

  const handleGenerate = async () => {
    setStatus(null)
    setLoading(true)

    const result = await window.electronAPI.generator.magicRandom({
      theme: theme.trim() || undefined,
      presetName: selectedPreset || undefined,
    })
    setLoading(false)

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
  }

  const handleCopy = async () => {
    if (!generatedPrompt) return
    await navigator.clipboard.writeText(generatedPrompt)
    setStatus('Prompt copied to clipboard.')
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

        {tab === 'generator' ? (
          <>
            <div className="card mt-6 p-5">
              <label className="label">Theme (optional)</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="input"
                placeholder="e.g. cyberpunk city at dawn, mythic forest creatures, surreal architecture"
              />

              <div className="mt-4">
                <label className="label">NightCafe Preset</label>
                <select
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
          <div className="mt-6 card border-night-700/50">
            <PromptBuilder embedded />
          </div>
        )}
      </div>
    </div>
  )
}
