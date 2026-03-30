import type { Screen } from '../types'
import TokenCostWidget from './TokenCostWidget'

type NavItem = {
  id: Screen
  label: string
  icon: string
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '◬',
    description: 'Overview & quick actions',
  },
  {
    id: 'generator',
    label: 'Generator',
    icon: '⚡',
    description: 'Magic random (AI)',
  },
  {
    id: 'library',
    label: 'Prompt Library',
    icon: '✦',
    description: 'Browse & manage prompts',
  },
  {
    id: 'characters',
    label: 'Characters',
    icon: '◉',
    description: 'Reference cast sheets',
  },
  {
    id: 'style-profiles',
    label: 'Style Profiles',
    icon: '◈',
    description: 'Reusable style presets',
  },
  {
    id: 'generation-log',
    label: 'Generation Log',
    icon: '⊞',
    description: 'Track your creations',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: '▣',
    description: 'AI-generated media',
  },
  {
    id: 'usage',
    label: 'Usage',
    icon: '◷',
    description: 'Tokens & cost history',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙',
    description: 'OpenRouter credentials',
  },
  {
    id: 'ai-config',
    label: 'AI Configuration',
    icon: '✧',
    description: 'Provider & model routing',
  },
]

type Props = {
  activeScreen: Screen
  onNavigate: (screen: Screen) => void
}

export default function Sidebar({ activeScreen, onNavigate }: Props) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-gradient-sidebar border-r border-slate-900/50 pt-10">
      {/* Logo */}
      <div className="px-5 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glow-purple to-glow-blue flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">NightCompanion</div>
            <div className="text-[10px] text-slate-500 tracking-wider uppercase">NightCafe Studio</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeScreen
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full text-left px-3 py-3 rounded-xl transition-all duration-150 group
                ${isActive
                  ? 'bg-slate-700/80 border border-glow-purple/30 shadow-glow-sm'
                  : 'border border-transparent hover:bg-slate-800/60 hover:border-slate-700/30'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-base transition-colors ${
                    isActive ? 'text-glow-soft' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {item.icon}
                </span>
                <div>
                  <div
                    className={`text-sm font-medium leading-none mb-0.5 ${
                      isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-none">{item.description}</div>
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-slate-900/50 space-y-4">
        <TokenCostWidget onNavigate={onNavigate} />
        <div className="text-[10px] text-slate-600 text-center tracking-wide">
          NightCompanion v0.1
        </div>
      </div>
    </aside>
  )
}
