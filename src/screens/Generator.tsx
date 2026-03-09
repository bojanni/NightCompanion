import { useState } from 'react'

export default function Generator() {
  const [theme, setTheme] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')

  const handleGenerate = async () => {
    setStatus(null)
    setLoading(true)

    const result = await window.electronAPI.generator.magicRandom({ theme: theme.trim() || undefined })
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
        <p className="text-sm text-night-400 mt-1">Create a fresh image prompt instantly using OpenRouter AI.</p>

        <div className="card mt-6 p-5">
          <label className="label">Theme (optional)</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="input"
            placeholder="e.g. cyberpunk city at dawn, mythic forest creatures, surreal architecture"
          />

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
      </div>
    </div>
  )
}
