import { useState, type Dispatch, type SetStateAction } from 'react'
import { BookOpen, Eye, Loader2, Settings, Sparkles, Wand2 } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import ModelSelector from '../../components/ModelSelector'
import type { ApiKeyInfo, LocalEndpoint, ModelOption } from './types'
import { useLanguage } from '../../contexts/LanguageContext'

type DashboardRole = 'generation' | 'improvement' | 'vision' | 'general'

interface RoleRouteSelection {
  enabled: boolean
  providerId: string
  modelId: string
}

interface ProviderOption {
  id: string
  label: string
}

interface DashboardProps {
  onConfigure: () => void
  configuredCount: number
  keys: ApiKeyInfo[]
  localEndpoints: LocalEndpoint[]
  dynamicModels: Record<string, ModelOption[]>
  setDynamicModels: Dispatch<SetStateAction<Record<string, ModelOption[]>>>
  onRefreshData: () => Promise<void>
  getToken: () => Promise<string>
  providerOptions: ProviderOption[]
  modelsByProvider: Record<string, string[]>
  roleRouting: Record<DashboardRole, RoleRouteSelection>
  onChangeRoleRouting: (role: DashboardRole, patch: Partial<RoleRouteSelection>) => void
}

const ROLE_META: Record<DashboardRole, {
  label: string
  description: string
  icon: React.ReactNode
  iconClass: string
  cardClass: string
}> = {
  generation: {
    label: 'Generation',
    description: 'Creates prompts from your ideas using advanced reasoning.',
    icon: <Sparkles className="w-5 h-5" />,
    iconClass: 'bg-amber-500/15 text-amber-300',
    cardClass: 'border-amber-500/25 bg-amber-500/5',
  },
  improvement: {
    label: 'Improvement',
    description: 'Refines and enhances your prompts with expert techniques.',
    icon: <Wand2 className="w-5 h-5" />,
    iconClass: 'bg-cyan-500/15 text-cyan-300',
    cardClass: 'border-cyan-500/25 bg-cyan-500/5',
  },
  vision: {
    label: 'Vision',
    description: 'Analyzes characters and images for style replication.',
    icon: <Eye className="w-5 h-5" />,
    iconClass: 'bg-violet-500/15 text-violet-300',
    cardClass: 'border-violet-500/25 bg-violet-500/5',
  },
  general: {
    label: 'Research & Reasoning',
    description: 'Used for style analysis, deep reasoning and recommendations.',
    icon: <BookOpen className="w-5 h-5" />,
    iconClass: 'bg-blue-500/15 text-blue-300',
    cardClass: 'border-blue-500/25 bg-blue-500/5',
  },
}

function formatProviderLabel(id: string): string {
  const MAP: Record<string, string> = {
    openrouter: 'OpenRouter',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
  }
  return MAP[id] || id.charAt(0).toUpperCase() + id.slice(1)
}

const ROLES: DashboardRole[] = ['generation', 'improvement', 'vision', 'general']

function matchesRoleCapability(role: DashboardRole, model: ModelOption): boolean {
  const capabilities = model.capabilities || []
  if (role === 'vision') return capabilities.includes('vision')
  if (role === 'general') {
    return capabilities.includes('reasoning') || capabilities.includes('web_search')
  }
  return true
}

export function Dashboard({
  onConfigure,
  configuredCount,
  dynamicModels,
  setDynamicModels,
  getToken,
  providerOptions,
  modelsByProvider,
  roleRouting,
  onChangeRoleRouting,
}: DashboardProps) {
  const { t } = useLanguage()
  void setDynamicModels
  void getToken

  const [testingRole, setTestingRole] = useState<DashboardRole | null>(null)
  const [activatingRole, setActivatingRole] = useState<DashboardRole | null>(null)
  const [latencyByRole, setLatencyByRole] = useState<Record<DashboardRole, number | null>>({
    generation: null,
    improvement: null,
    vision: null,
    general: null,
  })

  async function probeRoleLatency(role: DashboardRole): Promise<number> {
    const routing = roleRouting[role]
    const startedAt = performance.now()

    if (routing.providerId === 'openrouter') {
      const ping = await window.electronAPI.settings.testOpenRouter()
      if (ping.error || !ping.data?.ok) {
        throw new Error(ping.error || 'OpenRouter connection test failed')
      }
      return Math.max(1, Math.round(performance.now() - startedAt))
    }

    const result = await window.electronAPI.ai.testChatCompletion({
      providerId: routing.providerId,
      modelId: routing.modelId,
      role,
    })

    if (result.error || !result.data?.ok) {
      throw new Error(result.error || 'Test request failed')
    }

    return Math.max(1, Math.round(performance.now() - startedAt))
  }

  async function handleTest(role: DashboardRole) {
    const routing = roleRouting[role]
    if (!routing.providerId) {
      notifications.show({ message: 'Select a provider first', color: 'red' })
      return
    }
    if (!routing.modelId) {
      notifications.show({ message: 'Select a model first', color: 'red' })
      return
    }

    console.log('[ai-dashboard] testChatCompletion request', {
      role,
      providerId: routing.providerId,
      modelId: routing.modelId,
    })

    setTestingRole(role)
    try {
      const latencyMs = await probeRoleLatency(role)

      notifications.show({
        message: `Test successful (${latencyMs} ms)`,
        color: 'green',
      })
    } catch (error) {
      console.warn('[ai-dashboard] testChatCompletion failed', error)
      notifications.show({
        message: error instanceof Error ? error.message : 'Test request failed',
        color: 'red',
      })
    } finally {
      setTestingRole(null)
    }
  }

  async function handleActivate(role: DashboardRole) {
    const routing = roleRouting[role]
    if (!routing.providerId || !routing.modelId) {
      notifications.show({ message: 'Select a provider and model first', color: 'red' })
      return
    }

    setActivatingRole(role)
    try {
      const latencyMs = await probeRoleLatency(role)
      onChangeRoleRouting(role, { enabled: true })
      setLatencyByRole((prev) => ({ ...prev, [role]: latencyMs }))
      notifications.show({
        message: `${ROLE_META[role].label} activated (${latencyMs} ms)` ,
        color: 'green',
      })
    } catch (error) {
      onChangeRoleRouting(role, { enabled: false })
      notifications.show({
        message: error instanceof Error ? error.message : 'Activation failed',
        color: 'red',
      })
    } finally {
      setActivatingRole(null)
    }
  }

  function getRoleModelOptions(role: DashboardRole, providerId: string, selectedModelId: string): ModelOption[] {
    const dynamicProviderModels = dynamicModels[providerId]
    if (dynamicProviderModels && dynamicProviderModels.length > 0) {
      const filtered = dynamicProviderModels.filter((model) => matchesRoleCapability(role, model))
      if (selectedModelId && !filtered.some((m) => m.id === selectedModelId)) {
        const selected = dynamicProviderModels.find((m) => m.id === selectedModelId)
        return selected ? [selected, ...filtered] : filtered
      }
      return filtered
    }

    const fallback: ModelOption[] = (modelsByProvider[providerId] || []).map((modelId) => ({
      id: modelId,
      name: modelId,
      displayName: modelId,
      provider: providerId,
      capabilities: modelId.toLowerCase().includes('vision') ? ['vision'] : ['text'],
    }))

    const filtered = fallback.filter((model) => matchesRoleCapability(role, model))
    if (selectedModelId && !filtered.some((m) => m.id === selectedModelId)) {
      const selected = fallback.find((m) => m.id === selectedModelId)
      return selected ? [selected, ...filtered] : filtered
    }
    return filtered
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">{t('aiConfig.title')}</h1>
        <p className="text-sm text-night-400 mt-1">{t('aiConfig.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {ROLES.map((role) => {
            const meta = ROLE_META[role]
            const routing = roleRouting[role]
            const modelOptions = getRoleModelOptions(role, routing.providerId, routing.modelId)
            const canActivate = Boolean(routing.providerId && routing.modelId)
            const isRoleActive = Boolean(routing.enabled && canActivate)
            const roleLatency = latencyByRole[role]

            return (
              <section key={role} className={`rounded-2xl border p-5 ${meta.cardClass}`}>
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.iconClass}`}>
                    {meta.icon}
                  </div>
                  <div className="text-right">
                    {isRoleActive ? (
                      <>
                        <span className="text-[10px] px-2 py-0.5 rounded-md border border-teal-500/40 bg-teal-500/10 text-teal-300 font-semibold uppercase tracking-wide">Active</span>
                        {roleLatency !== null ? (
                          <div className="text-[11px] text-teal-200 mt-1">Latency: {roleLatency} ms</div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] px-2 py-0.5 rounded-md border border-slate-500/40 bg-slate-500/10 text-slate-300 font-semibold uppercase tracking-wide">Inactive</span>
                        {roleLatency !== null ? (
                          <div className="text-[11px] text-slate-300 mt-1">Last latency: {roleLatency} ms</div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <p className="text-2xl font-semibold text-white mb-1">{meta.label}</p>
                <p className="text-sm text-night-300 mb-5">{meta.description}</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium tracking-widest uppercase text-night-400 mb-1.5">Provider</label>
                    <select
                      className="w-full rounded-2xl border border-cyan-500/35 bg-slate-800/90 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50"
                      value={routing.providerId}
                      onChange={(event) =>
                        onChangeRoleRouting(role, { providerId: event.target.value, modelId: '', enabled: false })
                      }
                      aria-label={`${meta.label} provider`}
                    >
                      {providerOptions.length === 0 ? (
                        <option value="">No providers configured</option>
                      ) : (
                        providerOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatProviderLabel(p.label || p.id)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium tracking-widest uppercase text-night-400 mb-1.5">Model</label>
                    <ModelSelector
                      value={routing.modelId}
                      onChange={(modelId) => {
                        onChangeRoleRouting(role, { modelId, enabled: false })
                        setLatencyByRole((prev) => ({ ...prev, [role]: null }))
                      }}
                      models={modelOptions}
                      placeholder="Select model..."
                      sortMode="cheapest"
                      className="w-full"
                    />

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleActivate(role)}
                        disabled={activatingRole === role || !canActivate || isRoleActive}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500/90 text-slate-950 border border-teal-400 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {activatingRole === role ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isRoleActive ? 'Activated' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTest(role)}
                        disabled={testingRole === role || !canActivate}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 text-night-100 border border-slate-700 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {testingRole === role ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Test
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-night-900 bg-white hover:bg-night-100 transition-colors"
          onClick={onConfigure}
          title="Open configuration wizard"
        >
          <Settings className="w-4 h-4" />
          Configure Providers
        </button>
        <p className="text-xs text-night-400">{configuredCount} provider currently configured</p>
      </div>
    </div>
  )
}
