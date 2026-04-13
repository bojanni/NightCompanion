import { useState } from 'react'
import { ArrowLeft, Check, Cpu } from 'lucide-react'
import { notifications } from '@mantine/notifications'

import { LocalEndpointCard } from '../../components/LocalEndpointCard'
import { LOCAL_PROVIDERS } from '../../lib/constants'
import { PROVIDERS as PROVIDER_LIST } from '../../lib/providers'
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
  apiKey,
}: {
  provider: string
  name: string
  baseUrl: string
  apiKey?: string
}) {
  const endpoints = await readEndpoints()
  const existing = endpoints.find((item) => item.provider === provider)

  const nextRecord: LocalEndpoint = {
    id: existing?.id || `${provider}-${crypto.randomUUID()}`,
    provider,
    name,
    baseUrl,
    apiKey: typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : existing?.apiKey,
    model_name: existing?.model_name || '',
    model_gen: existing?.model_gen,
    model_improve: existing?.model_improve,
    model_vision: existing?.model_vision,
    model_general: existing?.model_general,
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
              onSave={async (url) => {
                setActionLoading('ollama')
                try {
                  await upsertEndpoint({
                    provider: LOCAL_PROVIDERS.OLLAMA,
                    name: 'Ollama',
                    baseUrl: url,
                    apiKey: undefined,
                  })
                  await loadLocalEndpoints()
                  notifications.show({ message: 'Ollama config saved', color: 'green' })
                } catch {
                  notifications.show({ message: 'Failed to save Ollama', color: 'red' })
                } finally {
                  setActionLoading(null)
                }
              }}
              onDelete={async () => {
                setActionLoading('ollama-delete')
                try {
                  await removeEndpoint(LOCAL_PROVIDERS.OLLAMA)
                  await loadLocalEndpoints()
                  notifications.show({ message: 'Ollama removed', color: 'green' })
                } catch {
                  notifications.show({ message: 'Failed to remove', color: 'red' })
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
              onSave={async (url, apiKey) => {
                setActionLoading('lmstudio')
                try {
                  await upsertEndpoint({
                    provider: LOCAL_PROVIDERS.LMSTUDIO,
                    name: 'LM Studio',
                    baseUrl: url,
                    apiKey,
                  })
                  await loadLocalEndpoints()
                  notifications.show({ message: 'LM Studio config saved', color: 'green' })
                } catch {
                  notifications.show({ message: 'Failed to save LM Studio', color: 'red' })
                } finally {
                  setActionLoading(null)
                }
              }}
              onDelete={async () => {
                setActionLoading('lmstudio-delete')
                try {
                  await removeEndpoint(LOCAL_PROVIDERS.LMSTUDIO)
                  await loadLocalEndpoints()
                  notifications.show({ message: 'LM Studio removed', color: 'green' })
                } catch {
                  notifications.show({ message: 'Failed to remove', color: 'red' })
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
