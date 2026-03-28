import { useState } from 'react'
import { ArrowLeft, Check, Cpu } from 'lucide-react'
import { toast } from 'sonner'

import { LocalEndpointCard } from '../../components/LocalEndpointCard'
import { LOCAL_PROVIDERS, type AIRole } from '../../lib/constants'
import { PROVIDERS as PROVIDER_LIST } from '../../lib/providers'
import { syncTaskModel } from '../../hooks/useTaskModels'
import { ProviderConfigForm } from './ProviderConfigForm'
import type { ApiKeyInfo, LocalEndpoint, ModelOption } from './types'

interface ConfigurationWizardProps {
  keys: ApiKeyInfo[]
  localEndpoints: LocalEndpoint[]
  onComplete: () => void
  onBack: () => void
  loadKeys: () => Promise<void>
  loadLocalEndpoints: () => Promise<void>
  getToken: () => Promise<string>
  dynamicModels: Record<string, ModelOption[]>
  setDynamicModels: React.Dispatch<React.SetStateAction<Record<string, ModelOption[]>>>
}

function getModelForRole(endpoint: LocalEndpoint | undefined, role: AIRole): string | undefined {
  if (!endpoint) return undefined
  if (role === 'generation' && endpoint.model_gen) return endpoint.model_gen
  if (role === 'improvement' && endpoint.model_improve) return endpoint.model_improve
  if (role === 'vision' && endpoint.model_vision) return endpoint.model_vision
  if (role === 'general' && endpoint.model_general) return endpoint.model_general
  return endpoint.model_name
}

async function readEndpoints(): Promise<LocalEndpoint[]> {
  const result = await window.electronAPI.settings.getLocalEndpoints()
  if (result.error || !result.data) return []
  return result.data as LocalEndpoint[]
}

async function writeEndpoints(next: LocalEndpoint[]) {
  const result = await window.electronAPI.settings.saveLocalEndpoints(next)
  if (result.error) throw new Error(result.error)
}

async function upsertEndpoint({
  provider,
  name,
  baseUrl,
  modelGen,
  modelImprove,
  modelVision,
  modelGeneral,
}: {
  provider: string
  name: string
  baseUrl: string
  modelGen: string
  modelImprove: string
  modelVision: string
  modelGeneral: string
}) {
  const endpoints = await readEndpoints()
  const existing = endpoints.find((item) => item.provider === provider)

  const nextRecord: LocalEndpoint = {
    id: existing?.id || `${provider}-${crypto.randomUUID()}`,
    provider,
    name,
    baseUrl,
    model_name: modelGen,
    model_gen: modelGen,
    model_improve: modelImprove,
    model_vision: modelVision,
    model_general: modelGeneral,
    is_active: existing?.is_active || false,
    is_active_gen: existing?.is_active_gen || false,
    is_active_improve: existing?.is_active_improve || false,
    is_active_vision: existing?.is_active_vision || false,
    is_active_general: existing?.is_active_general || false,
    updated_at: new Date().toISOString(),
  }

  const filtered = endpoints.filter((item) => item.provider !== provider)
  await writeEndpoints([...filtered, nextRecord])
}

async function removeEndpoint(provider: string) {
  const endpoints = await readEndpoints()
  await writeEndpoints(endpoints.filter((item) => item.provider !== provider))
}

async function toggleLocalRole(provider: string, role: AIRole) {
  const endpoints = await readEndpoints()

  const next = endpoints.map((endpoint) => {
    if (endpoint.provider !== provider)
      return {
        ...endpoint,
        is_active_gen: false,
        is_active_improve: false,
        is_active_vision: false,
        is_active_general: false,
      }

    const isRoleActive = role === 'generation'
      ? endpoint.is_active_gen
      : role === 'improvement'
        ? endpoint.is_active_improve
        : role === 'vision'
          ? endpoint.is_active_vision
          : endpoint.is_active_general

    return {
      ...endpoint,
      is_active: true,
      is_active_gen: role === 'generation' ? !isRoleActive : false,
      is_active_improve: role === 'improvement' ? !isRoleActive : false,
      is_active_vision: role === 'vision' ? !isRoleActive : false,
      is_active_general: role === 'general' ? !isRoleActive : false,
      updated_at: new Date().toISOString(),
    }
  })

  await writeEndpoints(next)
}

export function ConfigurationWizard({
  keys,
  localEndpoints,
  onComplete,
  onBack,
  loadKeys,
  loadLocalEndpoints,
  getToken,
  dynamicModels,
  setDynamicModels,
}: ConfigurationWizardProps) {
  void getToken

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors mb-6 -ml-1"
      >
        <ArrowLeft size={16} /> Back to AI Configuration
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Configure your Providers</h2>
        <p className="text-slate-400 text-sm mt-2">Enter API keys or connection details for your chosen providers.</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          {PROVIDER_LIST.map((provider) => {
            const keyInfo = keys.find((k) => k.provider === provider.id)

            return (
              <div key={provider.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
                <ProviderConfigForm
                  provider={provider}
                  keyInfo={keyInfo}
                  actionLoading={actionLoading}
                  setActionLoading={setActionLoading}
                  loadKeys={loadKeys}
                  loadLocalEndpoints={loadLocalEndpoints}
                  dynamicModels={dynamicModels[provider.id] || []}
                  setDynamicModels={setDynamicModels}
                  isGlobalActive={keyInfo?.is_active || false}
                />
              </div>
            )
          })}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cpu size={20} className="text-amber-400" /> Local Providers
          </h3>

          <div className="space-y-6">
            <LocalEndpointCard
              key={`local-${LOCAL_PROVIDERS.OLLAMA}-${localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.OLLAMA)?.updated_at || 'new'}`}
              type={LOCAL_PROVIDERS.OLLAMA}
              endpoint={localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.OLLAMA)}
              actionLoading={actionLoading}
              onSave={async (url, modelGen, modelImprove, modelVision, modelGeneral) => {
                setActionLoading('ollama')
                try {
                  await upsertEndpoint({
                    provider: LOCAL_PROVIDERS.OLLAMA,
                    name: 'Ollama',
                    baseUrl: url,
                    modelGen,
                    modelImprove,
                    modelVision,
                    modelGeneral,
                  })
                  await loadLocalEndpoints()
                  toast.success('Ollama config saved')
                } catch {
                  toast.error('Failed to save Ollama')
                } finally {
                  setActionLoading(null)
                }
              }}
              onDelete={async () => {
                setActionLoading('ollama-delete')
                try {
                  await removeEndpoint(LOCAL_PROVIDERS.OLLAMA)
                  await loadLocalEndpoints()
                  toast.success('Ollama removed')
                } catch {
                  toast.error('Failed to remove')
                } finally {
                  setActionLoading(null)
                }
              }}
              onSetActive={async (role) => {
                setActionLoading(`ollama-${role}`)
                try {
                  const endpoint = localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.OLLAMA)
                  const model = getModelForRole(endpoint, role)

                  await toggleLocalRole(LOCAL_PROVIDERS.OLLAMA, role)
                  if (model) syncTaskModel(role, LOCAL_PROVIDERS.OLLAMA, model)

                  await loadLocalEndpoints()
                  await loadKeys()
                } catch {
                  toast.error('Failed to toggle')
                } finally {
                  setActionLoading(null)
                }
              }}
            />

            <LocalEndpointCard
              key={`local-${LOCAL_PROVIDERS.LMSTUDIO}-${localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.LMSTUDIO)?.updated_at || 'new'}`}
              type={LOCAL_PROVIDERS.LMSTUDIO}
              endpoint={localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.LMSTUDIO)}
              actionLoading={actionLoading}
              onSave={async (url, modelGen, modelImprove, modelVision, modelGeneral) => {
                setActionLoading('lmstudio')
                try {
                  await upsertEndpoint({
                    provider: LOCAL_PROVIDERS.LMSTUDIO,
                    name: 'LM Studio',
                    baseUrl: url,
                    modelGen,
                    modelImprove,
                    modelVision,
                    modelGeneral,
                  })
                  await loadLocalEndpoints()
                  toast.success('LM Studio config saved')
                } catch {
                  toast.error('Failed to save LM Studio')
                } finally {
                  setActionLoading(null)
                }
              }}
              onDelete={async () => {
                setActionLoading('lmstudio-delete')
                try {
                  await removeEndpoint(LOCAL_PROVIDERS.LMSTUDIO)
                  await loadLocalEndpoints()
                  toast.success('LM Studio removed')
                } catch {
                  toast.error('Failed to remove')
                } finally {
                  setActionLoading(null)
                }
              }}
              onSetActive={async (role) => {
                setActionLoading(`lmstudio-${role}`)
                try {
                  const endpoint = localEndpoints.find((e) => e.provider === LOCAL_PROVIDERS.LMSTUDIO)
                  const model = getModelForRole(endpoint, role)

                  await toggleLocalRole(LOCAL_PROVIDERS.LMSTUDIO, role)
                  if (model) syncTaskModel(role, LOCAL_PROVIDERS.LMSTUDIO, model)

                  await loadLocalEndpoints()
                  await loadKeys()
                } catch {
                  toast.error('Failed to toggle')
                } finally {
                  setActionLoading(null)
                }
              }}
            />
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-800">
          <button
            onClick={onComplete}
            className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
          >
            <Check size={18} />
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
