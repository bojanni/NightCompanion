import type { Screen } from '../types'
import TokenCostWidget from './TokenCostWidget'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../contexts/LanguageContext'

type NavItem = {
  id: Screen
  label: string
  icon: string
  iconColorClass: string
  description: string
}

function getNavItems(t: (key: TranslationKey) => string): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: t('sidebar.nav.dashboard.label'),
      icon: '◬',
      iconColorClass: 'text-teal-300',
      description: t('sidebar.nav.dashboard.description'),
    },
    {
      id: 'generator',
      label: t('sidebar.nav.generator.label'),
      icon: '⚡',
      iconColorClass: 'text-glow-amber',
      description: t('sidebar.nav.generator.description'),
    },
    {
      id: 'library',
      label: t('sidebar.nav.library.label'),
      icon: '✦',
      iconColorClass: 'text-glow-soft',
      description: t('sidebar.nav.library.description'),
    },
    {
      id: 'characters',
      label: t('sidebar.nav.characters.label'),
      icon: '◉',
      iconColorClass: 'text-glow-pink',
      description: t('sidebar.nav.characters.description'),
    },
    {
      id: 'style-profiles',
      label: t('sidebar.nav.styleProfiles.label'),
      icon: '◈',
      iconColorClass: 'text-glow-blue',
      description: t('sidebar.nav.styleProfiles.description'),
    },
    {
      id: 'gallery',
      label: t('sidebar.nav.gallery.label'),
      icon: '▣',
      iconColorClass: 'text-teal-400',
      description: t('sidebar.nav.gallery.description'),
    },
    {
      id: 'usage',
      label: t('sidebar.nav.usage.label'),
      icon: '◷',
      iconColorClass: 'text-glow-cyan',
      description: t('sidebar.nav.usage.description'),
    },
    {
      id: 'settings',
      label: t('sidebar.nav.settings.label'),
      icon: '⚙',
      iconColorClass: 'text-glow-amber',
      description: t('sidebar.nav.settings.description'),
    },
    {
      id: 'ai-config',
      label: t('sidebar.nav.aiConfig.label'),
      icon: '✧',
      iconColorClass: 'text-glow-soft',
      description: t('sidebar.nav.aiConfig.description'),
    },
  ]
}

type Props = {
  activeScreen: Screen
  onNavigate: (screen: Screen) => void
}

export default function Sidebar({ activeScreen, onNavigate }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const navItems = getNavItems(t)

  return (
    <aside className="w-[270px] flex-shrink-0 flex flex-col bg-gradient-sidebar border-r border-slate-900/50 pt-10">
      {/* Logo */}
      <div className="px-5 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-glow-purple to-glow-blue flex items-center justify-center shadow-glow-sm">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">NightCompanion</div>
            <div className="text-[10px] text-slate-500 tracking-wider uppercase">{t('sidebar.logoSub')}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 space-y-1 pb-4">
        {navItems.map((item) => {
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
              <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
                <span
                  className={`text-base transition-colors ${
                    isActive ? item.iconColorClass : `${item.iconColorClass} opacity-70 group-hover:opacity-100`
                  } flex h-6 w-6 items-center justify-center text-center leading-none`}
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
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
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{t('sidebar.language.title')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${language === 'en' ? 'border-glow-blue/40 bg-glow-blue/15 text-white' : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'}`}
            >
              {t('sidebar.language.english')}
            </button>
            <button
              type="button"
              onClick={() => setLanguage('nl')}
              className={`rounded-lg border px-2 py-1.5 text-[11px] transition-colors ${language === 'nl' ? 'border-glow-blue/40 bg-glow-blue/15 text-white' : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'}`}
            >
              {t('sidebar.language.dutch')}
            </button>
          </div>
        </div>
        <TokenCostWidget onNavigate={onNavigate} />
        <div className="text-[10px] text-slate-600 text-center tracking-wide">
          NightCompanion v0.1
        </div>
      </div>
    </aside>
  )
}
