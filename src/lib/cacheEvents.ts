type CacheInvalidationListener = () => void

const listeners: Set<CacheInvalidationListener> = new Set()

export function subscribeDashboardCacheInvalidation(listener: CacheInvalidationListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function invalidateDashboardCache(): void {
  for (const listener of listeners) {
    listener()
  }
}
