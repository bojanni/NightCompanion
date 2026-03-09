import { useState } from 'react'

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

export default function PromptBuilder() {
  const [parts, setParts] = useState<Part[]>(DEFAULT_PARTS)
  const [separator, setSeparator] = useState<', ' | '. ' | ' | '>( ', ')
  const [copied, setCopied] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const updatePart = (id: string, value: string) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)))
  }

  const builtPrompt = parts
    .map((p) => p.value.trim())
    .filter(Boolean)
    .join(separator)

  const handleCopy = async () => {
    if (!builtPrompt) return
    await navigator.clipboard.writeText(builtPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleSaveToLibrary = async () => {
    if (!builtPrompt || !savedTitle.trim()) return
    const result = await window.electronAPI.prompts.create({
      title: savedTitle.trim(),
      promptText: builtPrompt,
      negativePrompt: '',
      model: '',
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
    <div className="no-drag-region flex h-full">
      {/* Left: part inputs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-8 pb-5">
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
              >
                <option value=", ">comma</option>
                <option value=". ">period</option>
                <option value=" | ">pipe</option>
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
      <div className="w-80 flex-shrink-0 border-l border-night-700/50 flex flex-col bg-night-900/30">
        <div className="px-5 pt-8 pb-4 border-b border-night-700/50">
          <h2 className="text-sm font-semibold text-white mb-0.5">Built Prompt</h2>
          <p className="text-[10px] text-night-500">{builtPrompt.length} characters</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {builtPrompt ? (
            <p className="text-xs text-night-200 leading-relaxed font-mono whitespace-pre-wrap bg-night-800/50 rounded-xl p-4 border border-night-700/50">
              {builtPrompt}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl text-night-700 mb-3">⊕</span>
              <p className="text-xs text-night-600">Fill in the parts on the left to build your prompt.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-night-700/50 space-y-3">
          <button
            onClick={handleCopy}
            disabled={!builtPrompt}
            className={`w-full btn transition-all ${copied ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'btn-primary'}`}
          >
            {copied ? '✓ Copied!' : '⎘ Copy to clipboard'}
          </button>

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
              disabled={!builtPrompt || !savedTitle.trim()}
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
