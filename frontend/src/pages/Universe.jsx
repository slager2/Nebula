import useStore from '../store/useStore';

export default function Universe() {
  const user = useStore((s) => s.user);
  const isLocked = !user || user.Level < 5;

  if (isLocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center relative">
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Lock Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center backdrop-blur-md">
            <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          {/* Glow ring */}
          <div className="absolute -inset-4 rounded-3xl border border-red-500/10 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-2">SECTOR LOCKED</h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
          The Universe sector requires <span className="text-red-400 font-bold">Level 5</span> clearance.
          <br />
          Complete daily operations to increase your level.
        </p>

        {/* Level progress */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Current Level</span>
            <span className="text-xs font-mono text-blue-400">Lv.{user?.Level || 1} / Lv.5</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(((user?.Level || 1) / 5) * 100, 100)}%`,
                boxShadow: '0 0 8px rgba(239,68,68,0.4)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          THE <span className="text-purple-400">UNIVERSE</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">Explore your constellations across the cosmos</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-600">
          <p className="text-lg">🌌 Universe view coming soon...</p>
          <p className="text-xs mt-2">Constellation map will render here.</p>
        </div>
      </div>
    </div>
  );
}
