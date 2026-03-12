import { useEffect, useMemo, useState } from 'react'
import type { GenerationEntry, Prompt, Screen, StyleProfile } from '../types'

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
  generationCount: number
}

interface DashboardProps {
  onNavigate: (screen: Screen) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    promptCount: 0,
    styleProfileCount: 0,
    characterCount: 0,
    generationCount: 0,
  })
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([])
  const [recentGenerations, setRecentGenerations] = useState<GenerationEntry[]>([])
  const [topCharacters, setTopCharacters] = useState<CharacterDashboardItem[]>([])

  useEffect(() => {
    let ignore = false

    async function loadDashboard() {
      setLoading(true)

      const [promptsResult, styleProfilesResult, generationResult, charactersResult] = await Promise.all([
        window.electronAPI.prompts.list(),
        window.electronAPI.styleProfiles.list(),
        window.electronAPI.generationLog.list(),
        window.electronAPI.characters.list(),
      ])

      if (ignore) return

      const prompts = promptsResult.error ? [] : promptsResult.data || []
      const styleProfiles = styleProfilesResult.error ? [] : styleProfilesResult.data || []
      const generations = generationResult.error ? [] : generationResult.data || []
      const characters = charactersResult.error ? [] : charactersResult.data || []

      setStats({
        promptCount: prompts.length,
        styleProfileCount: styleProfiles.length,
        characterCount: characters.length,
        generationCount: generations.length,
      })
      setRecentPrompts(prompts.slice(0, 5))
      setRecentGenerations(generations.slice(0, 6))
      setTopCharacters(characters.slice(0, 3))
      setLoading(false)
    }

    loadDashboard()

    return () => {
      ignore = true
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
      {
        label: 'Generation Log',
        value: stats.generationCount,
        icon: '⊞',
        gradient: 'from-rose-500 to-pink-600',
        target: 'generation-log' as Screen,
      },
    ],
    [stats]
  )

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-8 pt-8 pb-5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <h1 className="text-2xl font-semibold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-night-400 mt-1">Snel overzicht van je prompts, characters en resultaten.</p>
      </div>

      <div
        className="flex-1 overflow-y-auto px-8 pb-8 space-y-6"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-glow-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {cards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => onNavigate(card.target)}
                  className="card text-left p-5 hover:border-night-500/70 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-glow-sm`}>
                      <span className="text-white text-base">{card.icon}</span>
                    </div>
                    <span className="text-3xl font-semibold text-white">{card.value}</span>
                  </div>
                  <p className="text-sm text-night-400 group-hover:text-night-300 transition-colors">{card.label}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Recente Prompts</h2>
                  <button onClick={() => onNavigate('library')} className="text-sm text-glow-blue hover:underline">
                    Bekijk alles
                  </button>
                </div>

                {recentPrompts.length === 0 ? (
                  <div className="py-10 text-center text-night-500">Nog geen prompts opgeslagen.</div>
                ) : (
                  <div className="space-y-3">
                    {recentPrompts.map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => onNavigate('library')}
                        className="w-full text-left p-3 rounded-xl bg-night-800/60 hover:bg-night-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white truncate">{prompt.title || 'Untitled'}</h3>
                        </div>
                        <p className="text-xs text-night-400 mt-1 truncate">{prompt.promptText}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Top Characters</h2>
                  <button onClick={() => onNavigate('characters')} className="text-sm text-glow-blue hover:underline">
                    Bekijk alles
                  </button>
                </div>

                {topCharacters.length === 0 ? (
                  <div className="py-10 text-center text-night-500">Nog geen characters toegevoegd.</div>
                ) : (
                  <div className="space-y-3">
                    {topCharacters.map((character) => {
                      const mainImage = character.images.find((image) => image.isMain)?.url || character.images[0]?.url

                      return (
                        <button
                          key={character.id}
                          onClick={() => onNavigate('characters')}
                          className="w-full text-left p-3 rounded-xl bg-night-800/60 hover:bg-night-800 transition-colors flex items-center gap-3"
                        >
                          {mainImage ? (
                            <img src={mainImage} alt={character.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-night-700 flex items-center justify-center text-night-500">◉</div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium text-white truncate">{character.name}</h3>
                            <p className="text-xs text-night-400 truncate">{character.description || 'Geen beschrijving'}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recente Generation Log</h2>
                <button onClick={() => onNavigate('generation-log')} className="text-sm text-glow-blue hover:underline">
                  Bekijk alles
                </button>
              </div>

              {recentGenerations.length === 0 ? (
                <div className="py-10 text-center text-night-500">Nog geen generations gelogd.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {recentGenerations.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => onNavigate('generation-log')}
                      className="aspect-square rounded-xl overflow-hidden bg-night-800 group relative block"
                      title={entry.promptSnapshot || 'Generation'}
                    >
                      {entry.thumbnailUrl ? (
                        <img
                          src={entry.thumbnailUrl}
                          alt="Generation thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-night-600 text-lg">⊞</div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
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
