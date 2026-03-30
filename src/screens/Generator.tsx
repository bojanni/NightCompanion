import { useEffect, useState } from 'react'
import { User, Sparkles, Minus, Copy, Edit3, Save, ArrowRight, Wand2 } from 'lucide-react'
import PromptBuilder from './PromptBuilder'
import PromptDiffView from '../components/PromptDiffView'
import PromptPreview from '../components/PromptPreview'
import { PageContainer } from '../components/PageContainer'

const DEFAULT_GREYLIST = ['jellyfish', 'neon', 'cyber']
const DEFAULT_TITLE_MAX_LENGTH = 140
const DEFAULT_MAX_WORDS = 70
const MAX_ALLOWED_WORDS = 100
const GENERATOR_UI_STATE_KEY = 'generatorUiState'
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
  presetPrompt?: string
}

type PromptViewTab = 'final' | 'diff'
type NegativePromptViewTab = 'final' | 'diff'
type CreativityLevel = 'focused' | 'balanced' | 'wild'
type BudgetMode = 'cheap' | 'balanced' | 'premium'

type GeneratorPersistedState = {
  tab?: 'generator' | 'builder'
  selectedPreset?: string
  maxWords?: number
  generatedPrompt?: string
  negativePrompt?: string
  negativePromptViewTab?: NegativePromptViewTab
  negativeImprovementDiff?: {
    originalPrompt: string
    improvedPrompt: string
  } | null
  savedTitle?: string
  promptViewTab?: PromptViewTab
  improvementDiff?: {
    originalPrompt: string
    improvedPrompt: string
  } | null
  quickStartIdea?: string
  quickStartCreativity?: CreativityLevel
  magicRandomCreativity?: CreativityLevel
  quickStartCharacterId?: string | null
  recommendedModel?: string
  recommendedModelReason?: string
  recommendedModelMode?: 'rule' | 'ai' | null
  advisorBestValue?: string
  advisorFastest?: string
  supportsNegativePrompt?: boolean | null
  budgetMode?: BudgetMode
}

function buildDefaultTitle(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DEFAULT_TITLE_MAX_LENGTH)
    .trim()
}

export default function Generator() {
  const [tab, setTab] = useState<'generator' | 'builder'>('generator')
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX_WORDS)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [improvementDiff, setImprovementDiff] = useState<{ originalPrompt: string; improvedPrompt: string } | null>(null)
  const [negativeImprovementDiff, setNegativeImprovementDiff] = useState<{ originalPrompt: string; improvedPrompt: string } | null>(null)
  const [promptViewTab, setPromptViewTab] = useState<PromptViewTab>('final')
  const [negativePromptViewTab, setNegativePromptViewTab] = useState<NegativePromptViewTab>('final')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [generatingNegative, setGeneratingNegative] = useState(false)
  const [improvingNegative, setImprovingNegative] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')
  const [recommendedModel, setRecommendedModel] = useState('')
  const [recommendedModelReason, setRecommendedModelReason] = useState('')
  const [recommendedModelMode, setRecommendedModelMode] = useState<'rule' | 'ai' | null>(null)
  const [advisorBestValue, setAdvisorBestValue] = useState('')
  const [advisorFastest, setAdvisorFastest] = useState('')
  const [supportsNegativePrompt, setSupportsNegativePrompt] = useState<boolean | null>(null)
  const [greylistEnabled, setGreylistEnabled] = useState(true)
  const [greylistWords, setGreylistWords] = useState<string[]>(DEFAULT_GREYLIST)
  const [greylistInput, setGreylistInput] = useState('')

  const [quickStartIdea, setQuickStartIdea] = useState('')
  const [quickStartCreativity, setQuickStartCreativity] = useState<CreativityLevel>('balanced')
  const [magicRandomCreativity, setMagicRandomCreativity] = useState<CreativityLevel>('balanced')
  const [quickStartCharacterId, setQuickStartCharacterId] = useState<string | null>(null)
  const [quickStartCharacterList, setQuickStartCharacterList] = useState<Array<{ id: string; name: string; description: string }>>([]) 
  const [showCharacterPicker, setShowCharacterPicker] = useState(false)
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('balanced')
  const [expandingIdea, setExpandingIdea] = useState(false)
  const [advisingAi, setAdvisingAi] = useState(false)

  const selectedPresetPrompt = presetOptions.find((preset) => preset.presetName === selectedPreset)?.presetPrompt?.trim() || ''
  const selectedPresetContext = selectedPresetPrompt
    ? `${selectedPreset}. Preset prompt guidance: ${selectedPresetPrompt}`
    : selectedPreset

  useEffect(() => {
    let ignore = false

    async function loadCharacters() {
      const result = await window.electronAPI.characters.list()
      if (ignore || result.error || !result.data) return
      setQuickStartCharacterList(
        result.data.map((c) => ({ id: c.id, name: c.name, description: c.description }))
      )
    }

    loadCharacters()

    return () => { ignore = true }
  }, [])

  const handleQuickExpand = async () => {
    const idea = quickStartIdea.trim()
    if (!idea) return

    setExpandingIdea(true)

    try {
      const characterForContext = quickStartCharacterId
        ? quickStartCharacterList.find((c) => c.id === quickStartCharacterId)
        : null

      const result = await window.electronAPI.generator.quickExpand({
        idea,
        presetName: selectedPresetContext || undefined,
        presetPrompt: selectedPresetPrompt || undefined,
        creativity: quickStartCreativity,
        character: characterForContext
          ? { name: characterForContext.name, description: characterForContext.description }
          : undefined,
      })

      if (!result || result.error || !result.data) {
        return
      }

      const nextPrompt = result.data.prompt
      setGeneratedPrompt(nextPrompt)
      setSavedTitle(buildDefaultTitle(nextPrompt))
      setImprovementDiff(null)
      setNegativeImprovementDiff(null)
      setPromptViewTab('final')
      setNegativePromptViewTab('final')
      setTab('generator')
      void requestModelAdvice('rule', nextPrompt)
    } catch (error) {
      console.error('Quick expand failed:', error)
    } finally {
      setExpandingIdea(false)
    }
  }

  const fetchModelSupport = async (modelName: string) => {
    const modelNameTrimmed = modelName.trim()
    if (!modelNameTrimmed) {
      setSupportsNegativePrompt(null)
      return
    }

    const supportResult = await window.electronAPI.nightcafeModels.getSupport({ modelName: modelNameTrimmed })
    if (supportResult.error || !supportResult.data) {
      setSupportsNegativePrompt(null)
      return
    }

    setSupportsNegativePrompt(supportResult.data.supportsNegativePrompt)
  }

  const requestModelAdvice = async (
    mode: 'rule' | 'ai',
    promptValue: string,
  ) => {
    const prompt = promptValue.trim()
    if (!prompt) return

    setAdvisingAi(true)

    try {
      const input = {
        prompt,
        mode,
        budgetMode,
      }

      console.groupCollapsed('[Get AI Advice] request')
      console.log('input:', input)

      const result = await window.electronAPI.generator.adviseModel(input)

      console.log('result:', result)
      console.groupEnd()

      if (!result || result.error || !result.data?.recommendation?.modelName) {
        return
      }

      setRecommendedModel(result.data.recommendation.modelName)
      setRecommendedModelReason(result.data.recommendation.explanation || '')
      setRecommendedModelMode(mode)
      setAdvisorBestValue(result.data.bestValue?.modelName || '')
      setAdvisorFastest(result.data.fastest?.modelName || '')
      await fetchModelSupport(result.data.recommendation.modelName)
    } catch (error) {
      console.groupCollapsed('[Get AI Advice] error')
      console.log('mode:', mode)
      console.log('budgetMode:', budgetMode)
      console.log('prompt:', prompt)
      console.error('Model advice failed:', error)
      console.groupEnd()
    } finally {
      setAdvisingAi(false)
    }
  }

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
    const stored = localStorage.getItem(GENERATOR_UI_STATE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as GeneratorPersistedState

      setTab(parsed.tab === 'builder' ? 'builder' : 'generator')
      setSelectedPreset(parsed.selectedPreset ?? '')
      const persistedMaxWords = Number.isFinite(parsed.maxWords)
        ? Math.max(1, Math.min(MAX_ALLOWED_WORDS, Math.floor(parsed.maxWords as number)))
        : DEFAULT_MAX_WORDS
      setMaxWords(persistedMaxWords)
      setGeneratedPrompt(parsed.generatedPrompt ?? '')
      setNegativePrompt(parsed.negativePrompt ?? '')
      setNegativeImprovementDiff(parsed.negativeImprovementDiff ?? null)
      setSavedTitle(parsed.savedTitle ?? '')
      setImprovementDiff(parsed.improvementDiff ?? null)
      setRecommendedModel(parsed.recommendedModel ?? '')
      setRecommendedModelReason(parsed.recommendedModelReason ?? '')
      setRecommendedModelMode(parsed.recommendedModelMode ?? null)
      setAdvisorBestValue(parsed.advisorBestValue ?? '')
      setAdvisorFastest(parsed.advisorFastest ?? '')
      setSupportsNegativePrompt(typeof parsed.supportsNegativePrompt === 'boolean' ? parsed.supportsNegativePrompt : null)
      setQuickStartIdea(parsed.quickStartIdea ?? '')
      setQuickStartCreativity(parsed.quickStartCreativity ?? 'balanced')
      setMagicRandomCreativity(parsed.magicRandomCreativity ?? 'balanced')
      setQuickStartCharacterId(parsed.quickStartCharacterId ?? null)
      setBudgetMode(parsed.budgetMode === 'cheap' ? 'cheap' : parsed.budgetMode === 'premium' ? 'premium' : 'balanced')

      const nextPromptViewTab = parsed.promptViewTab === 'diff' && parsed.improvementDiff ? 'diff' : 'final'
      setPromptViewTab(nextPromptViewTab)
      const nextNegativePromptViewTab = parsed.negativePromptViewTab === 'diff' && parsed.negativeImprovementDiff ? 'diff' : 'final'
      setNegativePromptViewTab(nextNegativePromptViewTab)
    } catch {
      setTab('generator')
      setSelectedPreset('')
      setMaxWords(DEFAULT_MAX_WORDS)
      setGeneratedPrompt('')
      setNegativePrompt('')
      setSavedTitle('')
      setRecommendedModel('')
      setRecommendedModelReason('')
      setRecommendedModelMode(null)
      setAdvisorBestValue('')
      setAdvisorFastest('')
      setSupportsNegativePrompt(null)
      setImprovementDiff(null)
      setNegativeImprovementDiff(null)
      setPromptViewTab('final')
      setNegativePromptViewTab('final')
      setQuickStartIdea('')
      setQuickStartCreativity('balanced')
      setMagicRandomCreativity('balanced')
      setQuickStartCharacterId(null)
      setBudgetMode('balanced')
    }

    // Check for initial prompt from PromptBuilder
    const initialPrompt = localStorage.getItem('generatorInitialPrompt')
    if (initialPrompt) {
      setQuickStartIdea(initialPrompt)
      setTab('generator')
      localStorage.removeItem('generatorInitialPrompt')
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(GENERATOR_UI_STATE_KEY, JSON.stringify({
        tab,
        selectedPreset,
        maxWords,
        generatedPrompt,
        negativePrompt,
        negativePromptViewTab,
        negativeImprovementDiff,
        savedTitle,
        recommendedModel,
        recommendedModelReason,
        recommendedModelMode,
        advisorBestValue,
        advisorFastest,
        supportsNegativePrompt,
        promptViewTab,
        improvementDiff,
        quickStartIdea,
        quickStartCreativity,
        magicRandomCreativity,
        quickStartCharacterId,
        budgetMode,
      } satisfies GeneratorPersistedState))
    } catch (e) {
      console.error('Failed to save generator state to localStorage:', e)
    }
  }, [tab, selectedPreset, maxWords, generatedPrompt, negativePrompt, negativePromptViewTab, negativeImprovementDiff, savedTitle, recommendedModel, recommendedModelReason, recommendedModelMode, advisorBestValue, advisorFastest, supportsNegativePrompt, promptViewTab, improvementDiff, quickStartIdea, quickStartCreativity, magicRandomCreativity, quickStartCharacterId, budgetMode])

  useEffect(() => {
    let ignore = false

    async function loadGreylist() {
      try {
        const result = await window.electronAPI.greylist.get()
        if (ignore || result.error || !result.data) {
          setGreylistWords(DEFAULT_GREYLIST)
          return
        }
        setGreylistWords(result.data.words || DEFAULT_GREYLIST)
      } catch (error) {
        console.error('Failed to load greylist:', error)
        setGreylistWords(DEFAULT_GREYLIST)
      }
    }

    loadGreylist()

    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false

    async function saveGreylist() {
      if (ignore) return
      try {
        await window.electronAPI.greylist.save({ words: greylistWords })
      } catch (error) {
        console.error('Failed to save greylist to database:', error)
      }
    }

    saveGreylist()

    return () => { ignore = true }
  }, [greylistWords])

  const handleGenerate = async () => {
    setStatus(null)
    setLoading(true)

    try {
      const characterForContext = quickStartCharacterId
        ? quickStartCharacterList.find((c) => c.id === quickStartCharacterId)
        : null

      const result = await window.electronAPI.generator.magicRandom({
        presetName: selectedPresetContext || undefined,
        presetPrompt: selectedPresetPrompt || undefined,
        maxWords,
        greylistEnabled,
        greylistWords,
        creativity: magicRandomCreativity,
        character: characterForContext
          ? { name: characterForContext.name, description: characterForContext.description }
          : undefined,
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

      const nextPrompt = result.data.prompt
      const previousPrompt = generatedPrompt

      setGeneratedPrompt(nextPrompt)
      setImprovementDiff(null)
      setNegativeImprovementDiff(null)
      setPromptViewTab('final')
      setNegativePromptViewTab('final')
      setSavedTitle((currentTitle) => {
        const trimmedTitle = currentTitle.trim()
        if (trimmedTitle && trimmedTitle !== buildDefaultTitle(previousPrompt)) return currentTitle
        return buildDefaultTitle(nextPrompt)
      })
      void requestModelAdvice('rule', nextPrompt)
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

      const nextPrompt = result.data.prompt
      const previousPrompt = generatedPrompt

      setGeneratedPrompt(nextPrompt)
      setImprovementDiff({
        originalPrompt: previousPrompt,
        improvedPrompt: nextPrompt,
      })
      setPromptViewTab('diff')
      setSavedTitle((currentTitle) => {
        const trimmedTitle = currentTitle.trim()
        if (trimmedTitle && trimmedTitle !== buildDefaultTitle(previousPrompt)) return currentTitle
        return buildDefaultTitle(nextPrompt)
      })
      setStatus('Prompt improved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to improve prompt.')
    } finally {
      setImproving(false)
    }
  }

  const handleGenerateTitle = async () => {
    if (!generatedPrompt.trim()) {
      setStatus('Generate or paste a prompt before asking AI for a title.')
      return
    }

    setStatus(null)
    setGeneratingTitle(true)

    try {
      const result = await window.electronAPI.generator.generateTitle({
        prompt: generatedPrompt,
      })

      if (!result) {
        setStatus('Error: Title generator returned an empty response.')
        return
      }

      if (result.error) {
        setStatus(result.error)
        return
      }

      if (!result.data?.title) {
        setStatus('Error: Title generator returned no data.')
        return
      }

      setSavedTitle(result.data.title)
      setStatus('AI title generated.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to generate title.')
    } finally {
      setGeneratingTitle(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!generatedPrompt || !savedTitle.trim()) return

    // Check for duplicates
    const existingPromptsResult = await window.electronAPI.prompts.list()
    if (existingPromptsResult.error || !existingPromptsResult.data) {
      setStatus('Error: Failed to check for duplicates.')
      return
    }

    const duplicate = existingPromptsResult.data.find(
      prompt => 
        prompt.promptText.trim() === generatedPrompt.trim() && 
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
      promptText: generatedPrompt,
      negativePrompt: negativePrompt.trim(),
      model: recommendedModel.trim(),
      suggestedModel: recommendedModel.trim(),
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

  const greylistCard = (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Greylist</h2>
          <p className="text-xs text-slate-500 mt-1">Words the AI should try to avoid or use with low probability.</p>
        </div>
        <label className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors ${greylistEnabled ? 'border-green-500/60 bg-green-500/20 text-green-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
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
        <button type="button" onClick={addGreylistWord} className="btn-ghost border border-slate-700/50">
          Add
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {greylistWords.length === 0 ? (
          <p className="text-xs text-slate-500">No greylist words added.</p>
        ) : (
          greylistWords.map((word) => (
            <span key={word} className="tag-removable">
              {word}
              <button
                type="button"
                onClick={() => removeGreylistWord(word)}
                className="rounded px-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label={`Remove ${word}`}
              >
                x
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  )

  const showNegativePromptControls = supportsNegativePrompt !== false

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <PageContainer>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Generator</h1>
        <p className="text-sm text-slate-500 mt-1">Generate prompts with AI or build them modularly in one place.</p>

        <div className="mt-5 inline-flex rounded-xl border border-slate-700/50 bg-slate-900/40 p-1">
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'generator' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            onClick={() => setTab('generator')}
          >
            Quickstart
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'builder' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            onClick={() => setTab('builder')}
          >
            Prompt Builder
          </button>
        </div>

        <div className="mt-5">
          <PromptPreview
            promptText={generatedPrompt || quickStartIdea}
            negativePrompt={negativePrompt}
            maxWords={maxWords}
            greylistWords={greylistEnabled ? greylistWords : []}
            model={selectedPreset ? `NightCafe preset: ${selectedPreset}` : 'Magic Random AI'}
          />
        </div>

        {tab === 'generator' ? (
          <>
            {/* Greylist */}
            <div className="mt-5">
              {greylistCard}
            </div>

            {/* Input Cards - side by side */}
            <div className="mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
              {/* LEFT: Magic Quickstart card */}
              <div className="card p-5 h-full flex flex-col">
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
                      onClick={() => setShowCharacterPicker((v) => !v)}
                      className={`btn-ghost border text-xs flex items-center gap-1.5 ${quickStartCharacterId ? 'border-teal-500/60 text-teal-300' : 'border-slate-700/50'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {quickStartCharacterId
                        ? (quickStartCharacterList.find((c) => c.id === quickStartCharacterId)?.name ?? 'Character')
                        : 'Add Character'}
                    </button>
                    {showCharacterPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCharacterPicker(false)} />
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-slate-700/50 bg-slate-900 p-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => { setQuickStartCharacterId(null); setShowCharacterPicker(false) }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                          >
                            No character
                          </button>
                          {quickStartCharacterList.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setQuickStartCharacterId(c.id); setShowCharacterPicker(false) }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg ${quickStartCharacterId === c.id ? 'bg-teal-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
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
              </div>

              {/* RIGHT: Magic Random AI controls */}
              <div className="card p-5 h-full flex flex-col border-glow-amber/25 bg-gradient-to-br from-night-900 via-night-900 to-glow-amber/5">
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
                      onClick={() => setShowCharacterPicker((v) => !v)}
                      className={`btn-ghost border text-xs flex items-center gap-1.5 ${quickStartCharacterId ? 'border-glow-amber/60 text-glow-amber' : 'border-slate-700/50'}`}
                    >
                      <User className="w-3.5 h-3.5" />
                      {quickStartCharacterId
                        ? (quickStartCharacterList.find((c) => c.id === quickStartCharacterId)?.name ?? 'Character')
                        : 'Add Character'}
                    </button>
                    {showCharacterPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowCharacterPicker(false)} />
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-slate-700/50 bg-slate-900 p-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => { setQuickStartCharacterId(null); setShowCharacterPicker(false) }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                          >
                            No character
                          </button>
                          {quickStartCharacterList.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setQuickStartCharacterId(c.id); setShowCharacterPicker(false) }}
                              className={`w-full text-left px-3 py-2 text-xs rounded-lg ${quickStartCharacterId === c.id ? 'bg-glow-amber text-white' : 'text-slate-300 hover:bg-slate-800'}`}
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
                    className="w-full bg-transparent px-4 py-4 text-sm text-slate-300 placeholder-night-500 resize-none min-h-36 focus:outline-none"
                    placeholder="Generated prompt will appear here."
                  />
                </div>

                <div className="mt-auto pt-4 flex flex-wrap justify-end gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? 'Generating...' : 'Magic Random (AI)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Generated Output Card */}
            <div className="card mt-5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Generated Prompt</h2>
                <span className="text-[10px] text-slate-500">{generatedPrompt.length} characters</span>
              </div>

              <textarea
                className="textarea mt-3 min-h-32"
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                placeholder="Your generated prompt will appear here."
              />

              {/* Compact Action Buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!generatedPrompt}
                  className="btn-compact-ghost"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Prompt
                </button>
                <button
                  type="button"
                  disabled={!negativePrompt}
                  className="btn-compact-ghost"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Negative
                </button>
                <button
                  type="button"
                  className="btn-compact-ghost"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit in Manual
                </button>
                <button
                  onClick={handleSaveToLibrary}
                  disabled={!generatedPrompt || !savedTitle.trim() || generatingNegative || improvingNegative}
                  className="btn-save-library-main"
                >
                  <Save className="w-3.5 h-3.5" /> Save to Library
                </button>
                <button
                  type="button"
                  className="btn-compact-ghost ml-auto"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Guided Mode
                </button>
              </div>

              {/* Negative Prompt Section */}
              {showNegativePromptControls && negativePrompt && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Negative Prompt</h3>
                    <span className="text-[10px] text-slate-500">{negativePrompt.length} chars</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{negativePrompt}</p>
                </div>
              )}
            </div>

            {/* Suggested Model Section */}
            <div className="mt-4 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-glow-amber">Suggested Model</p>
                <button
                  type="button"
                  onClick={() => void requestModelAdvice('ai', generatedPrompt)}
                  disabled={!generatedPrompt.trim() || loading || improving || generatingNegative || improvingNegative || advisingAi}
                  className="btn-compact-teal"
                >
                  <Wand2 className="w-3.5 h-3.5" /> {advisingAi ? 'Getting AI Advice...' : 'Get AI Advice'}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500 mr-1">Budget:</span>
                {(['cheap', 'balanced', 'premium'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBudgetMode(mode)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${budgetMode === mode ? 'btn-compact-primary' : 'btn-compact-ghost'}`}
                  >
                    {mode === 'cheap' ? 'Goedkoop' : mode === 'balanced' ? 'Gebalanceerd' : 'Premium'}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Beste kwaliteit</span>
                <span className="text-2xl font-semibold text-white flex items-center gap-2">{recommendedModel || <Minus className="w-6 h-6 text-slate-500" />}</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{recommendedModelReason || 'Nog geen modeladvies beschikbaar. Genereer eerst een prompt.'}</p>
            </div>

            {/* Improve Prompt Section - Teal styled */}
            <div className="mt-4 card border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <p className="text-sm font-semibold text-teal-300">Verbeter Prompt</p>
                </div>
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={!generatedPrompt.trim() || loading || improving || generatingNegative || improvingNegative}
                  className="btn-compact-teal"
                >
                  {improving ? 'Improving...' : 'Improve Prompt'}
                </button>
              </div>

              {improvementDiff && (
                <div className="mt-4">
                  <div className="inline-flex rounded-lg border border-slate-700/50 bg-slate-900/40 p-1">
                    <button
                      type="button"
                      onClick={() => setPromptViewTab('diff')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${promptViewTab === 'diff' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      Diff View
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptViewTab('final')}
                      className={`px-3 py-1.5 rounded-md text-xs transition-colors ${promptViewTab === 'final' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      Final Result
                    </button>
                  </div>

                  {promptViewTab === 'diff' ? (
                    <PromptDiffView
                      originalPrompt={improvementDiff.originalPrompt}
                      improvedPrompt={improvementDiff.improvedPrompt}
                    />
                  ) : (
                    <textarea
                      className="textarea mt-3 min-h-32"
                      value={improvementDiff.improvedPrompt}
                      readOnly
                      placeholder="Improved prompt result"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Save Section */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={savedTitle}
                onChange={(e) => setSavedTitle(e.target.value)}
                className="input"
                placeholder="Title to save in Prompt Library"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateTitle}
                  disabled={!generatedPrompt.trim() || loading || improving || generatingNegative || improvingNegative || generatingTitle}
                  className="btn-compact-primary"
                >
                  {generatingTitle ? 'Generating title...' : 'Generate Title (AI)'}
                </button>
                <button
                  onClick={handleSaveToLibrary}
                  disabled={!generatedPrompt || !savedTitle.trim() || generatingNegative || improvingNegative}
                  className="btn-save-library-secondary"
                >
                  <Save className="w-3.5 h-3.5" /> Save to Library
                </button>
              </div>
            </div>

            {/* Status */}
            {status && (
              <p className={`mt-3 text-xs ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {status}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-5">
              {greylistCard}
            </div>
            <div className="mt-1 card border-slate-800/50">
              <PromptBuilder embedded greylistEnabled={greylistEnabled} greylistWords={greylistWords} maxWords={maxWords} onNavigate={() => setTab('generator')} />
            </div>
          </>
        )}
      </PageContainer>
    </div>
  )
}





