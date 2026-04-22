import { useEffect, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import PromptBuilder from './PromptBuilder'
import { PageContainer } from '../components/PageContainer'
import QuickstartPanel from '../components/generator/QuickstartPanel'
import ImprovementSection from '../components/generator/ImprovementSection'
import ModelAdvisorCard from '../components/generator/ModelAdvisorCard'
import TitleSaveSection from '../components/generator/TitleSaveSection'
import GreylistCard from '../components/generator/GreylistCard'
import { usePromptImprovement } from '../hooks/usePromptImprovement'
import { useLanguage } from '../contexts/LanguageContext'

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
type ImprovementMode = 'expand' | 'reframe' | 'intensify'
type SavePromptMode = 'original-only' | 'original-and-improved'

type BudgetPick = { modelName: string; reasons: string[] }
type GeneratorPersistedState = {
  tab?: 'generator' | 'builder'
  selectedPreset?: string
  quickstartPreset?: string
  magicRandomPreset?: string
  builderPreset?: string
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
  quickstartCharacterId?: string | null
  magicRandomCharacterId?: string | null
  recommendedModel?: string
  recommendedModelReason?: string
  recommendedModelMode?: 'rule' | 'ai' | null
  advisorCheapPick?: BudgetPick
  advisorBalancedPick?: BudgetPick
  advisorPremiumPick?: BudgetPick
  supportsNegativePrompt?: boolean | null
  budgetMode?: BudgetMode
  autoTitleEnabled?: boolean
  savePromptMode?: SavePromptMode
}

function buildDefaultTitle(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DEFAULT_TITLE_MAX_LENGTH)
    .trim()
}

function splitWords(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function normalizePromptForDuplicateCheck(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export default function Generator() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<'generator' | 'builder'>('generator')
  const [presetOptions, setPresetOptions] = useState<PresetOption[]>([])
  const [quickstartPreset, setQuickstartPreset] = useState('')
  const [magicRandomPreset, setMagicRandomPreset] = useState('')
  const [builderPreset, setBuilderPreset] = useState('')
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
  const { viewTab: promptImprovementViewTab, improvementDiff: promptImprovementDiff, setViewTab: promptImprovementSetViewTab, setImprovementDiff: promptImprovementSetImprovementDiff } = promptImprovement
  const [generatingNegative, setGeneratingNegative] = useState(false)
  const [improvingNegative, setImprovingNegative] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [savedTitle, setSavedTitle] = useState('')
  const [savePromptMode, setSavePromptMode] = useState<SavePromptMode>('original-and-improved')
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true)
  const [recommendedModel, setRecommendedModel] = useState('')
  const [recommendedModelReason, setRecommendedModelReason] = useState('')
  const [recommendedModelMode, setRecommendedModelMode] = useState<'rule' | 'ai' | null>(null)
  const [advisorCheapPick, setAdvisorCheapPick] = useState<BudgetPick>({ modelName: '', reasons: [] })
  const [advisorBalancedPick, setAdvisorBalancedPick] = useState<BudgetPick>({ modelName: '', reasons: [] })
  const [advisorPremiumPick, setAdvisorPremiumPick] = useState<BudgetPick>({ modelName: '', reasons: [] })
  const [supportsNegativePrompt, setSupportsNegativePrompt] = useState<boolean | null>(null)
  const [greylistEnabled, setGreylistEnabled] = useState(true)
  const [greylistEntries, setGreylistEntries] = useState<Array<{ word: string; weight: 1 | 2 | 3 | 4 | 5 }>>(
    DEFAULT_GREYLIST.map((word) => ({ word, weight: 1 }))
  )
  const [greylistInput, setGreylistInput] = useState('')
  const [greylistWeight, setGreylistWeight] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [greylistLoaded, setGreylistLoaded] = useState(false)
  const [greylistLoadError, setGreylistLoadError] = useState(false)
  const [greylistSyncStatus, setGreylistSyncStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [greylistLastSyncedAt, setGreylistLastSyncedAt] = useState<string | null>(null)
  const [uiStateLoaded, setUiStateLoaded] = useState(false)
  const uiStateSaveTimeoutRef = useRef<number | null>(null)
  const lastAutoTitlePromptRef = useRef<string | null>(null)
  const autoTitleUsedOnceRef = useRef(false)

  const [quickStartIdea, setQuickStartIdea] = useState('')
  const [quickStartCreativity, setQuickStartCreativity] = useState<CreativityLevel>('balanced')
  const [magicRandomCreativity, setMagicRandomCreativity] = useState<CreativityLevel>('balanced')
  const [quickstartCharacterId, setQuickstartCharacterId] = useState<string | null>(null)
  const [magicRandomCharacterId, setMagicRandomCharacterId] = useState<string | null>(null)
  const [quickStartCharacterList, setQuickStartCharacterList] = useState<Array<{ id: string; name: string; description: string }>>([]) 
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('balanced')
  const [expandingIdea, setExpandingIdea] = useState(false)
  const [advisingAi, setAdvisingAi] = useState(false)
  const [generationAiModel, setGenerationAiModel] = useState<string | null>(null)
  const [hasGenerationAiConfigured, setHasGenerationAiConfigured] = useState(false)
  const [openRouterApiKeyPresent, setOpenRouterApiKeyPresent] = useState(false)
  const [improvementAiModel, setImprovementAiModel] = useState<string | null>(null)
  const [hasImprovementAiConfigured, setHasImprovementAiConfigured] = useState(false)
  const [promptBuilderClearNonce, setPromptBuilderClearNonce] = useState(0)
  const [generatedPromptPreset, setGeneratedPromptPreset] = useState('')

  const handleSavedTitleChange = (value: string) => {
    lastAutoTitlePromptRef.current = null
    setSavedTitle(value)
  }

  const clearModelAdvice = () => {
    setRecommendedModel('')
    setRecommendedModelReason('')
    setRecommendedModelMode(null)
    setAdvisorCheapPick({ modelName: '', reasons: [] })
    setAdvisorBalancedPick({ modelName: '', reasons: [] })
    setAdvisorPremiumPick({ modelName: '', reasons: [] })
    setSupportsNegativePrompt(null)
  }

  const handleClearQuickstart = () => {
    setStatus(null)
    setQuickStartIdea('')
    setQuickStartCreativity('balanced')
    setQuickstartCharacterId(null)
    setGeneratedPrompt('')
    setGeneratedPromptPreset('')
    setNegativePrompt('')
    promptImprovement.clearDiff()
    setNegativeImprovementDiff(null)
    setNegativePromptViewTab('final')
    setSavedTitle('')
    clearModelAdvice()
    setBudgetMode('balanced')
  }

  const handleClearPromptBuilder = () => {
    setSelectedStyleProfileId('')
    setPromptBuilderClearNonce((value) => value + 1)
  }

  const maybeAutoGenerateTitle = async (nextPrompt: string, previousPrompt: string) => {
    if (!autoTitleEnabled) return
    if (autoTitleUsedOnceRef.current) return

    const trimmedTitle = savedTitle.trim()
    const canOverwrite = !trimmedTitle || lastAutoTitlePromptRef.current === previousPrompt
    if (!canOverwrite) return

    setGeneratingTitle(true)
    try {
      const result = await window.electronAPI.generator.generateTitle({ prompt: nextPrompt })
      if (result.error || !result.data?.title) return
      lastAutoTitlePromptRef.current = nextPrompt
      autoTitleUsedOnceRef.current = true
      setSavedTitle(result.data.title)
      setAutoTitleEnabled(false)
    } finally {
      setGeneratingTitle(false)
    }
  }

  const getPresetPrompt = (presetName: string): string =>
    presetOptions.find((preset) => preset.presetName === presetName)?.presetPrompt?.trim() || ''

  const buildPresetContext = (presetName: string): { presetName: string; presetPrompt: string; presetContext: string } => {
    const trimmedName = presetName.trim()
    if (!trimmedName) return { presetName: '', presetPrompt: '', presetContext: '' }

    const presetPrompt = getPresetPrompt(trimmedName)
    const presetContext = presetPrompt
      ? `${trimmedName}. Preset prompt guidance: ${presetPrompt}`
      : trimmedName

    return { presetName: trimmedName, presetPrompt, presetContext }
  }

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

  useEffect(() => {
    let ignore = false

    async function loadGenerationModel() {
      const [openRouterResult, aiConfigResult] = await Promise.all([
        window.electronAPI.settings.getOpenRouter(),
        window.electronAPI.settings.getAiConfigState(),
      ])

      if (ignore || openRouterResult.error || !openRouterResult.data) {
        setGenerationAiModel(null)
        setHasGenerationAiConfigured(false)
        setOpenRouterApiKeyPresent(false)
        return
      }

      const fallbackModel = (openRouterResult.data.model ?? '').trim()
      const openRouterApiKey = (openRouterResult.data.apiKey ?? '').trim()
      setOpenRouterApiKeyPresent(Boolean(openRouterApiKey))

      const routing = !aiConfigResult.error && aiConfigResult.data
        ? aiConfigResult.data.dashboardRoleRouting
        : undefined
      const generationRoute = typeof routing === 'object' && routing !== null
        ? (routing as Record<string, unknown>).generation
        : undefined

      const routeProviderId = typeof generationRoute === 'object' && generationRoute !== null
        ? String((generationRoute as Record<string, unknown>).providerId || '').trim()
        : ''
      const routeModelId = typeof generationRoute === 'object' && generationRoute !== null
        ? String((generationRoute as Record<string, unknown>).modelId || '').trim()
        : ''
      const routeEnabled = typeof generationRoute === 'object' && generationRoute !== null
        ? Boolean((generationRoute as Record<string, unknown>).enabled ?? true)
        : false

      const useRoute = Boolean(routeEnabled && routeProviderId && routeModelId)
      const effectiveProviderId = useRoute ? routeProviderId : 'openrouter'
      const effectiveModelId = useRoute ? routeModelId : fallbackModel
      const hasKeyIfNeeded = effectiveProviderId !== 'openrouter' || Boolean(openRouterApiKey)

      setGenerationAiModel(effectiveModelId || null)
      setHasGenerationAiConfigured(Boolean(effectiveModelId && hasKeyIfNeeded))
    }

    void loadGenerationModel()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadImprovementModel() {
      const result = await window.electronAPI.settings.getAiConfigState()

      if (ignore || result.error || !result.data) {
        setImprovementAiModel(null)
        setHasImprovementAiConfigured(false)
        return
      }

      const routing = result.data.dashboardRoleRouting
      const improvementRoute = typeof routing === 'object' && routing !== null
        ? (routing as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improvementRoute === 'object' && improvementRoute !== null
        ? String((improvementRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improvementRoute === 'object' && improvementRoute !== null
        ? String((improvementRoute as Record<string, unknown>).modelId || '')
        : ''

      setImprovementAiModel(modelId.trim() || null)

      const hasRoute = Boolean(providerId.trim() && modelId.trim())
      const hasKeyIfNeeded = providerId.trim() !== 'openrouter' || openRouterApiKeyPresent
      setHasImprovementAiConfigured(hasRoute && hasKeyIfNeeded)
    }

    void loadImprovementModel()

    return () => {
      ignore = true
    }
  }, [openRouterApiKeyPresent])

  const handleQuickExpand = async () => {
    const idea = quickStartIdea.trim()
    if (!idea) return

    setStatus(null)
    setExpandingIdea(true)

    try {
      const { presetContext, presetPrompt } = buildPresetContext(quickstartPreset)
      const characterForContext = quickstartCharacterId
        ? quickStartCharacterList.find((c) => c.id === quickstartCharacterId)
        : null

      const result = await window.electronAPI.generator.quickExpand({
        idea,
        presetName: presetContext || undefined,
        presetPrompt: presetPrompt || undefined,
        creativity: quickStartCreativity,
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
      setGeneratedPrompt(nextPrompt)
      setGeneratedPromptPreset(quickstartPreset)
      if (!autoTitleEnabled) {
        setSavedTitle(buildDefaultTitle(nextPrompt))
      }
      promptImprovement.clearDiff()
      setNegativeImprovementDiff(null)
      setNegativePromptViewTab('final')
      setTab('generator')
      clearModelAdvice()
      void maybeAutoGenerateTitle(nextPrompt, generatedPrompt)
    } catch (error) {
      console.error('Quick expand failed:', error)
      setStatus(error instanceof Error ? error.message : 'Quick expansion failed.')
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
      setAdvisorCheapPick(result.data.cheapPick || { modelName: '', reasons: [] })
      setAdvisorBalancedPick(result.data.balancedPick || { modelName: '', reasons: [] })
      setAdvisorPremiumPick(result.data.premiumPick || { modelName: '', reasons: [] })
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

  const greylistWords = greylistEntries.map((entry) => entry.word)
  const formattedGreylistSyncTime = greylistLastSyncedAt
    ? new Date(greylistLastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null
  const greylistSyncStatusText = greylistSyncStatus === 'loading'
    ? 'Greylist sync: loading...'
    : greylistSyncStatus === 'saving'
      ? 'Greylist sync: saving...'
      : greylistSyncStatus === 'error'
        ? 'Greylist sync: failed'
        : `Greylist sync: ${formattedGreylistSyncTime ? `saved at ${formattedGreylistSyncTime}` : 'saved'}`
  const greylistSyncStatusClassName = greylistSyncStatus === 'error'
    ? 'text-red-400'
    : greylistSyncStatus === 'saved'
      ? 'text-green-400'
      : 'text-slate-500'

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

  const handleImprovePrompt = async (mode: ImprovementMode) => {
    await handleImprove(mode)
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

    setGreylistEntries((prev) => [...prev, { word: normalized, weight: greylistWeight }])
    setGreylistInput('')
  }

  const removeGreylistWord = (word: string) => {
    setGreylistEntries((prev) => prev.filter((item) => item.word !== word))
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
      const legacyPreset = parsed.selectedPreset ?? ''
      setQuickstartPreset(parsed.quickstartPreset ?? legacyPreset)
      setMagicRandomPreset(parsed.magicRandomPreset ?? legacyPreset)
      setBuilderPreset(parsed.builderPreset ?? legacyPreset)
      const persistedMaxWords = Number.isFinite(parsed.maxWords)
        ? Math.max(1, Math.min(MAX_ALLOWED_WORDS, Math.floor(parsed.maxWords as number)))
        : DEFAULT_MAX_WORDS
      setMaxWords(persistedMaxWords)
      setGeneratedPrompt(parsed.generatedPrompt ?? '')
      setGeneratedPromptPreset('')
      setNegativePrompt(parsed.negativePrompt ?? '')
      setNegativeImprovementDiff(parsed.negativeImprovementDiff ?? null)
      setSavedTitle(parsed.savedTitle ?? '')
      promptImprovementSetImprovementDiff(parsed.improvementDiff ?? null)
      setRecommendedModel(parsed.recommendedModel ?? '')
      setRecommendedModelReason(parsed.recommendedModelReason ?? '')
      setRecommendedModelMode(parsed.recommendedModelMode ?? null)
      setAdvisorCheapPick(parsed.advisorCheapPick ?? { modelName: '', reasons: [] })
      setAdvisorBalancedPick(parsed.advisorBalancedPick ?? { modelName: '', reasons: [] })
      setAdvisorPremiumPick(parsed.advisorPremiumPick ?? { modelName: '', reasons: [] })
      setSupportsNegativePrompt(typeof parsed.supportsNegativePrompt === 'boolean' ? parsed.supportsNegativePrompt : null)
      setQuickStartIdea(parsed.quickStartIdea ?? '')
      setQuickStartCreativity(parsed.quickStartCreativity ?? 'balanced')
      setMagicRandomCreativity(parsed.magicRandomCreativity ?? 'balanced')
      const legacyCharacterId = parsed.quickStartCharacterId ?? null
      setQuickstartCharacterId(parsed.quickstartCharacterId ?? legacyCharacterId)
      setMagicRandomCharacterId(parsed.magicRandomCharacterId ?? legacyCharacterId)
      setBudgetMode(parsed.budgetMode === 'cheap' ? 'cheap' : parsed.budgetMode === 'premium' ? 'premium' : 'balanced')
      setAutoTitleEnabled(parsed.autoTitleEnabled !== false)
      setSavePromptMode(parsed.savePromptMode === 'original-only' ? 'original-only' : 'original-and-improved')

      const nextPromptViewTab = parsed.promptViewTab === 'diff' && parsed.improvementDiff ? 'diff' : 'final'
      promptImprovementSetViewTab(nextPromptViewTab)
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
  }, [promptImprovementSetImprovementDiff, promptImprovementSetViewTab])

  useEffect(() => {
    if (!uiStateLoaded) return

    const buildNextState = (): GeneratorPersistedState => ({
      tab,
      selectedPreset: magicRandomPreset,
      quickstartPreset,
      magicRandomPreset,
      builderPreset,
      maxWords,
      generatedPrompt,
      negativePrompt,
      negativePromptViewTab,
      negativeImprovementDiff,
      savedTitle,
      recommendedModel,
      recommendedModelReason,
      recommendedModelMode,
      advisorCheapPick,
      advisorBalancedPick,
      advisorPremiumPick,
      supportsNegativePrompt,
      promptViewTab: promptImprovementViewTab,
      improvementDiff: promptImprovementDiff,
      quickStartIdea,
      quickStartCreativity,
      magicRandomCreativity,
      quickstartCharacterId,
      magicRandomCharacterId,
      budgetMode,
      autoTitleEnabled,
      savePromptMode,
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
    quickstartPreset,
    magicRandomPreset,
    builderPreset,
    maxWords,
    generatedPrompt,
    negativePrompt,
    negativePromptViewTab,
    negativeImprovementDiff,
    savedTitle,
    recommendedModel,
    recommendedModelReason,
    recommendedModelMode,
    advisorCheapPick,
    advisorBalancedPick,
    advisorPremiumPick,
    supportsNegativePrompt,
    promptImprovementViewTab,
    promptImprovementDiff,
    quickStartIdea,
    quickStartCreativity,
    magicRandomCreativity,
    quickstartCharacterId,
    magicRandomCharacterId,
    budgetMode,
    autoTitleEnabled,
    savePromptMode,
  ])

  useEffect(() => {
    let ignore = false

    async function loadGreylist() {
      try {
        setGreylistSyncStatus('loading')
        const result = await window.electronAPI.greylist.get()
        if (ignore) {
          return
        }

        if (result.error) {
          setGreylistLoadError(true)
          setGreylistSyncStatus('error')
          setGreylistEntries(DEFAULT_GREYLIST.map((word) => ({ word, weight: 1 })))
          return
        }

        if (!result.data) {
          setGreylistLoadError(false)
          setGreylistEntries(DEFAULT_GREYLIST.map((word) => ({ word, weight: 1 })))
          return
        }

        setGreylistLoadError(false)
        setGreylistSyncStatus('saved')
        setGreylistLastSyncedAt(new Date().toISOString())
        const loadedEntries = Array.isArray(result.data.entriesJson) && result.data.entriesJson.length > 0
          ? result.data.entriesJson
          : (result.data.words || DEFAULT_GREYLIST).map((word) => ({ word, weight: 1 as const }))

        setGreylistEntries(loadedEntries)
      } catch (error) {
        console.error('Failed to load greylist:', error)
        setGreylistLoadError(true)
        setGreylistSyncStatus('error')
        setGreylistEntries(DEFAULT_GREYLIST.map((word) => ({ word, weight: 1 })))
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
      if (greylistLoadError) return
      try {
        setGreylistSyncStatus('saving')
        await window.electronAPI.greylist.save({
          entriesJson: greylistEntries,
        })
        if (!ignore) {
          setGreylistSyncStatus('saved')
          setGreylistLastSyncedAt(new Date().toISOString())
        }
      } catch (error) {
        console.error('Failed to save greylist to database:', error)
        if (!ignore) setGreylistSyncStatus('error')
      }
    }

    saveGreylist()

    return () => {
      ignore = true
    }
  }, [greylistLoaded, greylistEntries, greylistLoadError])

  const handleGenerate = async () => {
    setStatus(null)
    setLoading(true)

    try {
      const { presetContext, presetPrompt } = buildPresetContext(magicRandomPreset)
      const characterForContext = magicRandomCharacterId
        ? quickStartCharacterList.find((c) => c.id === magicRandomCharacterId)
        : null

      const result = await window.electronAPI.generator.magicRandom({
        presetName: presetContext || undefined,
        presetPrompt: presetPrompt || undefined,
        maxWords,
        greylistEnabled,
        greylistWords,
        greylistEntries,
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
      setGeneratedPromptPreset(magicRandomPreset)
      promptImprovement.clearDiff()
      setNegativeImprovementDiff(null)
      setNegativePromptViewTab('final')
      clearModelAdvice()
      if (!autoTitleEnabled) {
        setSavedTitle((currentTitle) => {
          const trimmedTitle = currentTitle.trim()
          if (trimmedTitle && trimmedTitle !== buildDefaultTitle(previousPrompt)) return currentTitle
          return buildDefaultTitle(nextPrompt)
        })
      }
      void maybeAutoGenerateTitle(nextPrompt, previousPrompt)
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

  const handleImprove = async (mode: ImprovementMode = 'expand') => {
    if (!generatedPrompt.trim()) {
      setStatus('Nothing to improve yet. Generate (or paste) a prompt first.')
      return
    }

    setStatus(null)

    try {
      const previousPrompt = generatedPrompt

      const improved = await promptImprovement.handleImprove(generatedPrompt, mode)
      if (!improved) {
        setStatus('Error: Failed to improve prompt.')
        return
      }

      const improvedWordLimit = Math.max(1, Math.ceil(maxWords * 1.1))
      const improvedWords = splitWords(improved)
      const improvedPromptFinal = (() => {
        if (improvedWords.length <= improvedWordLimit) return improved

        const sliced = improvedWords.slice(0, improvedWordLimit).join(' ').trim()
        if (!sliced) return sliced
        if (/[.!?]$/.test(sliced)) return sliced

        const lastDot = sliced.lastIndexOf('.')
        const lastBang = sliced.lastIndexOf('!')
        const lastQuestion = sliced.lastIndexOf('?')
        const lastSentenceEnd = Math.max(lastDot, lastBang, lastQuestion)
        if (lastSentenceEnd >= 0 && lastSentenceEnd >= Math.floor(sliced.length * 0.6)) {
          return sliced.slice(0, lastSentenceEnd + 1).trim()
        }

        return `${sliced.replace(/[,:;]+$/, '').trim()}.`
      })()

      if (improvedPromptFinal !== improved) {
        promptImprovement.setImprovementDiff({
          originalPrompt: previousPrompt,
          improvedPrompt: improvedPromptFinal,
        })
      }

      if (!autoTitleEnabled) {
        setSavedTitle((currentTitle) => {
          const trimmedTitle = currentTitle.trim()
          if (trimmedTitle && trimmedTitle !== buildDefaultTitle(previousPrompt)) return currentTitle
          return buildDefaultTitle(improvedPromptFinal)
        })
      }

      setStatus(
        improvedPromptFinal === improved
          ? 'Prompt improved.'
          : `Prompt improved and limited to ${improvedWordLimit} words (110% of Max Words).`
      )
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
      lastAutoTitlePromptRef.current = generatedPrompt
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error: Failed to generate title.')
    } finally {
      setGeneratingTitle(false)
    }
  }

  const handleSaveToLibrary = async () => {
    const originalPromptText = (promptImprovement.improvementDiff?.originalPrompt ?? generatedPrompt).trim()
    const improvedPromptText = (promptImprovement.improvementDiff?.improvedPrompt ?? '').trim()
    const shouldUseImprovedPrompt = savePromptMode === 'original-and-improved' && Boolean(improvedPromptText)
    const finalPromptText = shouldUseImprovedPrompt ? improvedPromptText : originalPromptText
    if (!finalPromptText) {
      setStatus('Generate or paste a prompt before saving to library.')
      return
    }

    const titleToSave = savedTitle.trim() || buildDefaultTitle(finalPromptText)
    if (!titleToSave) {
      setStatus('Add a title before saving to library.')
      return
    }

    const nextOriginalPrompt = originalPromptText || finalPromptText

    try {
      const existingPromptsResult = await window.electronAPI.prompts.list()
      if (existingPromptsResult.error || !existingPromptsResult.data) {
        setStatus('Error: Failed to check for duplicates.')
        return
      }

      const normalizedNextPrompt = normalizePromptForDuplicateCheck(finalPromptText)
      const duplicate = existingPromptsResult.data.find((prompt) => (
        normalizePromptForDuplicateCheck(prompt.promptText) === normalizedNextPrompt
      ))

      if (duplicate) {
        await window.electronAPI.dialog.showMessageBox({
          type: 'warning',
          title: 'Duplicate Prompt',
          message: 'This prompt already exists in your library, even if the title is different.',
          buttons: ['OK'],
        })
        notifications.show({ message: 'Duplicate prompt already exists (prompt text match).', color: 'yellow' })
        return
      }

      const result = await window.electronAPI.prompts.create({
        title: titleToSave,
        promptText: finalPromptText,
        originalPrompt: nextOriginalPrompt,
        negativePrompt: negativePrompt.trim(),
        stylePreset: (generatedPromptPreset || magicRandomPreset || quickstartPreset).trim(),
        model: recommendedModel.trim(),
        suggestedModel: recommendedModel.trim(),
        notes: 'Generated with Magic Random (AI)',
        tags: ['ai-random'],
      })

      if (result.error) {
        setStatus(`Error: ${result.error}`)
        notifications.show({ message: `Failed to save prompt: ${result.error}`, color: 'red' })
        return
      }

      setSavedTitle('')
      const modeLabel = shouldUseImprovedPrompt ? 'original + improved' : 'original only'
      setStatus(`Saved to Prompt Library (${modeLabel}).`)
      notifications.show({ message: `Saved to Prompt Library (${modeLabel}).`, color: 'green' })
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Error: Failed to save to Prompt Library.')
      notifications.show({
        message: error instanceof Error ? `Failed to save prompt: ${error.message}` : 'Failed to save prompt.',
        color: 'red',
      })
    }
  }

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <PageContainer>
        <h1 className="text-2xl font-semibold text-white tracking-tight">{t('generator.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('generator.subtitle')}</p>

        <div className="mt-5 inline-flex rounded-xl border border-slate-700/50 bg-slate-900/40 p-1">
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'generator' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            onClick={() => setTab('generator')}
          >
            {t('generator.tabQuickstart')}
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'builder' ? 'bg-glow-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            onClick={() => setTab('builder')}
          >
            {t('generator.tabBuilder')}
          </button>
        </div>

        {tab === 'generator' ? (
          <>
            {/* Greylist */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px] lg:items-start">
              <GreylistCard
                greylistEnabled={greylistEnabled}
                setGreylistEnabled={setGreylistEnabled}
                greylistEntries={greylistEntries}
                setGreylistEntries={setGreylistEntries}
                greylistInput={greylistInput}
                setGreylistInput={setGreylistInput}
                greylistWeight={greylistWeight}
                setGreylistWeight={setGreylistWeight}
                addGreylistWord={addGreylistWord}
                removeGreylistWord={removeGreylistWord}
                syncStatusText={greylistSyncStatusText}
                syncStatusClassName={greylistSyncStatusClassName}
              />
              <div className="space-y-5">
                <div className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Auto title</h2>
                      <p className="text-xs text-slate-500 mt-1">Generate a title automatically after generating or improving a prompt.</p>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors ${autoTitleEnabled ? 'border-green-500/60 bg-green-500/20 text-green-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={autoTitleEnabled}
                        onChange={(e) => setAutoTitleEnabled(e.target.checked)}
                        className="mr-1 h-3.5 w-3.5 accent-green-500"
                        aria-label="Enable automatic title generation"
                      />
                      {autoTitleEnabled ? 'On' : 'Off'}
                    </label>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Clear</h2>
                      <p className="text-xs text-slate-500 mt-1">Reset Quickstart fields on this tab.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearQuickstart}
                      className="btn-ghost text-xs"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Cards - side by side */}
            <div className="mt-5">
              <QuickstartPanel
                quickStartIdea={quickStartIdea}
                setQuickStartIdea={setQuickStartIdea}
                quickStartCreativity={quickStartCreativity}
                setQuickStartCreativity={setQuickStartCreativity}
                quickstartCharacterId={quickstartCharacterId}
                setQuickstartCharacterId={setQuickstartCharacterId}
                magicRandomCharacterId={magicRandomCharacterId}
                setMagicRandomCharacterId={setMagicRandomCharacterId}
                quickStartCharacterList={quickStartCharacterList}
                magicRandomCreativity={magicRandomCreativity}
                setMagicRandomCreativity={setMagicRandomCreativity}
                quickstartPreset={quickstartPreset}
                setQuickstartPreset={setQuickstartPreset}
                magicRandomPreset={magicRandomPreset}
                setMagicRandomPreset={setMagicRandomPreset}
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
                handleMagicRandom={handleGenerate}
                handleGenerateNegative={handleGenerateNegative}
                expandingIdea={expandingIdea}
                loading={loading}
                generationAiModel={generationAiModel}
                hasGenerationAiConfigured={hasGenerationAiConfigured}
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
              improvementAiModel={improvementAiModel}
              hasImprovementAiConfigured={hasImprovementAiConfigured}
              maxWords={maxWords}
            />

            {/* Title and Save Section */}
            <TitleSaveSection
              savedTitle={savedTitle}
              setSavedTitle={handleSavedTitleChange}
              savePromptMode={savePromptMode}
              setSavePromptMode={setSavePromptMode}
              generatedPrompt={generatedPrompt}
              negativePrompt={negativePrompt}
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
              advisorCheapPick={advisorCheapPick}
              advisorBalancedPick={advisorBalancedPick}
              advisorPremiumPick={advisorPremiumPick}
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
                  greylistEntries={greylistEntries}
                  setGreylistEntries={setGreylistEntries}
                  greylistInput={greylistInput}
                  setGreylistInput={setGreylistInput}
                  greylistWeight={greylistWeight}
                  setGreylistWeight={setGreylistWeight}
                  addGreylistWord={addGreylistWord}
                  removeGreylistWord={removeGreylistWord}
                  syncStatusText={greylistSyncStatusText}
                  syncStatusClassName={greylistSyncStatusClassName}
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
              <div className="mb-4 flex flex-col gap-4">
                <div className="card p-5 flex flex-col">
                  <div className="grid grid-cols-1 gap-4">
                  {/* Preset and Style Profile Row */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Preset</p>
                      <select
                        value={builderPreset}
                        onChange={(e) => setBuilderPreset(e.target.value)}
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

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Auto title</p>
                      <p className="text-[11px] text-slate-500 mt-1">Generate a title automatically.</p>
                    </div>
                    <label className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors ${autoTitleEnabled ? 'border-green-500/60 bg-green-500/20 text-green-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                      <input
                        type="checkbox"
                        checked={autoTitleEnabled}
                        onChange={(e) => setAutoTitleEnabled(e.target.checked)}
                        className="mr-1 h-3.5 w-3.5 accent-green-500"
                        aria-label="Enable automatic title generation"
                      />
                      {autoTitleEnabled ? 'On' : 'Off'}
                    </label>
                  </div>
                </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Clear</h2>
                      <p className="text-xs text-slate-500 mt-1">Reset Prompt Builder fields on this tab.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearPromptBuilder}
                      className="btn-ghost text-xs"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1 card border-slate-800/50">
              <PromptBuilder 
                embedded 
                clearNonce={promptBuilderClearNonce}
                greylistEnabled={greylistEnabled} 
                greylistWords={greylistWords} 
                maxWords={maxWords} 
                creativity={magicRandomCreativity}
                stylePreset={builderPreset}
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





