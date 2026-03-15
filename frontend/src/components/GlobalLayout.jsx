import { NavLink, Outlet } from 'react-router-dom';
import useStore from '../store/useStore';
import { useEffect } from 'react';

const navItems = [
  { to: '/profile', label: 'OPERATOR', icon: '⊕' },
  { to: '/terminal', label: 'TERMINAL', icon: '⌘' },
  { to: '/forge', label: 'FORGE', icon: '✦' },
  { to: '/universe', label: 'UNIVERSE', icon: '◎' },
];

function getSyncState(rate) {
  if (rate >= 80) return { color: '#22d3ee', label: 'OPTIMAL', borderColor: 'rgba(34,211,238,0.25)', glowColor: 'rgba(34,211,238,0.15)' };
  if (rate >= 50) return { color: '#a78bfa', label: 'NOMINAL', borderColor: 'rgba(167,139,250,0.2)', glowColor: 'rgba(167,139,250,0.1)' };
  return { color: '#f87171', label: 'CRITICAL', borderColor: 'rgba(248,113,113,0.3)', glowColor: 'rgba(248,113,113,0.15)' };
}

export default function GlobalLayout() {
  const fetchProfile = useStore((s) => s.fetchProfile);
  const user = useStore((s) => s.user);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const syncRate = user?.SyncRate ?? 0;
  const syncState = getSyncState(syncRate);

  return (
    <div className="w-full h-screen bg-[#030014] overflow-hidden flex text-white font-['Inter',system-ui,sans-serif]">
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col bg-black/60 backdrop-blur-xl border-r relative shrink-0 transition-all duration-500"
        style={{
          borderColor: syncState.borderColor,
          boxShadow: syncRate < 50
            ? `inset -2px 0 20px ${syncState.glowColor}`
            : syncRate >= 80
              ? `inset -2px 0 30px ${syncState.glowColor}`
              : 'none',
        }}
      >
        {/* Neon edge — dynamic color */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px transition-colors duration-500"
          style={{
            background: `linear-gradient(to bottom, transparent, ${syncState.color}60, transparent)`,
          }}
        />

        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <h1 className="text-xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            NEBULA
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-slate-500 mt-1 uppercase">
            Digital Twin System v3
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

        {/* Bottom user card — Sync Rate indicator */}
        <div
          className="mx-3 mb-4 p-4 rounded-lg border transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${syncState.color}05, transparent)`,
            borderColor: syncState.borderColor,
            boxShadow: syncRate >= 80 ? `0 0 20px ${syncState.glowColor}` : 'none',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-wider text-slate-400">
              {user?.Username || 'LOADING...'}
            </span>
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: syncState.color }}
            >
              {syncState.label}
            </span>
          </div>

          {/* Sync Rate Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${syncRate}%`,
                background: syncState.color,
                boxShadow: `0 0 8px ${syncState.glowColor}`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-slate-600 font-mono">SYNC RATE</p>
            <p
              className="text-sm font-black font-mono"
              style={{ color: syncState.color, textShadow: `0 0 8px ${syncState.glowColor}` }}
            >
              {syncRate.toFixed(0)}%
            </p>
          </div>

          {/* Entropy warning pulse for low sync */}
          {syncRate < 50 && (
            <div
              className="mt-2 text-[9px] font-mono text-center tracking-wider uppercase animate-pulse"
              style={{ color: '#f87171' }}
            >
              ⚠ ENTROPY DETECTED
            </div>
          )}
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
