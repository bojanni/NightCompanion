import { useState } from 'react'
import { User, Sparkles } from 'lucide-react'

type CreativityLevel = 'focused' | 'balanced' | 'wild'

type PresetOption = {
  presetName: string
  category: string
  presetPrompt?: string
}

type QuickstartPanelProps = {
  quickStartIdea: string
  setQuickStartIdea: (value: string) => void
  quickStartCreativity: CreativityLevel
  setQuickStartCreativity: (value: CreativityLevel) => void
  quickstartCharacterId: string | null
  setQuickstartCharacterId: (value: string | null) => void
  magicRandomCharacterId: string | null
  setMagicRandomCharacterId: (value: string | null) => void
  quickStartCharacterList: Array<{ id: string; name: string; description: string }>
  magicRandomCreativity: CreativityLevel
  setMagicRandomCreativity: (value: CreativityLevel) => void
  quickstartPreset: string
  setQuickstartPreset: (value: string) => void
  magicRandomPreset: string
  setMagicRandomPreset: (value: string) => void
  presetOptions: PresetOption[]
  maxWords: number
  setMaxWords: (value: number) => void
  generatedPrompt: string
  setGeneratedPrompt: (value: string) => void
  negativePrompt: string
  setNegativePrompt: (value: string) => void
  greylistEnabled: boolean
  greylistWords: string[]
  setStatus: (value: string | null) => void
  handleQuickExpand: () => void
  handleMagicRandom: () => void
  handleGenerateNegative: () => void
  expandingIdea: boolean
  loading: boolean
  generationAiModel: string | null
  hasGenerationAiConfigured: boolean
}

const MAX_ALLOWED_WORDS = 100

export default function QuickstartPanel({
  quickStartIdea,
  setQuickStartIdea,
  quickStartCreativity,
  setQuickStartCreativity,
  quickstartCharacterId,
  setQuickstartCharacterId,
  magicRandomCharacterId,
  setMagicRandomCharacterId,
  quickStartCharacterList,
  magicRandomCreativity,
  setMagicRandomCreativity,
  quickstartPreset,
  setQuickstartPreset,
  magicRandomPreset,
  setMagicRandomPreset,
  presetOptions,
  maxWords,
  setMaxWords,
  generatedPrompt,
  handleQuickExpand,
  handleMagicRandom,
  expandingIdea,
  loading,
  generationAiModel,
  hasGenerationAiConfigured,
}: QuickstartPanelProps) {
  const [showQuickstartCharacterPicker, setShowQuickstartCharacterPicker] = useState(false)
  const [showMagicRandomCharacterPicker, setShowMagicRandomCharacterPicker] = useState(false)

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
      {/* LEFT: Magic Quickstart card */}
      <div className="card p-5 h-full flex flex-col relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/20">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Magic Quickstart</h2>
              <p className="text-xs text-slate-500 mt-0.5 min-h-8">Describe your idea and let AI do the heavy lifting</p>
            </div>
          </div>

          {/* Character picker */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowQuickstartCharacterPicker((v) => !v)}
              className={`btn-ghost border text-xs flex items-center gap-1.5 ${quickstartCharacterId ? 'border-teal-500/60 text-teal-300' : 'border-slate-700/50'}`}
            >
              <User className="w-3.5 h-3.5" />
              {quickstartCharacterId
                ? (quickStartCharacterList.find((c) => c.id === quickstartCharacterId)?.name ?? 'Character')
                : 'Add Character'}
            </button>
            {showQuickstartCharacterPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQuickstartCharacterPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-slate-700/50 bg-slate-900 p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => { setQuickstartCharacterId(null); setShowQuickstartCharacterPicker(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                  >
                    No character
                  </button>
                  {quickStartCharacterList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setQuickstartCharacterId(c.id); setShowQuickstartCharacterPicker(false) }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg ${quickstartCharacterId === c.id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {quickStartCharacterList.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-500">No characters found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Idea textarea */}
        <div className="mt-4 relative rounded-xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <textarea
            value={quickStartIdea}
            onChange={(e) => setQuickStartIdea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleQuickExpand()
              }
            }}
            className="w-full bg-transparent px-4 py-4 text-sm text-white placeholder-night-500 resize-none min-h-36 focus:outline-none"
            placeholder={'Describe your image idea in simple terms... (e.g. "A neon cyberpunk cityscape in the rain")'}
          />
        </div>

        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Max words</p>
              <span className="text-xs text-slate-400">{maxWords}</span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_ALLOWED_WORDS}
              value={maxWords}
              onChange={(e) => setMaxWords(Math.max(1, Math.min(MAX_ALLOWED_WORDS, Number(e.target.value))))}
              className="mt-2 w-full accent-teal-500"
              aria-label="Max words"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Preset</p>
              <select
                className="input mt-2"
                value={quickstartPreset}
                onChange={(e) => setQuickstartPreset(e.target.value)}
                aria-label="NightCafe preset"
              >
                <option value="">None</option>
                {Array.from(new Set(presetOptions.map((p) => p.category))).map((category) => (
                  <optgroup key={category} label={category}>
                    {presetOptions
                      .filter((p) => p.category === category)
                      .map((preset) => (
                        <option key={preset.presetName} value={preset.presetName}>
                          {preset.presetName}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Creativity</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['focused', 'balanced', 'wild'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setQuickStartCreativity(mode)}
                    className={quickStartCreativity === mode ? 'btn-compact-primary' : 'btn-compact-ghost'}
                  >
                    {mode === 'focused' ? 'Focused' : mode === 'balanced' ? 'Balanced' : 'Wild'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleQuickExpand}
            disabled={!quickStartIdea.trim() || expandingIdea}
            className="btn-ai-expansion"
          >
            <Sparkles className="w-4 h-4" /> {expandingIdea ? 'Expanding...' : 'Magic AI Expansion'}
          </button>
        </div>

        <div className="absolute left-5 bottom-5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${hasGenerationAiConfigured ? 'bg-emerald-500' : 'bg-red-500'}`}
              aria-hidden
            />
            {hasGenerationAiConfigured ? (
              <p className="text-xs text-night-100">
                AI:
                <span className="ml-1 text-night-400">{generationAiModel ?? 'Unknown'}</span>
              </p>
            ) : (
              <p className="text-xs text-night-400">Configure an AI model in Settings.</p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Magic Random AI controls */}
      <div className="card p-5 h-full flex flex-col relative border-glow-amber/25 bg-gradient-to-br from-night-900 via-night-900 to-glow-amber/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-glow-amber/20">
              <Sparkles className="w-4 h-4 text-glow-amber" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Magic Random</h2>
              <p className="text-xs text-slate-400 mt-0.5 min-h-8">Generate a surprise prompt with AI</p>
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowMagicRandomCharacterPicker((v) => !v)}
              className={`btn-ghost border text-xs flex items-center gap-1.5 ${magicRandomCharacterId ? 'border-glow-amber/60 text-glow-amber' : 'border-slate-700/50'}`}
            >
              <User className="w-3.5 h-3.5" />
              {magicRandomCharacterId
                ? (quickStartCharacterList.find((c) => c.id === magicRandomCharacterId)?.name ?? 'Character')
                : 'Add Character'}
            </button>
            {showMagicRandomCharacterPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMagicRandomCharacterPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-slate-700/50 bg-slate-900 p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => { setMagicRandomCharacterId(null); setShowMagicRandomCharacterPicker(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                  >
                    No character
                  </button>
                  {quickStartCharacterList.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setMagicRandomCharacterId(c.id); setShowMagicRandomCharacterPicker(false) }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg ${magicRandomCharacterId === c.id ? 'bg-glow-amber text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                  {quickStartCharacterList.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-500">No characters found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/60 overflow-hidden">
          <textarea
            value={generatedPrompt}
            readOnly
            aria-label="Generated prompt preview"
            rows={6}
            className="w-full bg-transparent px-4 py-4 text-sm text-slate-300 placeholder-night-500 resize-none min-h-44 overflow-y-auto focus:outline-none"
            placeholder="Generated prompt will appear here."
          />
        </div>

        <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Max words</p>
              <span className="text-xs text-slate-400">{maxWords}</span>
            </div>
            <input
              type="range"
              min={1}
              max={MAX_ALLOWED_WORDS}
              value={maxWords}
              onChange={(e) => setMaxWords(Math.max(1, Math.min(MAX_ALLOWED_WORDS, Number(e.target.value))))}
              className="mt-2 w-full accent-teal-500"
              aria-label="Max words"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Preset</p>
              <select
                className="input mt-2"
                value={magicRandomPreset}
                onChange={(e) => setMagicRandomPreset(e.target.value)}
                aria-label="NightCafe preset"
              >
                <option value="">None</option>
                {Array.from(new Set(presetOptions.map((p) => p.category))).map((category) => (
                  <optgroup key={category} label={category}>
                    {presetOptions
                      .filter((p) => p.category === category)
                      .map((preset) => (
                        <option key={preset.presetName} value={preset.presetName}>
                          {preset.presetName}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Creativity</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['focused', 'balanced', 'wild'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMagicRandomCreativity(mode)}
                    className={magicRandomCreativity === mode ? 'btn-compact-primary' : 'btn-compact-ghost'}
                  >
                    {mode === 'focused' ? 'Focused' : mode === 'balanced' ? 'Balanced' : 'Wild'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 flex flex-wrap justify-end gap-3">
          <button
            onClick={handleMagicRandom}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Generating...' : 'Magic Random (AI)'}
          </button>
        </div>

        <div className="absolute left-5 bottom-5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${hasGenerationAiConfigured ? 'bg-emerald-500' : 'bg-red-500'}`}
              aria-hidden
            />
            {hasGenerationAiConfigured ? (
              <p className="text-xs text-night-100">
                AI:
                <span className="ml-1 text-night-400">{generationAiModel ?? 'Unknown'}</span>
              </p>
            ) : (
              <p className="text-xs text-night-400">Configure an AI model in Settings.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
