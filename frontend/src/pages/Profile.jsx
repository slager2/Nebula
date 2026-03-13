import { useState } from 'react';
import useStore from '../store/useStore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

function ProgressRing({ value, max, label, sublabel, color, glowColor, size = 130 }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
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
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-white">{value}</p>
          <p className="text-[10px] text-slate-500 tracking-wider uppercase">{label}</p>
        </div>
      </div>
      {sublabel && <p className="text-[10px] text-slate-600 mt-1 font-mono">{sublabel}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-white/10 backdrop-blur-md rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400">{payload[0].payload.stat}</p>
        <p className="text-sm font-bold text-cyan-400">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

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

  const radarData = [
    { stat: 'Intelligence', value: user.StatINT, fullMark: 100 },
    { stat: 'Strength', value: user.StatSTR, fullMark: 100 },
    { stat: 'Agility', value: user.StatAGI, fullMark: 100 },
  ];

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          OPERATOR <span className="text-blue-400">PROFILE</span>
        </h2>
        <p className="text-sm text-slate-500 mt-1">System diagnostics & combat readiness</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Core Vitals Card */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">Core Vitals</h3>

          <div className="flex items-center justify-center gap-8 flex-1">
            <ProgressRing
              value={user.HP}
              max={100}
              label="HP"
              color="#3b82f6"
              glowColor="rgba(59,130,246,0.5)"
            />
            <ProgressRing
              value={user.EXP}
              max={user.Level * 100}
              label="EXP"
              sublabel={`${user.EXP} / ${user.Level * 100}`}
              color="#8b5cf6"
              glowColor="rgba(139,92,246,0.5)"
            />
          </div>

          {/* SP & Level bar */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-xs text-slate-400">Level</span>
              <span className="text-lg font-black text-white">{user.Level}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <span className="text-xs text-slate-400">Skill Points</span>
              <span className="text-lg font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
                {user.SkillPoints} SP
              </span>
            </div>
          </div>
        </div>

        {/* Radar Chart Card */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Combat Radar</h3>

          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#1e293b" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="stat"
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Stats"
                  dataKey="value"
                  stroke="#66FCF1"
                  fill="#66FCF1"
                  fillOpacity={0.25}
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#66FCF1', strokeWidth: 0 }}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stat values below chart */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 rounded-lg bg-cyan-400/5 border border-cyan-400/10">
              <p className="text-lg font-black text-cyan-400">{user.StatINT}</p>
              <p className="text-[10px] text-slate-500 tracking-wider">🧠 INT</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-400/5 border border-red-400/10">
              <p className="text-lg font-black text-red-400">{user.StatSTR}</p>
              <p className="text-[10px] text-slate-500 tracking-wider">💪 STR</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-lime-400/5 border border-lime-400/10">
              <p className="text-lg font-black text-lime-400">{user.StatAGI}</p>
              <p className="text-[10px] text-slate-500 tracking-wider">⚡ AGI</p>
            </div>
          </div>
        </div>

        {/* Physical Metrics */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-6">Physical Metrics</h3>
          <div className="flex flex-col gap-4 flex-1">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Height (cm)</label>
              <input
                type="number"
                placeholder={user.Height || '170'}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Weight (kg)</label>
              <input
                type="number"
                placeholder={user.Weight || '70'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>
            <div className="mt-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 hover:text-blue-300 border border-blue-500/25 rounded-lg py-2.5 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50"
              >
                {saving ? 'SYNCING...' : 'UPDATE METRICS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
