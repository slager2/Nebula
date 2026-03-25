import { useState } from 'react';
import useStore from '../store/useStore';

function ProgressRing({ value, max, label, sublabel, color, glowColor, size = 150 }) {
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
             style={{ filter: `drop-shadow(0 0 20px ${glowColor})` }}
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
   const accentColor = syncRate < 50 ? '#f87171' : '#06b6d4';
   const accentGlow = syncRate < 50 ? 'rgba(248,113,113,0.6)' : 'rgba(6,182,212,0.8)';

  const currentHeight = parseFloat(height || user.Height) || 0;
  const currentWeight = parseFloat(weight || user.Weight) || 0;
  const bmi = currentHeight > 0 && currentWeight > 0 ? (currentWeight / ((currentHeight / 100) ** 2)) : 0;
  const bmiState = getBMIState(bmi);

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            BIOMETRIC <span style={{ color: syncColor }}>ANALYSIS</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest text-[10px]">Medical Pod Diagnostics & Somatic Telemetry</p>
        </div>
        <div className="text-right">
          <span
            className="text-3xl font-black font-mono"
            style={{ color: syncColor, textShadow: `0 0 20px ${syncColor}60` }}
          >
            {syncRate.toFixed(0)}%
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">System Integrity</p>
        </div>
      </div>

      <style>{`
        @keyframes scannerPass {
          0% { transform: translateY(-100%); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        .scanner-line {
          animation: scannerPass 4s ease-in-out infinite;
        }
        
        .pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Sync Metrics */}
        <div className="lg:col-span-2 bg-[#0B0C10]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex flex-col overflow-y-auto hidden-scrollbar shadow-2xl">
          <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase mb-8">Sync Metrics</h3>

          <div className="flex flex-col items-center justify-center gap-16 flex-1">
             <ProgressRing
               value={routineScore}
               max={100}
               label="ROUTINE"
               sublabel={`${routineScore.toFixed(1)}% STABILITY`}
               color="#06b6d4"
               glowColor="rgba(6,182,212,0.9)"
               size={150}
             />
             <ProgressRing
               value={cognitiveScore}
               max={100}
               label="COGNITIVE"
               sublabel={`${cognitiveScore.toFixed(1)}% CAPACITY`}
               color="#8b5cf6"
               glowColor="rgba(139,92,246,0.9)"
               size={150}
             />
          </div>
        </div>

        {/* Right Column: Medical Pod */}
         <div className="lg:col-span-3 bg-[#0B0C10]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 flex flex-col relative overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 30px 60px -12px rgba(6,182,212,0.20), inset 0 0 100px rgba(6,182,212,0.10)' }}>
          
           {/* Grid Background */}
           <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)', backgroundSize: '50px 50px' }} />
          
           {/* Corner Accents */}
           <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-500/6 to-transparent pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-500/6 to-transparent pointer-events-none" />

          <h3 className="text-xs font-black tracking-[0.2em] text-cyan-400/80 uppercase mb-6 relative z-10">Medical Pod</h3>

          <div className="flex-1 relative z-10 w-full flex flex-col">
            {/* Top Row: Height and Weight Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               {/* Height Card */}
               <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/40 rounded-xl p-4 backdrop-blur-sm hover:border-cyan-500/50 transition-all"
                    style={{ boxShadow: '0 0 25px rgba(6,182,212,0.12), inset 0 0 25px rgba(6,182,212,0.06)' }}>
                 <label className="text-[9px] text-cyan-400/70 uppercase tracking-widest font-black mb-2 block">Height</label>
                 <input
                   type="number"
                   placeholder={user.Height || '0'}
                   value={height}
                   onChange={(e) => setHeight(e.target.value)}
                   className="w-full bg-black/40 text-2xl font-black font-mono text-cyan-300 border border-cyan-500/20 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/80 transition-all text-center placeholder-cyan-900/70 backdrop-blur-sm"
                   style={{ boxShadow: 'inset 0 0 10px rgba(6,182,212,0.05)' }}
                 />
                 <p className="text-[8px] text-cyan-500/50 uppercase tracking-widest font-mono mt-2">cm</p>
               </div>

               {/* Weight Card */}
               <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/40 rounded-xl p-4 backdrop-blur-sm hover:border-cyan-500/50 transition-all"
                    style={{ boxShadow: '0 0 25px rgba(6,182,212,0.12), inset 0 0 25px rgba(6,182,212,0.06)' }}>
                 <label className="text-[9px] text-cyan-400/70 uppercase tracking-widest font-black mb-2 block">Weight</label>
                 <input
                   type="number"
                   placeholder={user.Weight || '0'}
                   value={weight}
                   onChange={(e) => setWeight(e.target.value)}
                   className="w-full bg-black/40 text-2xl font-black font-mono text-cyan-300 border border-cyan-500/20 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/80 transition-all text-center placeholder-cyan-900/70 backdrop-blur-sm"
                   style={{ boxShadow: 'inset 0 0 10px rgba(6,182,212,0.05)' }}
                 />
                 <p className="text-[8px] text-cyan-500/50 uppercase tracking-widest font-mono mt-2">kg</p>
               </div>
            </div>

            {/* Center: BMI & Biometric Pod */}
            <div className="relative flex-1 flex items-center justify-center">
               {/* Animated Scanner Line */}
               <div className="scanner-line absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" 
                    style={{ boxShadow: '0 0 25px rgba(6,182,212,1)' }} />

              {/* Main BMI Card */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full max-w-xs">
                   {/* Outer Frame */}
                   <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-500/5 rounded-2xl border border-cyan-500/20 backdrop-blur-md"
                        style={{ boxShadow: '0 0 50px rgba(6,182,212,0.20), inset 0 0 50px rgba(6,182,212,0.10)' }} />
                  
                  {/* Inner Content */}
                  <div className="relative p-8 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-cyan-400/60 uppercase tracking-[0.3em] font-black mb-4">Body Mass Index</p>
                    
                     {/* BMI Value */}
                     <div className="relative mb-6">
                       <p className="text-6xl font-black font-mono" style={{ color: bmiState.color, textShadow: `0 0 40px ${bmiState.color}, 0 0 80px ${bmiState.color}50` }}>
                         {bmi > 0 ? bmi.toFixed(1) : '—'}
                       </p>
                     </div>

                     {/* Status Badge */}
                     <div className="px-4 py-2 rounded-lg border backdrop-blur-sm" style={{ borderColor: `${bmiState.color}50`, backgroundColor: `${bmiState.color}08`, boxShadow: `0 0 30px ${bmiState.color}30` }}>
                       <p className="text-[10px] tracking-[0.2em] uppercase font-black" style={{ color: bmiState.color }}>
                         {bmiState.label}
                       </p>
                     </div>

                     {/* Stats Grid */}
                     <div className="grid grid-cols-2 gap-4 mt-8 w-full text-center">
                       <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-lg p-3 backdrop-blur-sm" style={{ boxShadow: 'inset 0 0 15px rgba(6,182,212,0.08)' }}>
                         <p className="text-cyan-300 text-sm font-black font-mono">{currentHeight > 0 ? currentHeight : '—'}</p>
                         <p className="text-[8px] text-cyan-500/50 uppercase tracking-wider font-mono mt-1">Height cm</p>
                       </div>
                       <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-lg p-3 backdrop-blur-sm" style={{ boxShadow: 'inset 0 0 15px rgba(6,182,212,0.08)' }}>
                         <p className="text-cyan-300 text-sm font-black font-mono">{currentWeight > 0 ? currentWeight : '—'}</p>
                         <p className="text-[8px] text-cyan-500/50 uppercase tracking-wider font-mono mt-1">Weight kg</p>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

           {/* Sync Button */}
           <div className="relative z-10 mt-6">
             <button
               onClick={handleSave}
               disabled={saving}
               className="w-full bg-gradient-to-r from-cyan-500/25 to-cyan-500/12 hover:from-cyan-500/35 hover:to-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl py-4 text-xs tracking-[0.2em] font-black uppercase transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 backdrop-blur-sm hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]"
               style={{ boxShadow: '0 0 30px rgba(6,182,212,0.25)' }}
             >
              {saving ? (
                <>
                  <span className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                  SYNCHRONIZING...
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                  SYNC METRICS
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
