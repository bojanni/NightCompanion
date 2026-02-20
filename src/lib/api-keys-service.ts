import { AIRole } from './constants';
const API_URL = 'http://localhost:3000/api/user_api_keys';

async function callKeyService(method: string, endpoint: string = '', body?: Record<string, unknown>) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export interface ApiKeyInfo {
  provider: string;
  key_hint: string;
  is_active: boolean;
  is_active_gen: boolean;
  is_active_improve: boolean;
  is_active_vision?: boolean;
  model_name?: string;
  model_gen?: string;
  model_improve?: string;
  model_vision?: string;
  updated_at: string;
}

export interface LocalEndpoint {
  id: string;
  provider: 'ollama' | 'lmstudio';
  endpoint_url: string;
  model_name: string;
  model_gen?: string;
  model_improve?: string;
  model_vision?: string;
  is_active: boolean;
  is_active_gen: boolean;
  is_active_improve: boolean;
  is_active_vision?: boolean;
  updated_at: string;
}

export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  const { keys } = await callKeyService('GET');
  return keys;
}

export async function saveApiKey(provider: string, apiKey: string, modelName: string): Promise<{ hint: string; is_active: boolean }> {
  return callKeyService('POST', '', { action: 'save', provider, apiKey, modelName });
}

export async function deleteApiKey(provider: string): Promise<void> {
  // Try newer REST endpoint first, fallback to action-based if needed (but we implemented REST delete)
  await callKeyService('DELETE', `/${provider}`);
}

export async function setActiveProvider(provider: string, modelName: string, active: boolean = true, role?: AIRole): Promise<void> {
  await callKeyService('POST', '', { action: 'set-active', provider, modelName, active, role });
}

export async function updateModels(provider: string, modelGen: string, modelImprove: string, modelVision?: string): Promise<void> {
  await callKeyService('POST', '', { action: 'update-models', provider, modelGen, modelImprove, modelVision });
}
