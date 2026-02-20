import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Wrench, Clock, ChevronLeft, ChevronRight,
  LayoutDashboard, Wand2, Sparkles, Users, Image as ImageIcon,
  Compass, FlaskConical, Fingerprint, Settings, Menu, Flame,
  Moon, Sun
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/generator', icon: Wand2, label: 'Generator' },
  { to: '/prompts', icon: Sparkles, label: 'Prompts' },
  { to: '/characters', icon: Users, label: 'Characters' },
  { to: '/gallery', icon: ImageIcon, label: 'Gallery' },
  { to: '/models', icon: Compass, label: 'Models' },
  { to: '/batch-testing', icon: FlaskConical, label: 'Batch Testing' },
  { to: '/style', icon: Fingerprint, label: 'Style Profile' },
  { to: '/timeline', icon: Clock, label: 'Timeline' },

  { to: '/tools', icon: Wrench, label: 'AI Tools' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// Full-width: these pages use all available horizontal space
const FULL_WIDTH_PAGES = ['/', '/prompts', '/gallery', '/timeline'];

export default function Layout() {
  const location = useLocation();
  const isFullWidthPage = FULL_WIDTH_PAGES.includes(location.pathname);

  const { theme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
    catch { return false; }
  });

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* ── Sidebar ── */}
      <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40 transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'}`}>

        <div className={`px-6 py-5 border-b border-slate-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
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
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Theme Toggle */}
        <div className={`px-3 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white hover:bg-slate-800 w-full ${collapsed ? 'justify-center' : ''}`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!collapsed && (
              <span className="animate-in fade-in slide-in-from-left-2 duration-300">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-x-hidden">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                ${isActive ? 'bg-amber-500/10 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                ${collapsed ? 'justify-center' : ''}`
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

      </aside>

      {/* ── Main ── */}
      <main className={`flex-1 min-h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {isFullWidthPage ? (
          /* Full-width: Generator, Prompts, Gallery, Timeline */
          <div className="w-full p-8">
            <Outlet />
          </div>
        ) : (
          /* Centered: all other pages — max 1400px, centered, min 1200px */
          <div className="w-full p-8">
            <div className="max-w-[1200px] min-w-[900px] mx-auto">
              <Outlet />
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
