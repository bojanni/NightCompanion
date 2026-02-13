import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Image,
  Compass,
  Wand2,
  LogOut,
  Flame,
  Settings,
  Fingerprint,
  FlaskConical,
  Coins,
  Wrench,
} from 'lucide-react';

interface LayoutProps {
  onSignOut: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generator', icon: Wand2, label: 'Generator' },
  { to: '/prompts', icon: Sparkles, label: 'Prompts' },
  { to: '/characters', icon: Users, label: 'Characters' },
  { to: '/gallery', icon: Image, label: 'Gallery' },
  { to: '/models', icon: Compass, label: 'Models' },
  { to: '/batch-testing', icon: FlaskConical, label: 'Batch Testing' },
  { to: '/style', icon: Fingerprint, label: 'Style Profile' },
  { to: '/cost-calculator', icon: Coins, label: 'Cost Calculator' },
  { to: '/tools', icon: Wrench, label: 'AI Tools' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ onSignOut }: LayoutProps) {
  const location = useLocation();

  // Define full-width pages (Dashboard, Prompts, Gallery)
  // Dashboard is '/'
  const isFullWidthPage = ['/', '/prompts', '/gallery'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">NightCafe</h1>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">Companion</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                  ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="page-wrapper-full">
          <div className={isFullWidthPage ? "w-full p-8" : "page-content-centered"}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
