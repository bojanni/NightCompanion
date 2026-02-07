const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-api-keys`;

async function callKeyService(action: string, payload: Record<string, unknown>, token: string) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
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
  updated_at: string;
}

export async function listApiKeys(token: string): Promise<ApiKeyInfo[]> {
  const { keys } = await callKeyService('list', {}, token);
  return keys;
}

export async function saveApiKey(provider: string, apiKey: string, token: string): Promise<{ hint: string; is_active: boolean }> {
  return callKeyService('save', { provider, apiKey }, token);
}

export async function deleteApiKey(provider: string, token: string): Promise<void> {
  await callKeyService('delete', { provider }, token);
}

export async function setActiveProvider(provider: string, token: string): Promise<void> {
  await callKeyService('set-active', { provider }, token);
}
