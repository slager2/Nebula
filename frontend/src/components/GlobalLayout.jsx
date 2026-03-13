import { NavLink, Outlet } from 'react-router-dom';
import useStore from '../store/useStore';
import { useEffect } from 'react';

const navItems = [
  { to: '/profile', label: 'OPERATOR', icon: '⊕' },
  { to: '/terminal', label: 'TERMINAL', icon: '⌘' },
  { to: '/forge', label: 'FORGE', icon: '✦' },
  { to: '/universe', label: 'UNIVERSE', icon: '◎' },
];

export default function GlobalLayout() {
  const fetchProfile = useStore((s) => s.fetchProfile);
  const user = useStore((s) => s.user);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <div className="w-full h-screen bg-[#030014] overflow-hidden flex text-white font-['Inter',system-ui,sans-serif]">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col bg-black/60 backdrop-blur-xl border-r border-white/5 relative shrink-0">
        {/* Neon edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-500/40 to-transparent" />

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <h1 className="text-xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            NEBULA
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-slate-500 mt-1 uppercase">
            Life RPG System v2
          </p>
        </div>

        {/* Separator */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium tracking-wider transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] border border-transparent'
                }`
              }
            >
              <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user card */}
        <div className="mx-3 mb-4 p-4 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-wider text-slate-400">
              {user?.Username || 'LOADING...'}
            </span>
            <span className="text-xs font-mono text-blue-400">Lv.{user?.Level || 1}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              style={{
                width: `${user ? (user.EXP / (user.Level * 100)) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1 font-mono">
            {user?.EXP || 0} / {user ? user.Level * 100 : 100} XP
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
