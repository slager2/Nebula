import { useState } from 'react';
import useStore from '../store/useStore';

function ProgressRing({ value, max, label, sublabel, color, glowColor, size = 160 }) {
  const strokeWidth = 8;
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
            style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <p className="text-3xl font-black text-white leading-none font-mono">
            {typeof value === 'number' ? value.toFixed(0) : value}
          </p>
          <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-1">{label}</p>
        </div>
      </div>
      {sublabel && <p className="text-xs text-slate-600 mt-2 font-mono tracking-widest uppercase">{sublabel}</p>}
    </div>
  );
}

function getSyncColor(rate) {
  if (rate >= 80) return '#22d3ee'; // Cyan
  if (rate >= 50) return '#a78bfa'; // Purple
  return '#f87171'; // Red
}

function getBMIState(bmi) {
  if (bmi === 0 || isNaN(bmi)) return { label: 'AWAITING DATA', color: '#64748b' };
  if (bmi < 18.5) return { label: 'DEFICIT', color: '#f87171' };
  if (bmi < 25) return { label: 'OPTIMAL', color: '#22d3ee' };
  if (bmi < 30) return { label: 'SURPLUS', color: '#fbbf24' };
  return { label: 'CRITICAL MASS', color: '#ef4444' };
}

export default function Profile() {
  const user = useStore((s) => s.user);
  const updatePhysics = useStore((s) => s.updatePhysics);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const h = height || user?.Height || 0;
    const w = weight || user?.Weight || 0;
    if (!h && !w) return;
    setSaving(true);
    await updatePhysics(h, w);
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const syncRate = user.SyncRate ?? 0;
  const routineScore = user.RoutineScore ?? 0;
  const cognitiveScore = user.CognitiveScore ?? 0;
  const syncColor = getSyncColor(syncRate);

  const currentHeight = parseFloat(height || user.Height) || 0;
  const currentWeight = parseFloat(weight || user.Weight) || 0;
  const bmi = currentHeight > 0 && currentWeight > 0 ? (currentWeight / ((currentHeight / 100) ** 2)) : 0;
  const bmiState = getBMIState(bmi);

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            DIGITAL <span style={{ color: syncColor }}>TWIN</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest text-[10px]">System synchronization & somatic feedback</p>
        </div>
        <div className="text-right">
          <span
            className="text-3xl font-black font-mono"
            style={{ color: syncColor, textShadow: `0 0 20px ${syncColor}60` }}
          >
            {syncRate.toFixed(0)}%
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">Global Sync Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Sync Metrics */}
        <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col overflow-y-auto hidden-scrollbar">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-8">Sync Metrics</h3>

          <div className="flex flex-col items-center justify-center gap-12 flex-1">
            <ProgressRing
              value={routineScore}
              max={100}
              label="ROUTINE"
              sublabel={`${routineScore.toFixed(1)}% STABILITY`}
              color="#06b6d4"
              glowColor="rgba(6,182,212,0.6)"
            />
            <ProgressRing
              value={cognitiveScore}
              max={100}
              label="COGNITIVE"
              sublabel={`${cognitiveScore.toFixed(1)}% CAPACITY`}
              color="#8b5cf6"
              glowColor="rgba(139,92,246,0.6)"
            />
          </div>
        </div>

        {/* Right Column: Holographic Twin */}
        <div className="lg:col-span-3 bg-[#050510]/95 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 flex flex-col relative overflow-hidden" 
             style={{ boxShadow: 'inset 0 0 80px rgba(6,182,212,0.05)' }}>
          
          {/* Neon grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          
          <h3 className="text-xs font-bold tracking-[0.2em] text-cyan-500/70 uppercase mb-2 relative z-10">Holographic Twin</h3>

          <div className="flex-1 flex items-center justify-center relative z-10 w-full h-full min-h-[400px]">
            {/* Height Input (Top Left) */}
            <div className="absolute top-12 left-8 flex flex-col">
              <label className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-mono mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder={user.Height || '0'}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-24 bg-black/60 text-lg font-mono text-cyan-300 border border-cyan-500/30 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 transition-all text-center placeholder-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
              />
            </div>

            {/* Weight Input (Bottom Left) */}
            <div className="absolute bottom-16 left-8 flex flex-col">
              <label className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-mono mb-1">Weight (kg)</label>
              <input
                type="number"
                placeholder={user.Weight || '0'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-24 bg-black/60 text-lg font-mono text-cyan-300 border border-cyan-500/30 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/50 transition-all text-center placeholder-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
              />
            </div>

            {/* BMI Display (Right Center) */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end">
              <p className="text-[10px] text-cyan-500/60 uppercase tracking-widest font-mono mb-2">Mass Index</p>
              <p className="text-5xl font-black font-mono" style={{ color: bmiState.color, textShadow: `0 0 20px ${bmiState.color}80` }}>
                {bmi > 0 ? bmi.toFixed(1) : '0.0'}
              </p>
              <p className="text-xs tracking-[0.2em] uppercase mt-3 font-bold px-3 py-1.5 bg-black/50 border rounded" style={{ borderColor: `${bmiState.color}40`, color: bmiState.color, boxShadow: `0 0 10px ${bmiState.color}20` }}>
                {bmiState.label}
              </p>
            </div>

            {/* Abstract Humanoid SVG */}
            <svg viewBox="0 0 200 400" className="w-[180px] h-[360px] drop-shadow-[0_0_25px_rgba(6,182,212,0.35)] pointer-events-none">
              <g stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.6">
                {/* Scanner line going down */}
                <line x1="-50" y1="0" x2="250" y2="0" stroke="#06b6d4" strokeWidth="2" opacity="0.8">
                  <animate attributeName="y1" values="-20;420;-20" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="y2" values="-20;420;-20" dur="4s" repeatCount="indefinite" />
                </line>

                {/* Head */}
                <circle cx="100" cy="50" r="22" strokeDasharray="4 4" />
                <circle cx="100" cy="50" r="14" opacity="0.4" />
                
                {/* Core/Spine */}
                <line x1="100" y1="72" x2="100" y2="210" strokeDasharray="6 4" strokeWidth="2" />
                
                {/* Shoulders */}
                <path d="M 40 100 Q 100 80 160 100" strokeWidth="2" />
                
                {/* Arms */}
                <polyline points="40,100 25,170 20,240" strokeDasharray="5 5" />
                <polyline points="160,100 175,170 180,240" strokeDasharray="5 5" />
                
                {/* Torso/Ribcage */}
                <path d="M 60 110 Q 40 160 100 210 Q 160 160 140 110" />
                <path d="M 70 125 Q 55 160 100 190 Q 145 160 130 125" opacity="0.5" />
                
                {/* Pelvis */}
                <path d="M 70 210 Q 100 230 130 210" strokeWidth="2" />
                
                {/* Legs */}
                <polyline points="70,210 60,300 60,380" strokeDasharray="5 5" />
                <polyline points="130,210 140,300 140,380" strokeDasharray="5 5" />
                
                {/* Joints / Nodes */}
                <circle cx="40" cy="100" r="4" fill="#06b6d4" />
                <circle cx="160" cy="100" r="4" fill="#06b6d4" />
                <circle cx="25" cy="170" r="3" fill="#06b6d4" />
                <circle cx="175" cy="170" r="3" fill="#06b6d4" />
                <circle cx="70" cy="210" r="4" fill="#06b6d4" />
                <circle cx="130" cy="210" r="4" fill="#06b6d4" />
                <circle cx="60" cy="300" r="3" fill="#06b6d4" />
                <circle cx="140" cy="300" r="3" fill="#06b6d4" />
              </g>
            </svg>
          </div>

          {/* Sync Button */}
          <div className="relative z-10 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl py-4 text-xs tracking-[0.2em] font-black uppercase transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ boxShadow: '0 0 20px rgba(6,182,212,0.1)' }}
            >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  SYNCHRONIZING...
                </>
              ) : (
                'SYNC METRICS'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
