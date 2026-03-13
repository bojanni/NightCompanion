import type { Dispatch, SetStateAction } from 'react'
import { Eye, MessageSquare, Save, Settings, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiKeyInfo, LocalEndpoint, ModelOption } from './types'

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
  activeGen?: ApiKeyInfo | LocalEndpoint
  activeImprove?: ApiKeyInfo | LocalEndpoint
  activeVision?: ApiKeyInfo | LocalEndpoint
  activeResearch?: ApiKeyInfo | LocalEndpoint
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
  aiApiRequestLoggingEnabled: boolean
  onToggleAiApiRequestLogging: (enabled: boolean) => void
}

const ROLE_META: Record<DashboardRole, {
  label: string
  description: string
  icon: React.ReactNode
  iconBg: string
}> = {
  generation: {
    label: 'Generation',
    description: 'For generating creative prompts and ideas',
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: 'bg-violet-600',
  },
  improvement: {
    label: 'Improvement',
    description: 'For enhancing and refining existing prompts',
    icon: <Wand2 className="w-5 h-5" />,
    iconBg: 'bg-rose-600',
  },
  vision: {
    label: 'Vision',
    description: 'For analyzing and describing images',
    icon: <Eye className="w-5 h-5" />,
    iconBg: 'bg-cyan-600',
  },
  general: {
    label: 'General',
    description: 'For general AI assistance and queries',
    icon: <MessageSquare className="w-5 h-5" />,
    iconBg: 'bg-teal-600',
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

export function Dashboard({
  onConfigure,
  configuredCount,
  setDynamicModels,
  getToken,
  providerOptions,
  modelsByProvider,
  roleRouting,
  onChangeRoleRouting,
  aiApiRequestLoggingEnabled,
  onToggleAiApiRequestLogging,
}: DashboardProps) {
  void setDynamicModels
  void getToken

  const isActive = configuredCount > 0

  function handleSave() {
    toast.success('Configuration saved')
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Settings className="w-6 h-6 text-white" />
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-sm text-night-400">Configure AI providers and models for different tasks</p>
      </div>

      {/* AI Configuration card */}
      <div className="card p-6">

        {/* Card header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">AI Configuration</h2>
          <span
            className={`text-xs px-3 py-0.5 rounded-full font-medium ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-night-700 text-night-400'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Role rows */}
        <div className="space-y-0">
          {ROLES.map((role, index) => {
            const meta = ROLE_META[role]
            const routing = roleRouting[role]
            const models = modelsByProvider[routing.providerId] || []
            const isLast = index === ROLES.length - 1

            return (
              <div key={role}>
                <div className="flex gap-4 items-start py-1">

                  {/* Icon */}
                  <div
                    className={`mt-0.5 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white ${meta.iconBg}`}
                  >
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-white">{meta.label}</p>
                      <p className="text-xs text-night-400">{meta.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Provider */}
                      <div>
                        <label className="block text-xs text-night-400 mb-1.5">Provider</label>
                        <select
                          className="input w-full"
                          value={routing.providerId}
                          onChange={(event) =>
                            onChangeRoleRouting(role, { providerId: event.target.value, modelId: '' })
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

                      {/* Model */}
                      <div>
                        <label className="block text-xs text-night-400 mb-1.5">Model</label>
                        <select
                          className="input w-full"
                          value={routing.modelId}
                          onChange={(event) =>
                            onChangeRoleRouting(role, { modelId: event.target.value })
                          }
                          aria-label={`${meta.label} model`}
                        >
                          {models.length === 0 ? (
                            <option value="">No models available</option>
                          ) : (
                            models.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {!isLast && <div className="my-4 border-b border-night-700/50" />}
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-night-700/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">AI API request logging</p>
              <p className="text-xs text-night-400">Log AI request/response payloads to a local file for debugging</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aiApiRequestLoggingEnabled}
              onClick={() => onToggleAiApiRequestLogging(!aiApiRequestLoggingEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                aiApiRequestLoggingEnabled ? 'bg-teal-500' : 'bg-night-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiApiRequestLoggingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 transition-all duration-200"
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
          Save Configuration
        </button>

        <button
          className="px-4 py-3 rounded-xl text-sm font-medium text-night-300 border border-night-600/60
            hover:bg-night-700/40 hover:text-white transition-all duration-200"
          onClick={onConfigure}
          title="Open configuration wizard"
        >
          Manage Providers
        </button>
      </div>
    </div>
  )
}
