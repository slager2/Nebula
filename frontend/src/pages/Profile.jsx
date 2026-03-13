import { useState } from 'react';
import useStore from '../store/useStore';

function StatBar({ label, value, color, icon }) {
  const maxStat = 100;
  const pct = Math.min((value / maxStat) * 100, 100);
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">{label}</span>
        </div>
        <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
      </div>
      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ease-out`}
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color === 'text-cyan-400' ? '#22d3ee' : color === 'text-red-400' ? '#f87171' : '#a3e635'}, ${color === 'text-cyan-400' ? '#06b6d4' : color === 'text-red-400' ? '#ef4444' : '#84cc16'})`,
            boxShadow: `0 0 12px ${color === 'text-cyan-400' ? 'rgba(34,211,238,0.4)' : color === 'text-red-400' ? 'rgba(248,113,113,0.4)' : 'rgba(163,230,54,0.4)'}`,
          }}
        />
      </div>
    </div>
  );
}

function ProgressRing({ value, max, label, color, size = 120 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? value / max : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="text-center -mt-[calc(50%+16px)] mb-8">
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-[10px] text-slate-500 tracking-wider uppercase">{label}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const user = useStore((s) => s.user);
  const updatePhysics = useStore((s) => s.updatePhysics);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!height && !weight) return;
    setSaving(true);
    await updatePhysics(height || user?.Height || 0, weight || user?.Weight || 0);
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full p-8 flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          OPERATOR <span className="text-blue-400">PROFILE</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">System diagnostics & physical metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Metrics */}
        <div className="lg:col-span-1 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">Core Metrics</h3>
          <div className="flex flex-wrap justify-center gap-6">
            <ProgressRing value={user.HP} max={100} label="HP" color="#3b82f6" />
            <ProgressRing value={user.EXP} max={user.Level * 100} label="EXP" color="#8b5cf6" />
          </div>
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-xs text-slate-400">Skill Points</span>
            <span className="text-lg font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
              {user.SkillPoints} SP
            </span>
          </div>
        </div>

        {/* RPG Stats */}
        <div className="lg:col-span-1 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">RPG Stats</h3>
          <div className="flex flex-col gap-5">
            <StatBar label="Intelligence" value={user.StatINT} color="text-cyan-400" icon="🧠" />
            <StatBar label="Strength" value={user.StatSTR} color="text-red-400" icon="💪" />
            <StatBar label="Agility" value={user.StatAGI} color="text-lime-400" icon="⚡" />
          </div>
        </div>

        {/* Physical Metrics */}
        <div className="lg:col-span-1 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">Physical Metrics</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Height (cm)</label>
              <input
                type="number"
                placeholder={user.Height || '170'}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Weight (kg)</label>
              <input
                type="number"
                placeholder={user.Weight || '70'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg py-2.5 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50"
            >
              {saving ? 'SYNCING...' : 'UPDATE METRICS'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
