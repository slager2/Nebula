import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import useStore from '../store/useStore';

const navItems = [
  { to: '/terminal', label: 'Today', icon: 'home' },
  { to: '/forge', label: 'Forge', icon: 'spark' },
  { to: '/archive', label: 'Library', icon: 'book' },
  { to: '/universe', label: 'Map', icon: 'map' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></>,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></>,
    map: <><circle cx="6" cy="15" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="18" cy="14" r="2"/><path d="m7.5 13.5 3-5M13.7 8.3l2.6 4.3M8 15h8"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Navigation({ mobile = false }) {
  return (
    <nav aria-label="Primary navigation" className={mobile ? 'grid grid-cols-5' : 'flex flex-col gap-1.5'}>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => mobile
            ? `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-sky-300' : 'text-slate-500'}`
            : `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${isActive ? 'bg-sky-400/10 text-sky-200' : 'text-slate-400 hover:bg-white/[0.035] hover:text-slate-100'}`
          }
        >
          <Icon name={item.icon} className={mobile ? 'h-5 w-5' : 'h-[19px] w-[19px]'} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function GlobalLayout() {
  const fetchProfile = useStore((state) => state.fetchProfile);
  const fetchLearningToday = useStore((state) => state.fetchLearningToday);
  const user = useStore((state) => state.user);
  const today = useStore((state) => state.learningToday);

  useEffect(() => {
    fetchProfile();
    fetchLearningToday();
  }, [fetchProfile, fetchLearningToday]);

  const plan = today?.active_plan;
  const progress = plan?.total_nodes ? Math.round((plan.completed_nodes / plan.total_nodes) * 100) : 0;

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)] lg:flex">
      <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-sky-300 px-4 py-2 font-semibold text-slate-950 focus:translate-y-0">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--border-soft)] bg-[#0b1018]/95 p-4 lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200">
            <Icon name="spark" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">Nebula</p>
            <p className="text-xs text-slate-500">Learning workspace</p>
          </div>
        </div>

        <Navigation />

        <div className="mt-auto space-y-3">
          {plan && (
            <div className="rounded-xl border border-[var(--border-soft)] bg-white/[0.025] p-3.5">
              <p className="text-xs font-semibold text-slate-500">Current plan</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-200">{plan.topic}</p>
              <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>{plan.completed_nodes}/{plan.total_nodes} lessons</span>
                <span>{progress}%</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-400/10 text-violet-200"><Icon name="user" className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-300">{user?.Username || 'Learner'}</p>
              <p className="text-xs text-slate-600">{today?.due_review_count || 0} reviews due</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border-soft)] bg-[#0b1018]/90 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-sky-300"><Icon name="spark" /></span>
            <span className="font-bold">Nebula</span>
          </div>
          <span className="status-pill">{today?.due_review_count || 0} due</span>
        </header>

        <main id="main-content" className="min-h-dvh min-w-0 overflow-x-hidden">
          <Outlet />
        </main>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[#0b1018]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <Navigation mobile />
        </div>
      </div>
    </div>
  );
}
