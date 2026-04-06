import { useEffect, useMemo, useRef, useState } from 'react'
import PromptPreview from '../components/PromptPreview'
import PromptDiffView from '../components/PromptDiffView'
import { toast } from 'sonner'
import { usePromptImprovement } from '../hooks/usePromptImprovement'

type Part = {
  id: string
  label: string
  placeholder: string
  value: string
  maxWords?: number
}

const PROMPT_BUILDER_UI_STATE_KEY = 'promptBuilderUiState'

const DEFAULT_PARTS: Part[] = [
  { id: 'subject', label: 'Subject', placeholder: 'e.g. a lone wolf standing on a cliff', value: '', maxWords: 10 },
  { id: 'style', label: 'Art Style', placeholder: 'e.g. oil painting, impressionist, digital art', value: '', maxWords: 10 },
  { id: 'lighting', label: 'Lighting', placeholder: 'e.g. golden hour, dramatic rim lighting, moonlight', value: '', maxWords: 10 },
  { id: 'mood', label: 'Mood / Atmosphere', placeholder: 'e.g. ethereal, melancholic, dreamlike', value: '', maxWords: 5 },
  { id: 'artist', label: 'Artist References', placeholder: 'e.g. in the style of Alphonse Mucha, Greg Rutkowski', value: '', maxWords: 2 },
  { id: 'technical', label: 'Technical Details', placeholder: 'e.g. 8k, highly detailed, cinematic, trending on ArtStation', value: '', maxWords: 5 },
]

type PromptBuilderProps = {
  embedded?: boolean
  greylistEnabled?: boolean
  greylistWords?: string[]
  maxWords?: number
  creativity?: 'focused' | 'balanced' | 'wild'
  styleProfiles?: Array<{ id: number; name: string; basePromptSnippet?: string; commonNegativePrompts?: string }>
  selectedStyleProfileId?: number | ''
  setSelectedStyleProfileId?: (value: number | '') => void
}

type PromptBuilderPersistedState = {
  parts?: Array<{ id: string; value: string }>
  separator?: ', ' | '. ' | ' | '
  savedTitle?: string
  selectedStyleProfileId?: number | ''
  generatedPrompt?: string
  generatedPromptViewTab?: 'final' | 'diff'
  generatedImprovementDiff?: { originalPrompt: string; improvedPrompt: string } | null
}

export default function PromptBuilder({ 
  embedded = false, 
  greylistEnabled = true, 
  greylistWords = [], 
  maxWords = 70, 
  creativity = 'balanced',
  styleProfiles = [],
  selectedStyleProfileId = '',
  setSelectedStyleProfileId
}: PromptBuilderProps) {
  const [parts, setParts] = useState<Part[]>(DEFAULT_PARTS)
  const [separator, setSeparator] = useState<', ' | '. ' | ' | '>( ', ')
  const [savedTitle, setSavedTitle] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [generatingPartId, setGeneratingPartId] = useState<string | null>(null)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isFillingAll, setIsFillingAll] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const generatedPromptImprovement = usePromptImprovement()
  const [uiStateLoaded, setUiStateLoaded] = useState(false)
  const uiStateSaveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let ignore = false

    const applyPersisted = (parsed: PromptBuilderPersistedState) => {
      if (Array.isArray(parsed.parts)) {
        setParts((prev) => {
          const valueById = new Map(parsed.parts?.map((p) => [p.id, p.value] as const))
          return prev.map((p) => ({ ...p, value: valueById.get(p.id) ?? p.value }))
        })
      }

      if (parsed.separator === ', ' || parsed.separator === '. ' || parsed.separator === ' | ') {
        setSeparator(parsed.separator)
      }

      setSavedTitle(parsed.savedTitle ?? '')
      setSelectedStyleProfileId?.(parsed.selectedStyleProfileId ?? '')
      setGeneratedPrompt(parsed.generatedPrompt ?? '')
      generatedPromptImprovement.setImprovementDiff(parsed.generatedImprovementDiff ?? null)

      const nextTab = parsed.generatedPromptViewTab === 'diff' && parsed.generatedImprovementDiff ? 'diff' : 'final'
      generatedPromptImprovement.setViewTab(nextTab)
    }

    async function loadUiState() {
      try {
        const settingsResult = await window.electronAPI.settings.getPromptBuilderUiState()
        if (!ignore && !settingsResult.error && settingsResult.data && Object.keys(settingsResult.data).length > 0) {
          applyPersisted(settingsResult.data)
          setUiStateLoaded(true)
          return
        }

        const legacy = localStorage.getItem(PROMPT_BUILDER_UI_STATE_KEY)
        if (!legacy) {
          setUiStateLoaded(true)
          return
        }

        try {
          const parsed = JSON.parse(legacy) as PromptBuilderPersistedState
          applyPersisted(parsed)
          await window.electronAPI.settings.savePromptBuilderUiState(parsed)
          localStorage.removeItem(PROMPT_BUILDER_UI_STATE_KEY)
        } catch {
          localStorage.removeItem(PROMPT_BUILDER_UI_STATE_KEY)
        }
      } finally {
        if (!ignore) setUiStateLoaded(true)
      }
    }

    void loadUiState()

    return () => {
      ignore = true
    }
  }, [generatedPromptImprovement, setSelectedStyleProfileId])

  useEffect(() => {
    if (!uiStateLoaded) return

    if (uiStateSaveTimeoutRef.current) {
      window.clearTimeout(uiStateSaveTimeoutRef.current)
    }

    uiStateSaveTimeoutRef.current = window.setTimeout(() => {
      const nextState: PromptBuilderPersistedState = {
        parts: parts.map((p) => ({ id: p.id, value: p.value })),
        separator,
        savedTitle,
        selectedStyleProfileId,
        generatedPrompt,
        generatedPromptViewTab: generatedPromptImprovement.viewTab,
        generatedImprovementDiff: generatedPromptImprovement.improvementDiff,
      }

      void window.electronAPI.settings.savePromptBuilderUiState(nextState)
    }, 500)

    return () => {
      if (uiStateSaveTimeoutRef.current) {
        window.clearTimeout(uiStateSaveTimeoutRef.current)
      }
    }
  }, [
    uiStateLoaded,
    parts,
    separator,
    savedTitle,
    selectedStyleProfileId,
    generatedPrompt,
    generatedPromptImprovement.viewTab,
    generatedPromptImprovement.improvementDiff,
  ])

  const updatePart = (id: string, value: string) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)))
  }

  const handleGenerateTitle = async () => {
    const prompt = composedPrompt.trim()
    if (!prompt) {
      toast.warning('Build a prompt first.')
      return
    }

    setIsGeneratingTitle(true)

    try {
      const result = await window.electronAPI.generator.generateTitle({ prompt })
      if (result.error || !result.data?.title) {
        throw new Error(result.error || 'No title generated.')
      }

      setSavedTitle(result.data.title)
      toast.success('Title generated!')
    } catch (error) {
      toast.error(`Failed to generate title: ${String(error)}`)
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const generateForPart = async (partId: string) => {
    const part = parts.find((p) => p.id === partId)
    if (!part) return

    setGeneratingPartId(partId)

    // Map part.id to fieldType
    const fieldTypeMap: Record<string, 'subject' | 'style' | 'lighting' | 'mood' | 'artist' | 'technical'> = {
      subject: 'subject',
      style: 'style',
      lighting: 'lighting',
      mood: 'mood',
      artist: 'artist',
      technical: 'technical',
    }

    try {
      const result = await window.electronAPI.generator.simpleGenerate({
        fieldType: fieldTypeMap[part.id],
        maxWords: part.maxWords,
      })

      if (result.error || !result.data?.text) {
        throw new Error(result.error || 'No content generated.')
      }

      updatePart(partId, result.data.text)
    } catch (error) {
      toast.error(`Failed to generate ${part.label.toLowerCase()}: ${String(error)}`)
    } finally {
      setGeneratingPartId(null)
    }
  }

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true)

    try {
      const result = await window.electronAPI.generator.generatePromptFromFields({
        subject: parts.find(p => p.id === 'subject')?.value,
        style: parts.find(p => p.id === 'style')?.value,
        lighting: parts.find(p => p.id === 'lighting')?.value,
        mood: parts.find(p => p.id === 'mood')?.value,
        artist: parts.find(p => p.id === 'artist')?.value,
        technical: parts.find(p => p.id === 'technical')?.value,
        creativity,
        maxWords,
      })

      if (result.error || !result.data?.prompt) {
        throw new Error(result.error || 'No prompt generated.')
      }

      setGeneratedPrompt(result.data.prompt)
      toast.success('Prompt generated!')
    } catch (error) {
      toast.error(`Failed to generate prompt: ${String(error)}`)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleCopyGeneratedPrompt = async () => {
    const value = generatedPrompt.trim()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied!')
    } catch (error) {
      toast.error(`Failed to copy: ${String(error)}`)
    }
  }

  const handleImproveGeneratedPrompt = async () => {
    const value = generatedPrompt.trim()
    if (!value) return

    try {
      const improved = await generatedPromptImprovement.handleImprove(value)
      if (!improved) return
      setGeneratedPrompt(improved)
      toast.success('Prompt improved!')
    } catch (error) {
      toast.error(`Failed to improve prompt: ${String(error)}`)
    }
  }

  const handleFillAll = async () => {
    setIsFillingAll(true)

    try {
      const result = await window.electronAPI.generator.fillAllFields({
        subject: parts.find(p => p.id === 'subject')?.value,
        style: parts.find(p => p.id === 'style')?.value,
        lighting: parts.find(p => p.id === 'lighting')?.value,
        mood: parts.find(p => p.id === 'mood')?.value,
        artist: parts.find(p => p.id === 'artist')?.value,
        technical: parts.find(p => p.id === 'technical')?.value,
      })

      if (result.error || !result.data?.fields) {
        throw new Error(result.error || 'No fields generated.')
      }

      // Update each generated field
      const generatedFields = result.data.fields
      for (const [key, value] of Object.entries(generatedFields)) {
        if (value) {
          updatePart(key, value)
        }
      }

      const filledCount = Object.keys(generatedFields).length
      if (filledCount > 0) {
        toast.success(`Filled ${filledCount} empty field${filledCount === 1 ? '' : 's'}!`)
      } else {
        toast.info('All fields already have content.')
      }
    } catch (error) {
      toast.error(`Failed to fill fields: ${String(error)}`)
    } finally {
      setIsFillingAll(false)
    }
  }

  const builtPrompt = parts
    .map((p) => p.value.trim())
    .filter(Boolean)
    .join(separator)

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

    const nextPromptText = generatedPromptImprovement.improvementDiff?.improvedPrompt ?? composedPrompt
    const nextOriginalPrompt = generatedPromptImprovement.improvementDiff?.originalPrompt ?? nextPromptText

    // Check for duplicates
    const existingPromptsResult = await window.electronAPI.prompts.list()
    if (existingPromptsResult.error || !existingPromptsResult.data) {
      setSaveMsg('Error: Failed to check for duplicates.')
      return
    }

    const duplicate = existingPromptsResult.data.find(
      prompt =>
        prompt.promptText.trim() === nextPromptText.trim() &&
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
      promptText: nextPromptText,
      originalPrompt: nextOriginalPrompt,
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
    setGeneratedPrompt('')
    generatedPromptImprovement.clearDiff()
  }

  return (
    <div className={`${embedded ? 'flex min-h-[560px] flex-col lg:flex-row' : 'no-drag-region flex h-full flex-col lg:flex-row'}`}>
      {/* Left: part inputs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex items-center justify-between px-8 pb-5 ${embedded ? 'pt-5' : 'pt-8'}`}>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Prompt Builder</h1>
            <p className="text-sm text-slate-500 mt-0.5">Compose prompts from modular parts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Join with</span>
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
            <button onClick={handleClear} className="btn-ghost text-xs">Clear all</button>
            <button
              type="button"
              disabled={isFillingAll}
              onClick={() => void handleFillAll()}
              className="btn-primary text-xs"
              title="Fill all empty fields with AI-generated content"
            >
              {isFillingAll ? 'Filling…' : '✨ Magic Fill'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
          {parts.map((part) => (
            <div key={part.id}>
              <label className="label">{part.label}</label>
              <div className="flex gap-2">
                <textarea
                  value={part.value}
                  onChange={(e) => updatePart(part.id, e.target.value)}
                  className="textarea flex-1"
                  rows={2}
                  placeholder={part.placeholder}
                />
                <button
                  type="button"
                  disabled={generatingPartId === part.id}
                  onClick={() => void generateForPart(part.id)}
                  className="btn-compact-primary"
                  title={`Generate ${part.label.toLowerCase()}`}
                >
                  {generatingPartId === part.id ? '…' : '✨'}
                </button>
              </div>
            </div>
          ))}

          {/* Generate Complete Prompt Button */}
          <div className="pt-4 border-t border-slate-800/50">
            <button
              type="button"
              disabled={isGeneratingPrompt}
              onClick={() => void handleGeneratePrompt()}
              className="w-full btn-primary"
            >
              {isGeneratingPrompt ? 'Generating…' : '🎨 Generate Prompt'}
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Creates a complete NightCafe prompt. Empty fields will be filled by AI.
            </p>

            <div className="mt-4">
              <label className="label">Generated Prompt</label>
              {generatedPromptImprovement.improvementDiff ? (
                <div>
                  <div className="inline-flex rounded-lg border border-slate-700/50 bg-slate-900/40 p-1">
                    <button
                      type="button"
                      onClick={() => generatedPromptImprovement.setViewTab('diff')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${generatedPromptImprovement.viewTab === 'diff' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      Diff View
                    </button>
                    <button
                      type="button"
                      onClick={() => generatedPromptImprovement.setViewTab('final')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${generatedPromptImprovement.viewTab === 'final' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      Final Result
                    </button>
                  </div>

                  {generatedPromptImprovement.viewTab === 'diff' ? (
                    <div className="mt-3">
                      <PromptDiffView
                        originalPrompt={generatedPromptImprovement.improvementDiff.originalPrompt}
                        improvedPrompt={generatedPromptImprovement.improvementDiff.improvedPrompt}
                      />
                    </div>
                  ) : (
                    <textarea
                      className="textarea mt-3 w-full"
                      value={generatedPromptImprovement.improvementDiff.improvedPrompt}
                      readOnly
                      rows={4}
                      placeholder="Improved prompt result"
                    />
                  )}
                </div>
              ) : (
                <textarea
                  value={generatedPrompt}
                  onChange={(e) => {
                    setGeneratedPrompt(e.target.value)
                    if (generatedPromptImprovement.improvementDiff) {
                      generatedPromptImprovement.clearDiff()
                    }
                  }}
                  className="textarea w-full"
                  rows={4}
                  placeholder="Generate a prompt to see it here…"
                />
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!generatedPrompt.trim()}
                  onClick={() => void handleCopyGeneratedPrompt()}
                  className="btn-ghost text-xs"
                >
                  Copy
                </button>
                <button
                  type="button"
                  disabled={!generatedPrompt.trim() || generatedPromptImprovement.isImproving}
                  onClick={() => void handleImproveGeneratedPrompt()}
                  className="btn-compact-teal"
                >
                  {generatedPromptImprovement.isImproving ? 'Improving…' : 'Improve Prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: output panel */}
      <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800/50 flex flex-col bg-slate-900/30">
        <div className="px-5 pt-8 pb-4 border-b border-slate-800/50">
          <h2 className="text-sm font-semibold text-white mb-0.5">Built Prompt</h2>
          <p className="text-[10px] text-slate-300">{composedPrompt.length} characters</p>
        </div>

        {/* Greylist warning */}
        {detectedGreylistWords.length > 0 && (
          <div className="px-5 py-2 bg-glow-amber/10 border-b border-glow-amber/40">
            <p className="text-[10px] text-slate-500">
              Greylist words detected: {detectedGreylistWords.join(', ')}
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
          />
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-800/50 space-y-3">
          <div className="space-y-2">
            <input
              type="text"
              value={savedTitle}
              onChange={(e) => setSavedTitle(e.target.value)}
              className="input text-xs"
              placeholder="Title to save as…"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleGenerateTitle()}
                disabled={!composedPrompt.trim() || isGeneratingTitle}
                className="btn-ghost text-xs"
              >
                {isGeneratingTitle ? 'Generating…' : 'Generate Title (AI)'}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={!composedPrompt || !savedTitle.trim()}
                className="flex-1 btn-save-library-builder text-xs"
              >
                Save to Library
              </button>
            </div>
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
