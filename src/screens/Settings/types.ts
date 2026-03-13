export interface ApiKeyInfo {
  id: string
  provider: string
  apiKeyMasked: string
  key_hint?: string
  model_name: string
  model_gen?: string
  model_improve?: string
  model_vision?: string
  is_active?: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
}

export interface LocalEndpoint {
  id: string
  provider?: string
  name: string
  baseUrl: string
  model_name: string
  model_gen?: string
  model_improve?: string
  model_vision?: string
  is_active?: boolean
  is_active_gen: boolean
  is_active_improve: boolean
  is_active_vision: boolean
  updated_at: string
}

export interface ModelOption {
  id: string
  name?: string
  label?: string
  provider?: string
  capabilities?: string[]
  promptPrice?: string | null
  completionPrice?: string | null
  requestPrice?: string | null
  imagePrice?: string | null
}
