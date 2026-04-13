import { useCallback, useEffect, useMemo, useState } from 'react'

import { ConfigurationWizard } from './Settings/ConfigurationWizard'
import { Dashboard } from './Settings/Dashboard'
import type { ApiKeyInfo, LocalEndpoint, ModelOption } from './Settings/types'

type DashboardRole = 'generation' | 'improvement' | 'vision' | 'general'

interface RoleRouteSelection {
  enabled: boolean
  providerId: string
  modelId: string
}

type RoleRouteState = Record<DashboardRole, RoleRouteSelection>

interface ProviderOption {
  id: string
  label: string
}

interface ProviderMetaStore {
  model_gen: string
  model_improve: string
  model_vision: string
  model_general: string
  is_active: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
  is_active_general: boolean
}

type LegacyLocalEndpoint = Partial<LocalEndpoint> & {
  id?: string
  name?: string
  baseUrl?: string
  model?: string
}

function getDefaultProviderMeta(fallbackModel: string): ProviderMetaStore {
  return {
    model_gen: fallbackModel,
    model_improve: fallbackModel,
    model_vision: fallbackModel,
    model_general: fallbackModel,
    is_active: false,
    is_active_gen: false,
    is_active_improve: false,
    is_active_vision: false,
    is_active_general: false,
  }
}

function normalizeLocalEndpoint(input: Partial<LocalEndpoint> & { id?: string; name?: string; baseUrl?: string; model?: string }): LocalEndpoint {
  const modelName = input.model_name || input.model_gen || input.model || 'llama3.2:latest'

  return {
    id: input.id || crypto.randomUUID(),
    provider: input.provider || undefined,
    name: input.name || 'Local Endpoint',
    baseUrl: input.baseUrl || '',
    apiKey: typeof input.apiKey === 'string' ? input.apiKey : undefined,
    model_name: modelName,
    model_gen: input.model_gen || modelName,
    model_improve: input.model_improve || modelName,
    model_vision: input.model_vision || modelName,
    model_general: input.model_general || modelName,
    is_active: input.is_active || false,
    is_active_gen: input.is_active_gen || false,
    is_active_improve: input.is_active_improve || false,
    is_active_vision: input.is_active_vision || false,
    is_active_general: input.is_active_general || false,
    updated_at: input.updated_at || new Date().toISOString(),
  }
}

function inferLocalProvider(input: LegacyLocalEndpoint): string | undefined {
  if (input.provider) return input.provider

  const name = (input.name || '').toLowerCase()
  const baseUrl = (input.baseUrl || '').toLowerCase()

  if (name.includes('ollama') || baseUrl.includes('11434')) return 'ollama'
  if (name.includes('lm studio') || name.includes('lmstudio') || baseUrl.includes('1234')) return 'lmstudio'

  return undefined
}

function migrateLegacyLocalEndpoints(rawEndpoints: LegacyLocalEndpoint[]): {
  endpoints: LocalEndpoint[]
  didMigrate: boolean
} {
  let didMigrate = false

  const migrated = rawEndpoints.map((endpoint) => {
    const inferredProvider = inferLocalProvider(endpoint)
    const normalized = normalizeLocalEndpoint({
      ...endpoint,
      provider: inferredProvider,
    })

    const neededProviderInference = !endpoint.provider && Boolean(inferredProvider)
    const neededModelNameMigration = !endpoint.model_name && Boolean(endpoint.model)
    if (neededProviderInference || neededModelNameMigration) didMigrate = true

    return normalized
  })

  return { endpoints: migrated, didMigrate }
}

function buildRoleDefaults(): RoleRouteState {
  return {
    generation: { enabled: true, providerId: '', modelId: '' },
    improvement: { enabled: true, providerId: '', modelId: '' },
    vision: { enabled: true, providerId: '', modelId: '' },
    general: { enabled: true, providerId: '', modelId: '' },
  }
}

function getLocalProviderId(endpoint: LocalEndpoint): string {
  if (endpoint.provider) return endpoint.provider
  const name = endpoint.name.toLowerCase()
  if (name.includes('ollama')) return 'ollama'
  if (name.includes('lm studio') || name.includes('lmstudio')) return 'lmstudio'
  return endpoint.id
}

function getSourceProviderId(source?: ApiKeyInfo | LocalEndpoint): string {
  if (!source) return ''
  if ('apiKeyMasked' in source) return source.provider
  return getLocalProviderId(source)
}

function getSourceModelId(source: ApiKeyInfo | LocalEndpoint | undefined, role: DashboardRole): string {
  if (!source) return ''

  if ('apiKeyMasked' in source) {
    if (role === 'generation') return source.model_gen || source.model_name || ''
    if (role === 'improvement') return source.model_improve || source.model_name || ''
    if (role === 'vision') return source.model_vision || source.model_name || ''
    return source.model_general || source.model_name || ''
  }

  if (role === 'generation') return source.model_gen || source.model_name || ''
  if (role === 'improvement') return source.model_improve || source.model_name || ''
  if (role === 'vision') return source.model_vision || source.model_name || ''
  return source.model_general || source.model_name || ''
}

function formatPricePerMillion(priceText: string | null | undefined): string | null {
  if (!priceText)
    return null

  const parsed = Number(priceText)
  if (!Number.isFinite(parsed))
    return null

  const perMillion = parsed * 1_000_000
  if (perMillion > 0 && perMillion < 0.01)
    return '<$0.01'
  return `$${perMillion.toFixed(2)}`
}

function buildOpenRouterModelLabel(input: {
  displayName: string
  promptPrice: string | null
  completionPrice: string | null
}): string {
  const prompt = formatPricePerMillion(input.promptPrice)
  const completion = formatPricePerMillion(input.completionPrice)
  if (!prompt || !completion)
    return input.displayName

  return `${input.displayName} (${prompt}/${completion} per 1M tok in/out)`
}

function buildOpenRouterPriceLabel(input: {
  promptPrice: string | null
  completionPrice: string | null
}): string {
  const prompt = formatPricePerMillion(input.promptPrice)
  const completion = formatPricePerMillion(input.completionPrice)
  if (!prompt || !completion)
    return '—'

  return `${prompt}/${completion}`
}

function getOpenRouterCombinedPrice(model: Pick<ModelOption, 'promptPrice' | 'completionPrice'>): number {
  const prompt = Number(model.promptPrice || '')
  const completion = Number(model.completionPrice || '')

  if (!Number.isFinite(prompt) || !Number.isFinite(completion))
    return Number.POSITIVE_INFINITY

  return prompt + completion
}

function sortModelOptionsByPrice(models: ModelOption[]): ModelOption[] {
  return [...models].sort((first, second) => {
    const firstPrice = getOpenRouterCombinedPrice(first)
    const secondPrice = getOpenRouterCombinedPrice(second)

    if (firstPrice !== secondPrice)
      return firstPrice - secondPrice

    const firstLabel = first.label || first.name || first.id
    const secondLabel = second.label || second.name || second.id
    return firstLabel.localeCompare(secondLabel)
  })
}

export function AIConfig() {
  const [view, setView] = useState<'dashboard' | 'wizard'>('dashboard')
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [localEndpoints, setLocalEndpoints] = useState<LocalEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [roleRouting, setRoleRouting] = useState<RoleRouteState>(buildRoleDefaults)
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>({})
  const [aiConfigHydrated, setAiConfigHydrated] = useState(false)

  const getToken = useCallback(async () => 'local-desktop-token', [])

  const hydrateAiConfigState = useCallback(async () => {
    let nextRoleRouting = buildRoleDefaults()
    let nextDynamicModels: Record<string, ModelOption[]> = {}

    const storedResult = await window.electronAPI.settings.getAiConfigState()
    if (!storedResult.error && storedResult.data) {
      const storedRoleRouting = storedResult.data.dashboardRoleRouting as Partial<RoleRouteState> | undefined
      const storedDynamicModels = storedResult.data.cachedModels as Record<string, ModelOption[]> | undefined

      if (storedRoleRouting) {
        nextRoleRouting = { ...buildRoleDefaults(), ...storedRoleRouting }
      }

      if (storedDynamicModels && typeof storedDynamicModels === 'object') {
        nextDynamicModels = storedDynamicModels
      }

    }

    try {
      const legacyRoleRoutingRaw = localStorage.getItem('dashboardRoleRouting')
      const legacyCachedModelsRaw = localStorage.getItem('cachedModels')

      const hasStoredRoleRouting = Boolean((storedResult.data?.dashboardRoleRouting))
      const hasStoredCachedModels = Boolean((storedResult.data?.cachedModels))

      if (!hasStoredRoleRouting && legacyRoleRoutingRaw) {
        const legacyRoleRouting = JSON.parse(legacyRoleRoutingRaw) as Partial<RoleRouteState>
        nextRoleRouting = { ...buildRoleDefaults(), ...legacyRoleRouting }
      }

      if (!hasStoredCachedModels && legacyCachedModelsRaw) {
        const legacyCachedModels = JSON.parse(legacyCachedModelsRaw) as Record<string, ModelOption[]>
        nextDynamicModels = legacyCachedModels
      }

      if (legacyRoleRoutingRaw || legacyCachedModelsRaw || localStorage.getItem('advisorModelRoute')) {
        await window.electronAPI.settings.saveAiConfigState({
          dashboardRoleRouting: nextRoleRouting,
          cachedModels: nextDynamicModels,
          advisorModelRoute: nextRoleRouting.general,
        })

        localStorage.removeItem('dashboardRoleRouting')
        localStorage.removeItem('cachedModels')
        localStorage.removeItem('advisorModelRoute')
      }
    } catch (error) {
      console.error('Failed to migrate legacy AI config localStorage settings', error)
    }

    setRoleRouting(nextRoleRouting)
    setDynamicModels(nextDynamicModels)
    setAiConfigHydrated(true)
  }, [])

  useEffect(() => {
    if (!aiConfigHydrated)
      return

    const persist = async () => {
      await window.electronAPI.settings.saveAiConfigState({
        dashboardRoleRouting: roleRouting,
        cachedModels: dynamicModels,
        advisorModelRoute: roleRouting.general,
      })
    }

    void persist()
  }, [roleRouting, dynamicModels, aiConfigHydrated])

  const migrateLegacyProviderMeta = useCallback(async () => {
    try {
      const raw = localStorage.getItem('providerMeta')
      if (!raw)
        return

      const parsed = JSON.parse(raw) as Record<string, Partial<ProviderMetaStore>>
      const entries = Object.entries(parsed)

      for (const [providerId, providerMeta] of entries) {
        const result = await window.electronAPI.settings.saveProviderMeta(providerId, providerMeta)
        if (result.error) {
          throw new Error(result.error)
        }
      }

      localStorage.removeItem('providerMeta')
    } catch (error) {
      console.error('Failed to migrate legacy provider meta from localStorage', error)
    }
  }, [])

  const loadKeys = useCallback(async () => {
    const result = await window.electronAPI.settings.getOpenRouter()

    if (result.error || !result.data?.apiKey) {
      setKeys([])
      return
    }

    const modelName = result.data.model || 'openai/gpt-4o-mini'
    const metaResult = await window.electronAPI.settings.getProviderMeta('openrouter', modelName)
    const meta = metaResult.error || !metaResult.data
      ? getDefaultProviderMeta(modelName)
      : metaResult.data

    const key = result.data.apiKey
    const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****'

    setKeys([
      {
        id: 'openrouter-key',
        provider: 'openrouter',
        apiKeyMasked: masked,
        key_hint: masked,
        model_name: modelName,
        model_gen: meta.model_gen || modelName,
        model_improve: meta.model_improve || modelName,
        model_vision: meta.model_vision || modelName,
        model_general: meta.model_general || modelName,
        is_active: meta.is_active,
        is_active_gen: meta.is_active_gen,
        is_active_improve: meta.is_active_improve,
        is_active_vision: meta.is_active_vision,
        is_active_general: meta.is_active_general,
      },
    ])
  }, [])

  const loadLocalEndpoints = useCallback(async () => {
    try {
      const storedResult = await window.electronAPI.settings.getLocalEndpoints()
      const stored = storedResult.error || !storedResult.data
        ? []
        : (storedResult.data as LegacyLocalEndpoint[])

      const normalizedStored = migrateLegacyLocalEndpoints(stored).endpoints
      if (normalizedStored.length > 0) {
        setLocalEndpoints(normalizedStored)
        return
      }

      const legacyRaw = localStorage.getItem('localEndpoints')
      const legacyParsed = legacyRaw ? (JSON.parse(legacyRaw) as LegacyLocalEndpoint[]) : []
      const { endpoints, didMigrate } = migrateLegacyLocalEndpoints(legacyParsed)

      if (endpoints.length > 0 || didMigrate) {
        const saveResult = await window.electronAPI.settings.saveLocalEndpoints(endpoints)
        if (saveResult.error) {
          console.error('Failed to persist migrated local endpoints:', saveResult.error)
        }
      }

      if (legacyRaw) {
        localStorage.removeItem('localEndpoints')
      }

      setLocalEndpoints(endpoints)
    } catch (error) {
      console.error('Failed to load local endpoints', error)
      setLocalEndpoints([])
    }
  }, [])

  const refreshData = useCallback(async () => {
    await migrateLegacyProviderMeta()
    await Promise.all([loadKeys(), loadLocalEndpoints()])

    const modelsResult = await window.electronAPI.settings.listOpenRouterModels()
    if (modelsResult.error || !modelsResult.data)
      return

    setDynamicModels((prev) => ({
      ...prev,
      openrouter: sortModelOptionsByPrice(modelsResult.data.map((item) => ({
        id: item.modelId,
        label: buildOpenRouterModelLabel({
          displayName: item.displayName,
          promptPrice: item.promptPrice,
          completionPrice: item.completionPrice,
        }),
        name: item.displayName,
        displayName: item.displayName,
        description: item.description,
        priceLabel: buildOpenRouterPriceLabel({
          promptPrice: item.promptPrice,
          completionPrice: item.completionPrice,
        }),
        provider: 'openrouter',
        capabilities: item.capabilities,
        promptPrice: item.promptPrice,
        completionPrice: item.completionPrice,
        requestPrice: item.requestPrice,
        imagePrice: item.imagePrice,
      }))),
    }))
  }, [loadKeys, loadLocalEndpoints, migrateLegacyProviderMeta])

  useEffect(() => {
    let active = true

    const init = async () => {
      setLoading(true)
      await hydrateAiConfigState()
      await refreshData()
      if (active) setLoading(false)
    }

    void init()

    return () => {
      active = false
    }
  }, [refreshData, hydrateAiConfigState])

  const activeGen = useMemo(
    () => keys.find((key) => key.is_active_gen) || localEndpoints.find((endpoint) => endpoint.is_active_gen),
    [keys, localEndpoints]
  )

  const activeImprove = useMemo(
    () => keys.find((key) => key.is_active_improve) || localEndpoints.find((endpoint) => endpoint.is_active_improve),
    [keys, localEndpoints]
  )

  const activeVision = useMemo(
    () => keys.find((key) => key.is_active_vision) || localEndpoints.find((endpoint) => endpoint.is_active_vision),
    [keys, localEndpoints]
  )

  const activeGeneral = useMemo(
    () => keys.find((key) => key.is_active_general) || localEndpoints.find((endpoint) => endpoint.is_active_general),
    [keys, localEndpoints]
  )

  const configuredCount = keys.length + localEndpoints.length

  const providerOptions = useMemo<ProviderOption[]>(() => {
    const cloudProviders = keys.map((key) => ({
      id: key.provider,
      label: key.provider,
    }))

    const localProviders = localEndpoints.map((endpoint) => {
      const providerId = getLocalProviderId(endpoint)
      return {
        id: providerId,
        label: endpoint.name,
      }
    })

    const merged = [...cloudProviders, ...localProviders]
    const deduped = new Map<string, ProviderOption>()
    merged.forEach((item) => deduped.set(item.id, item))
    return Array.from(deduped.values())
  }, [keys, localEndpoints])

  const modelsByProvider = useMemo<Record<string, string[]>>(() => {
    const modelMap = new Map<string, Set<string>>()

    keys.forEach((key) => {
      const providerId = key.provider
      const models = [
        key.model_name,
        key.model_gen,
        key.model_improve,
        key.model_vision,
      ].filter(Boolean) as string[]

      const dynamic = (dynamicModels[providerId] || []).map((item) => item.id)
      const bucket = modelMap.get(providerId) || new Set<string>()
      ;[...models, ...dynamic].forEach((model) => bucket.add(model))
      modelMap.set(providerId, bucket)
    })

    localEndpoints.forEach((endpoint) => {
      const providerId = getLocalProviderId(endpoint)
      const models = [
        endpoint.model_name,
        endpoint.model_gen,
        endpoint.model_improve,
        endpoint.model_vision,
        endpoint.model_general,
      ].filter(Boolean) as string[]
      const bucket = modelMap.get(providerId) || new Set<string>()
      models.forEach((model) => bucket.add(model))
      modelMap.set(providerId, bucket)
    })

    const out: Record<string, string[]> = {}
    modelMap.forEach((value, key) => {
      out[key] = Array.from(value)
    })
    return out
  }, [keys, localEndpoints, dynamicModels])

  useEffect(() => {
    if (providerOptions.length === 0) return

    const fallbackProviderId = providerOptions[0].id

    const findSourceByProviderId = (providerId: string): ApiKeyInfo | LocalEndpoint | undefined => {
      const cloud = keys.find((key) => key.provider === providerId)
      if (cloud) return cloud

      const local = localEndpoints.find((endpoint) => getLocalProviderId(endpoint) === providerId)
      if (local) return local

      return undefined
    }

    setRoleRouting((prev) => {
      const next = { ...prev }
      const roleKeys: DashboardRole[] = ['generation', 'improvement', 'vision', 'general']
      let changed = false

      roleKeys.forEach((role) => {
        const current = next[role]

        const preferredSource = role === 'generation'
          ? activeGen
          : role === 'improvement'
            ? activeImprove
            : role === 'vision'
              ? activeVision
              : activeGeneral

        const preferredProvider = getSourceProviderId(preferredSource)

        const providerId = current.providerId || preferredProvider || fallbackProviderId

        const models = modelsByProvider[providerId] || []

        const routedSource = findSourceByProviderId(providerId)
        const preferredModel = getSourceModelId(routedSource || preferredSource, role)
        const fallbackModel = models[0] || ''

        const nextModelId = models.includes(preferredModel) ? preferredModel : fallbackModel
        const modelId = current.modelId || nextModelId
        const finalModelId = modelId

        if (providerId !== current.providerId || finalModelId !== current.modelId) {
          next[role] = {
            ...current,
            providerId,
            modelId: finalModelId,
          }
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [providerOptions, modelsByProvider, activeGen, activeImprove, activeVision, activeGeneral, keys, localEndpoints])

  const updateRoleRouting = useCallback((role: DashboardRole, patch: Partial<RoleRouteSelection>) => {
    setRoleRouting((prev) => {
      const current = prev[role]
      const nextProvider = patch.providerId ?? current.providerId
      const nextModel = patch.modelId ?? current.modelId

      const shouldPickDefaultModel = Object.prototype.hasOwnProperty.call(patch, 'providerId') && !patch.modelId
      const defaultModel = shouldPickDefaultModel ? (modelsByProvider[nextProvider] || [])[0] || '' : nextModel

      return {
        ...prev,
        [role]: {
          ...current,
          ...patch,
          providerId: nextProvider,
          modelId: defaultModel,
        },
      }
    })
  }, [modelsByProvider])

  if (loading && keys.length === 0 && localEndpoints.length === 0) {
    return (
      <div className="no-drag-region h-full flex items-center justify-center">
        <p className="text-sm text-night-400">Loading AI configuration...</p>
      </div>
    )
  }

  return (
    <div className="no-drag-region h-full overflow-y-auto px-8 pt-8 pb-10">
      <div className="w-full min-[1200px]:w-[1200px] min-[1200px]:mx-auto">
        {view === 'dashboard' ? (
          <Dashboard
            onConfigure={() => setView('wizard')}
            configuredCount={configuredCount}
            keys={keys}
            localEndpoints={localEndpoints}
            dynamicModels={dynamicModels}
            setDynamicModels={setDynamicModels}
            onRefreshData={refreshData}
            getToken={getToken}
            providerOptions={providerOptions}
            modelsByProvider={modelsByProvider}
            roleRouting={roleRouting}
            onChangeRoleRouting={updateRoleRouting}
          />
        ) : (
          <ConfigurationWizard
            keys={keys}
            localEndpoints={localEndpoints}
            onBack={() => setView('dashboard')}
            onComplete={() => {
              void refreshData()
              setView('dashboard')
            }}
            loadKeys={loadKeys}
            loadLocalEndpoints={loadLocalEndpoints}
            getToken={getToken}
            dynamicModels={dynamicModels}
            setDynamicModels={setDynamicModels}
          />
        )}
      </div>
    </div>
  )
}

export default AIConfig
