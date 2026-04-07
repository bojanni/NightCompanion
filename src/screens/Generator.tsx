import { useEffect, useRef, useState } from 'react'
import PromptBuilder from './PromptBuilder'
import { PageContainer } from '../components/PageContainer'
import QuickstartPanel from '../components/generator/QuickstartPanel'
import ImprovementSection from '../components/generator/ImprovementSection'
import ModelAdvisorCard from '../components/generator/ModelAdvisorCard'
import TitleSaveSection from '../components/generator/TitleSaveSection'
import GreylistCard from '../components/generator/GreylistCard'
import { usePromptImprovement } from '../hooks/usePromptImprovement'

const DEFAULT_GREYLIST = ['jellyfish', 'neon', 'cyber']
const DEFAULT_TITLE_MAX_LENGTH = 140
const DEFAULT_MAX_WORDS = 70
const MAX_ALLOWED_WORDS = 100
const GENERATOR_UI_STATE_KEY = 'generatorUiState'

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
  const [styleProfiles, setStyleProfiles] = useState<Array<{ id: number; name: string; basePromptSnippet?: string; commonNegativePrompts?: string }>>([])
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<number | ''>('')
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX_WORDS)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [negativeImprovementDiff, setNegativeImprovementDiff] = useState<{ originalPrompt: string; improvedPrompt: string } | null>(null)
  const [negativePromptViewTab, setNegativePromptViewTab] = useState<NegativePromptViewTab>('final')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const promptImprovement = usePromptImprovement()
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
  const [greylistLoaded, setGreylistLoaded] = useState(false)
  const [uiStateLoaded, setUiStateLoaded] = useState(false)
  const uiStateSaveTimeoutRef = useRef<number | null>(null)

  const [quickStartIdea, setQuickStartIdea] = useState('')
  const [quickStartCreativity, setQuickStartCreativity] = useState<CreativityLevel>('balanced')
  const [magicRandomCreativity, setMagicRandomCreativity] = useState<CreativityLevel>('balanced')
  const [quickStartCharacterId, setQuickStartCharacterId] = useState<string | null>(null)
  const [quickStartCharacterList, setQuickStartCharacterList] = useState<Array<{ id: string; name: string; description: string }>>([]) 
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
      promptImprovement.clearDiff()
      setNegativeImprovementDiff(null)
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

  const handleMagicRandom = async () => {
    await handleGenerate()
  }

  const handleAdviseModel = () => {
    void requestModelAdvice('ai', generatedPrompt)
  }

  const handleCopyPrompt = async () => {
    await handleCopy()
  }

  const handleCopyNegativePrompt = async () => {
    if (!negativePrompt) return
    await navigator.clipboard.writeText(negativePrompt)
    setStatus('Negative prompt copied to clipboard.')
  }

  const handleImprovePrompt = async () => {
    await handleImprove()
  }

  const handleImproveNegativePrompt = async () => {
    if (!negativePrompt.trim()) {
      setStatus('No negative prompt to improve.')
      return
    }

    setStatus(null)
    setImprovingNegative(true)

    try {
      const result = await window.electronAPI.generator.improvePrompt({
        prompt: negativePrompt,
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
      const previousPrompt = negativePrompt

      setNegativeImprovementDiff({
        originalPrompt: previousPrompt,
        improvedPrompt: nextPrompt,
      })
      setNegativePromptViewTab('diff')
      setStatus('Negative prompt improved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to improve negative prompt.')
    } finally {
      setImprovingNegative(false)
    }
  }

  const handleGenerateNegative = async () => {
    if (!generatedPrompt.trim()) {
      setStatus('Generate a prompt first before creating a negative prompt.')
      return
    }

    setStatus(null)
    setGeneratingNegative(true)

    try {
      // For now, we'll use the improve prompt endpoint as a placeholder
      // since generateNegative doesn't exist yet
      const result = await window.electronAPI.generator.improvePrompt({
        prompt: generatedPrompt,
      })

      if (!result) {
        setStatus('Error: Negative generator returned an empty response.')
        return
      }

      if (result.error) {
        setStatus(result.error)
        return
      }

      if (!result.data?.prompt) {
        setStatus('Error: Negative generator returned no data.')
        return
      }

      // Convert the improved prompt to act as a negative prompt
      setNegativePrompt(result.data.prompt)
      setNegativeImprovementDiff(null)
      setNegativePromptViewTab('final')
      setStatus('Negative prompt generated.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to generate negative prompt.')
    } finally {
      setGeneratingNegative(false)
    }
  }

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

    async function loadStyleProfiles() {
      const result = await window.electronAPI.styleProfiles.list()
      if (ignore || result.error || !result.data) return

      setStyleProfiles(result.data)
    }

    loadPresets()
    loadStyleProfiles()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const applyPersisted = (parsed: GeneratorPersistedState) => {
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
      promptImprovement.setImprovementDiff(parsed.improvementDiff ?? null)
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
      promptImprovement.setViewTab(nextPromptViewTab)
      const nextNegativePromptViewTab = parsed.negativePromptViewTab === 'diff' && parsed.negativeImprovementDiff ? 'diff' : 'final'
      setNegativePromptViewTab(nextNegativePromptViewTab)
    }

    async function loadUiState() {
      try {
        const settingsResult = await window.electronAPI.settings.getGeneratorUiState()
        if (!ignore && !settingsResult.error && settingsResult.data && Object.keys(settingsResult.data).length > 0) {
          applyPersisted(settingsResult.data)
          setUiStateLoaded(true)
          return
        }

        const legacy = localStorage.getItem(GENERATOR_UI_STATE_KEY)
        if (!legacy) {
          setUiStateLoaded(true)
          return
        }

        try {
          const parsed = JSON.parse(legacy) as GeneratorPersistedState
          applyPersisted(parsed)
          await window.electronAPI.settings.saveGeneratorUiState(parsed)
          localStorage.removeItem(GENERATOR_UI_STATE_KEY)
        } catch {
          localStorage.removeItem(GENERATOR_UI_STATE_KEY)
        }
      } finally {
        if (!ignore) setUiStateLoaded(true)
      }
    }

    void loadUiState()

    return () => {
      ignore = true
    }
  }, [promptImprovement.setImprovementDiff, promptImprovement.setViewTab])

  useEffect(() => {
    if (!uiStateLoaded) return

    const buildNextState = (): GeneratorPersistedState => ({
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
      promptViewTab: promptImprovement.viewTab,
      improvementDiff: promptImprovement.improvementDiff,
      quickStartIdea,
      quickStartCreativity,
      magicRandomCreativity,
      quickStartCharacterId,
      budgetMode,
    })

    if (uiStateSaveTimeoutRef.current) {
      window.clearTimeout(uiStateSaveTimeoutRef.current)
    }

    uiStateSaveTimeoutRef.current = window.setTimeout(() => {
      const nextState = buildNextState()

      void window.electronAPI.settings.saveGeneratorUiState(nextState)
    }, 500)

    return () => {
      if (uiStateSaveTimeoutRef.current) {
        window.clearTimeout(uiStateSaveTimeoutRef.current)
        const nextState = buildNextState()
        void window.electronAPI.settings.saveGeneratorUiState(nextState)
      }
    }
  }, [
    uiStateLoaded,
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
    promptImprovement.viewTab,
    promptImprovement.improvementDiff,
    quickStartIdea,
    quickStartCreativity,
    magicRandomCreativity,
    quickStartCharacterId,
    budgetMode,
  ])

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
      } finally {
        if (!ignore) setGreylistLoaded(true)
      }
    }

    loadGreylist()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function saveGreylist() {
      if (ignore) return
      if (!greylistLoaded) return
      try {
        await window.electronAPI.greylist.save({ words: greylistWords })
      } catch (error) {
        console.error('Failed to save greylist to database:', error)
      }
    }

    saveGreylist()

    return () => {
      ignore = true
    }
  }, [greylistLoaded, greylistWords])

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
      promptImprovement.clearDiff()
      setNegativeImprovementDiff(null)
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

    try {
      const previousPrompt = generatedPrompt

      const improved = await promptImprovement.handleImprove(generatedPrompt)
      if (!improved) {
        setStatus('Error: Failed to improve prompt.')
        return
      }

      setSavedTitle((currentTitle) => {
        const trimmedTitle = currentTitle.trim()
        if (trimmedTitle && trimmedTitle !== buildDefaultTitle(previousPrompt)) return currentTitle
        return buildDefaultTitle(improved)
      })
      setStatus('Prompt improved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to improve prompt.')
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

    const nextPromptText = promptImprovement.improvementDiff?.improvedPrompt ?? generatedPrompt
    const nextOriginalPrompt = promptImprovement.improvementDiff?.originalPrompt ?? nextPromptText

    // Check for duplicates
    const existingPromptsResult = await window.electronAPI.prompts.list()
    if (existingPromptsResult.error || !existingPromptsResult.data) {
      setStatus('Error: Failed to check for duplicates.')
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

        {tab === 'generator' ? (
          <>
            {/* Greylist */}
            <div className="mt-5">
              <GreylistCard
                greylistEnabled={greylistEnabled}
                setGreylistEnabled={setGreylistEnabled}
                greylistWords={greylistWords}
                setGreylistWords={setGreylistWords}
                greylistInput={greylistInput}
                setGreylistInput={setGreylistInput}
                addGreylistWord={addGreylistWord}
                removeGreylistWord={removeGreylistWord}
              />
            </div>

            {/* Input Cards - side by side */}
            <div className="mt-5">
              <QuickstartPanel
                quickStartIdea={quickStartIdea}
                setQuickStartIdea={setQuickStartIdea}
                quickStartCreativity={quickStartCreativity}
                setQuickStartCreativity={setQuickStartCreativity}
                quickStartCharacterId={quickStartCharacterId}
                setQuickStartCharacterId={setQuickStartCharacterId}
                quickStartCharacterList={quickStartCharacterList}
                magicRandomCreativity={magicRandomCreativity}
                setMagicRandomCreativity={setMagicRandomCreativity}
                selectedPreset={selectedPreset}
                setSelectedPreset={setSelectedPreset}
                presetOptions={presetOptions}
                maxWords={maxWords}
                setMaxWords={setMaxWords}
                generatedPrompt={generatedPrompt}
                setGeneratedPrompt={setGeneratedPrompt}
                negativePrompt={negativePrompt}
                setNegativePrompt={setNegativePrompt}
                greylistEnabled={greylistEnabled}
                greylistWords={greylistWords}
                setStatus={setStatus}
                handleQuickExpand={handleQuickExpand}
                handleMagicRandom={handleMagicRandom}
                handleGenerateNegative={handleGenerateNegative}
                expandingIdea={expandingIdea}
                loading={loading}
              />
            </div>

            {/* Improvement Section */}
            <ImprovementSection
              generatedPrompt={generatedPrompt}
              setGeneratedPrompt={setGeneratedPrompt}
              negativePrompt={negativePrompt}
              improvementDiff={promptImprovement.improvementDiff}
              viewTab={promptImprovement.viewTab}
              setViewTab={promptImprovement.setViewTab}
              isImproving={promptImprovement.isImproving}
              handleImprove={handleImprovePrompt}
              negativeImprovementDiff={negativeImprovementDiff}
              negativePromptViewTab={negativePromptViewTab}
              setNegativePromptViewTab={setNegativePromptViewTab}
              handleImproveNegativePrompt={handleImproveNegativePrompt}
              handleCopyPrompt={handleCopyPrompt}
              handleCopyNegativePrompt={handleCopyNegativePrompt}
              loading={loading}
              generatingNegative={generatingNegative}
              improvingNegative={improvingNegative}
              savedTitle={savedTitle}
              handleSaveToLibrary={handleSaveToLibrary}
              supportsNegativePrompt={supportsNegativePrompt}
            />

            {/* Title and Save Section */}
            <TitleSaveSection
              savedTitle={savedTitle}
              setSavedTitle={setSavedTitle}
              generatedPrompt={generatedPrompt}
              negativePrompt={negativePrompt}
              recommendedModel={recommendedModel}
              generatingTitle={generatingTitle}
              setGeneratingTitle={setGeneratingTitle}
              handleGenerateTitle={handleGenerateTitle}
              handleSaveToLibrary={handleSaveToLibrary}
              loading={loading}
              improving={promptImprovement.isImproving}
              generatingNegative={generatingNegative}
              improvingNegative={improvingNegative}
            />

            {/* Model Advisor Card */}
            <ModelAdvisorCard
              generatedPrompt={generatedPrompt}
              recommendedModel={recommendedModel}
              setRecommendedModel={setRecommendedModel}
              recommendedModelReason={recommendedModelReason}
              setRecommendedModelReason={setRecommendedModelReason}
              recommendedModelMode={recommendedModelMode}
              setRecommendedModelMode={setRecommendedModelMode}
              advisorBestValue={advisorBestValue}
              setAdvisorBestValue={setAdvisorBestValue}
              advisorFastest={advisorFastest}
              setAdvisorFastest={setAdvisorFastest}
              supportsNegativePrompt={supportsNegativePrompt}
              setSupportsNegativePrompt={setSupportsNegativePrompt}
              budgetMode={budgetMode}
              setBudgetMode={setBudgetMode}
              advisingAi={advisingAi}
              setAdvisingAi={setAdvisingAi}
              handleAdviseModel={handleAdviseModel}
              loading={loading}
              improving={promptImprovement.isImproving}
              generatingNegative={generatingNegative}
              improvingNegative={improvingNegative}
            />

            {/* Status */}
            {status && (
              <p className={`mt-3 text-xs ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {status}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
              {/* LEFT: Greylist Card */}
              <div className="mb-4 flex flex-col h-full">
                <GreylistCard
                  greylistEnabled={greylistEnabled}
                  setGreylistEnabled={setGreylistEnabled}
                  greylistWords={greylistWords}
                  setGreylistWords={setGreylistWords}
                  greylistInput={greylistInput}
                  setGreylistInput={setGreylistInput}
                  addGreylistWord={addGreylistWord}
                  removeGreylistWord={removeGreylistWord}
                />
                {/* Max Words Slider */}
                <div className="card p-5 mt-4">
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
              </div>
              
              {/* RIGHT: Settings Panel */}
              <div className="card p-5 mb-4 flex flex-col h-full">
                <div className="grid grid-cols-1 gap-4">
                  {/* Preset and Style Profile Row */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Preset</p>
                      <select
                        value={selectedPreset}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        className="input mt-2 w-full text-xs"
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
                      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Style profile</p>
                      <select
                        value={selectedStyleProfileId}
                        onChange={(e) => setSelectedStyleProfileId(e.target.value ? Number(e.target.value) : '')}
                        className="input mt-2 w-full text-xs"
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
                  </div>

                  {/* Creativity Only */}
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
            </div>
            <div className="mt-1 card border-slate-800/50">
              <PromptBuilder 
                embedded 
                greylistEnabled={greylistEnabled} 
                greylistWords={greylistWords} 
                maxWords={maxWords} 
                creativity={magicRandomCreativity}
                styleProfiles={styleProfiles}
                selectedStyleProfileId={selectedStyleProfileId}
                setSelectedStyleProfileId={setSelectedStyleProfileId}
              />
            </div>
          </>
        )}
      </PageContainer>
    </div>
  )
}





