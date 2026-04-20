import { useEffect, useMemo, useState } from 'react'
import type { GalleryItem, Prompt, Screen } from '../types'
import { subscribeDashboardCacheInvalidation } from '../lib/cacheEvents'
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton'
import { useLanguage } from '../contexts/LanguageContext'

interface CharacterDashboardItem {
  id: string
  name: string
  description: string
  images: Array<{ url: string; isMain: boolean }>
  createdAt: string
}

interface DashboardStats {
  promptCount: number
  styleProfileCount: number
  characterCount: number
}

interface DashboardProps {
  onNavigate: (screen: Screen, params?: Record<string, unknown>) => void
}

interface DashboardCache {
  cachedAt: number
  stats: DashboardStats
  recentPrompts: Prompt[]
  topCharacters: CharacterDashboardItem[]
  recentImages: GalleryItem[]
}

const DASHBOARD_CACHE_STALE_MS = 60_000
let dashboardCache: DashboardCache | null = null

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    promptCount: 0,
    styleProfileCount: 0,
    characterCount: 0,
  })
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([])
  const [topCharacters, setTopCharacters] = useState<CharacterDashboardItem[]>([])
  const [recentImages, setRecentImages] = useState<GalleryItem[]>([])

  function applyDashboardData(data: Omit<DashboardCache, 'cachedAt'>) {
    setStats(data.stats)
    setRecentPrompts(data.recentPrompts)
    setTopCharacters(data.topCharacters)
    setRecentImages(data.recentImages)
  }

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      const cache = dashboardCache
      const hasFreshCache = cache && Date.now() - cache.cachedAt < DASHBOARD_CACHE_STALE_MS
      if (hasFreshCache) {
        applyDashboardData({
          stats: cache.stats,
          recentPrompts: cache.recentPrompts,
          topCharacters: cache.topCharacters,
          recentImages: cache.recentImages,
        })
        setLoading(false)
        return
      }

      setLoading(true)

      const [promptsResult, styleProfilesResult, charactersResult, galleryResult] = await Promise.all([
        window.electronAPI.prompts.list(),
        window.electronAPI.styleProfiles.list(),
        window.electronAPI.characters.list(),
        window.electronAPI.gallery.list({ page: 0 }),
      ])

      if (ignore) return

      const prompts = promptsResult.error ? [] : promptsResult.data || []
      const styleProfiles = styleProfilesResult.error ? [] : styleProfilesResult.data || []
      const characters = charactersResult.error ? [] : charactersResult.data || []
      const galleryItems = galleryResult.error ? [] : galleryResult.data?.items || []

      // Include prompt-backed images (like useGalleryState does)
      const promptImages = prompts
        .filter((prompt) => Boolean(String(prompt.imageUrl || '').trim()))
        .map((prompt) => ({
          id: `prompt-${prompt.id}`,
          title: prompt.title || null,
          imageUrl: prompt.imageUrl || null,
          videoUrl: null,
          thumbnailUrl: null,
          mediaType: 'image' as const,
          promptUsed: prompt.promptText || null,
          promptId: String(prompt.id),
          model: prompt.model || null,
          aspectRatio: null,
          rating: typeof prompt.rating === 'number' && Number.isFinite(prompt.rating)
            ? Math.max(0, Math.min(5, Math.round(prompt.rating)))
            : 0,
          notes: prompt.notes || null,
          collectionId: null,
          storageMode: 'file' as const,
          durationSeconds: null,
          metadata: { source: 'prompt', promptId: prompt.id } as Record<string, unknown>,
          createdAt: prompt.createdAt,
          updatedAt: prompt.updatedAt,
        }))

      const allItems = [...galleryItems, ...promptImages]
      const imageItems = allItems
        .filter((item) => item.mediaType === 'image')
        .filter((item) => Boolean(item.imageUrl))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 12)

      const data = {
        stats: {
          promptCount: prompts.length,
          styleProfileCount: styleProfiles.length,
          characterCount: characters.length,
        },
        recentPrompts: prompts.slice(0, 5),
        topCharacters: characters.slice(0, 3),
        recentImages: imageItems,
      }

      dashboardCache = {
        ...data,
        cachedAt: Date.now(),
      }

      applyDashboardData(data)
      setLoading(false)
    }

    loadDashboard()

    const unsubscribe = subscribeDashboardCacheInvalidation(() => {
      dashboardCache = null
      if (!ignore) {
        loadDashboard()
      }
    })

    return () => {
      ignore = true
      unsubscribe()
    }
  }, [])

  const cards = useMemo(
    () => [
      {
        label: 'Prompts',
        value: stats.promptCount,
        icon: '✦',
        gradient: 'from-amber-500 to-orange-600',
        target: 'library' as Screen,
      },
      {
        label: 'Style Profiles',
        value: stats.styleProfileCount,
        icon: '◈',
        gradient: 'from-teal-500 to-emerald-600',
        target: 'style-profiles' as Screen,
      },
      {
        label: 'Characters',
        value: stats.characterCount,
        icon: '◉',
        gradient: 'from-blue-500 to-cyan-600',
        target: 'characters' as Screen,
      },
    ],
    [stats]
  )

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-8 pt-8 pb-5 no-drag-region"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-night-400">{t('dashboard.subtitle')}</p>
      </div>

      <div
        className="overflow-y-auto flex-1 px-8 pb-8 space-y-6 no-drag-region"
      >
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => onNavigate(card.target)}
                  className="p-5 text-left transition-all card hover:border-night-500/70 group"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-glow-sm`}>
                      <span className="text-base text-white">{card.icon}</span>
                    </div>
                    <span className="text-3xl font-semibold text-white">{card.value}</span>
                  </div>
                  <p className="text-sm transition-colors text-night-400 group-hover:text-night-300">{card.label}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="p-6 xl:col-span-2 card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">{t('dashboard.recentPrompts')}</h2>
                  <button onClick={() => onNavigate('library')} className="text-sm text-glow-blue hover:underline">
                    {t('dashboard.viewAll')}
                  </button>
                </div>

                {recentPrompts.length === 0 ? (
                  <div className="py-10 text-center text-night-500">{t('dashboard.emptyPrompts')}</div>
                ) : (
                  <div className="space-y-3">
                    {recentPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => onNavigate('library')}
                        className="p-3 w-full text-left rounded-xl transition-colors bg-night-800/60 hover:bg-night-800"
                      >
                        <div className="flex gap-2 items-center">
                          <h3 className="text-sm font-medium text-white truncate">{prompt.title || 'Untitled'}</h3>
                        </div>
                        <p className="mt-1 text-xs truncate text-night-400">{prompt.promptText}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">{t('dashboard.topCharacters')}</h2>
                  <button onClick={() => onNavigate('characters')} className="text-sm text-glow-blue hover:underline">
                    {t('dashboard.viewAll')}
                  </button>
                </div>

                {topCharacters.length === 0 ? (
                  <div className="py-10 text-center text-night-500">{t('dashboard.emptyCharacters')}</div>
                ) : (
                  <div className="space-y-3">
                    {topCharacters.map((character) => {
                      const mainImage = character.images.find((image) => image.isMain)?.url || character.images[0]?.url

                      return (
                        <button
                          key={character.id}
                          onClick={() => onNavigate('characters')}
                          className="relative w-full h-28 max-h-28 overflow-hidden rounded-xl border border-night-700/60 bg-night-900/50 text-left transition-colors hover:border-night-500/70"
                        >
                          {mainImage ? (
                            <img src={mainImage} alt={character.name} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-night-800 text-night-500">◉</div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

                          <div className="absolute inset-x-0 bottom-0 p-3 min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate">{character.name}</h3>
                            <p className="text-xs text-night-200/90 truncate">
                              {character.description || t('dashboard.emptyCharacterDescription')}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">{t('dashboard.recentImages')}</h2>
                <button onClick={() => onNavigate('gallery')} className="text-sm text-glow-blue hover:underline">
                  {t('dashboard.viewAll')}
                </button>
              </div>

              {recentImages.length === 0 ? (
                <div className="py-10 text-center text-night-500">{t('dashboard.emptyImages')}</div>
              ) : (
                <div className="flex overflow-x-auto gap-3 pb-2">
                  {recentImages.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate('gallery', { imageId: item.id })}
                      className="flex-shrink-0 w-[300px]"
                      title={item.title || undefined}
                      aria-label={item.title ? `Open Gallery: ${item.title}` : 'Open Gallery'}
                    >
                      <div className="overflow-hidden relative w-[300px] h-48 rounded-xl border transition-colors border-night-700/60 bg-night-900/50 hover:border-night-500/70">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title || 'Gallery item'}
                            className="object-cover w-full h-full"
                            onError={(event) => {
                              ;(event.currentTarget.parentElement as HTMLDivElement | null)?.classList.add('hidden')
                            }}
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 text-[11px] text-night-400 truncate">
                        {item.title || 'Untitled'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  )
}
