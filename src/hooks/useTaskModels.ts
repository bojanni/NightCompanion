import type { AIRole } from '../lib/constants'

interface TaskModelMap {
  generation?: { provider: string; model: string }
  improvement?: { provider: string; model: string }
  vision?: { provider: string; model: string }
  general?: { provider: string; model: string }
}

export function syncTaskModel(role: AIRole, provider: string, model: string) {
  const raw = localStorage.getItem('taskModels')
  const parsed = raw ? (JSON.parse(raw) as TaskModelMap) : {}

  parsed[role] = { provider, model }
  localStorage.setItem('taskModels', JSON.stringify(parsed))
}
