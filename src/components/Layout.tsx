import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
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
  Clock,
  ChevronLeft,
  ChevronRight,
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
  { to: '/timeline', icon: Clock, label: 'Timeline' },
  { to: '/cost-calculator', icon: Coins, label: 'Cost Calculator' },
  { to: '/tools', icon: Wrench, label: 'AI Tools' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ onSignOut }: LayoutProps) {
  const location = useLocation();

  // Define full-width pages (Dashboard, Gallery, Prompts)
  // Dashboard is '/'
  const isFullWidthPage = ['/', '/prompts', '/gallery', '/timeline'].includes(location.pathname);


  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex transition-all duration-300">
      <aside
        className={`bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40 transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'
          }`}
      >
        <div className={`px-6 py-5 border-b border-slate-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0`}>
              <Flame size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <h1 className="text-base font-bold text-white tracking-tight truncate">NightCafe</h1>
                <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase truncate">Companion</p>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className={`text-slate-500 hover:text-white transition-colors ${collapsed ? 'absolute left-1/2 -translate-x-1/2 top-20' : 'block'}`}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group whitespace-nowrap ${isActive
                  ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onSignOut}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all w-full whitespace-nowrap ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && (
              <span className="animate-in fade-in slide-in-from-left-2 duration-300">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'ml-20' : 'ml-64'
          }`}
      >
        <div className="antigravity-app-root flex-1 overflow-auto">
          {isFullWidthPage ? (
            <div className="w-full h-full p-8">{<Outlet />}</div>
          ) : (
            <div className="utility-page-centered p-8">
              <div className="content-inner w-full">
                {<Outlet />}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
