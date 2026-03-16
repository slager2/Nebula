import { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const TASK_TYPE_STYLES = {
  INT: { color: 'text-cyan-400', glow: 'rgba(34,211,238,0.4)', icon: '🧠' },
  STR: { color: 'text-red-400', glow: 'rgba(239,68,68,0.4)', icon: '💪' },
  AGI: { color: 'text-lime-400', glow: 'rgba(163,230,53,0.4)', icon: '⚡' },
};

export default function Terminal() {
  const { dailyTasks, fetchDailyTasks, completeDaily, createDailyTask, deleteDailyTask, user } = useStore();
  const [completing, setCompleting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Creation form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('INT');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDailyTasks();
  }, [fetchDailyTasks]);

  const handleComplete = async (task) => {
    if (task.IsCompleted || completing) return;
    setCompleting(task.ID);
    await completeDaily(task.ID);
    setCompleting(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    await createDailyTask({ title: title.trim(), type });
    setTitle('');
    setCreating(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteDailyTask(id);
    setDeleting(null);
  };

  const routineScore = user?.RoutineScore ?? 0;

  // Mock 7-day history array ending with the actual routineScore
  const chartData = [
    { day: 'D-6', score: Math.min(100, Math.max(0, routineScore - 30)) },
    { day: 'D-5', score: Math.min(100, Math.max(0, routineScore - 15)) },
    { day: 'D-4', score: Math.min(100, Math.max(0, routineScore - 40)) },
    { day: 'D-3', score: Math.min(100, Math.max(0, routineScore - 10)) },
    { day: 'D-2', score: Math.min(100, Math.max(0, routineScore + 10)) },
    { day: 'D-1', score: Math.min(100, Math.max(0, routineScore + 5)) },
    { day: 'T-0', score: routineScore },
  ];

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-8 gap-6 font-mono text-sm leading-relaxed overflow-hidden">
      
      {/* Top Section (Analytics) */}
      <div className="w-full bg-[#050510]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl overflow-hidden relative shrink-0" style={{ boxShadow: 'inset 0 0 40px rgba(6,182,212,0.03)' }}>
        <p className="absolute top-4 left-6 text-[10px] tracking-[0.3em] text-cyan-500/60 uppercase font-black z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
          ROUTINE STABILITY TELEMETRY
        </p>
        
        <div className="absolute top-4 right-6 text-right z-10">
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-1">Current Sync</p>
          <p className="text-2xl font-black text-cyan-400" style={{ textShadow: '0 0 15px rgba(34,211,238,0.5)' }}>
            {routineScore.toFixed(1)}%
          </p>
        </div>

        {/* Faint Dotted Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50" />

        <div className="w-full h-[200px] mt-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#06b6d4" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                isAnimationActive={true}
                animationDuration={1500}
                style={{ filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.6))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Section (CLI Input) */}
      <form onSubmit={handleCreate} className="w-full shrink-0 flex items-center gap-4">
        <div className="flex-1 flex items-center bg-black/60 border border-slate-800 rounded-lg overflow-hidden focus-within:border-cyan-500/50 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all">
          <span className="text-cyan-500/70 pl-4 select-none font-bold">{'>'}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter execution sequence..."
            className="flex-1 bg-transparent border-none px-3 py-3 text-cyan-50 placeholder-slate-700 outline-none w-full"
            spellCheck="false"
          />
        </div>
        
        <div className="flex gap-2">
          {Object.entries(TASK_TYPE_STYLES).map(([key, style]) => {
            const isActive = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex items-center justify-center w-12 h-12 rounded-lg border text-xs font-bold transition-all duration-300 ${
                  isActive 
                    ? `border-cyan-400 bg-cyan-400/10 ${style.color}` 
                    : 'border-slate-800 bg-black/40 text-slate-600 hover:border-slate-600'
                }`}
                style={{
                  boxShadow: isActive ? `0 0 15px ${style.glow}` : 'none'
                }}
                title={key}
              >
                {style.icon}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="h-12 px-6 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-lg text-xs font-black tracking-[0.2em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ textShadow: title.trim() ? '0 0 8px rgba(34,211,238,0.5)' : 'none' }}
        >
          {creating ? 'SYNTHESIZING' : 'EXECUTE'}
        </button>
      </form>

      {/* Bottom Section (Execution Log) */}
      <div className="flex-1 bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between pointer-events-none select-none">
          <span className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">SYSTEM LOG // OUTSTANDING OPERATIONS</span>
          <span className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">STREAK MULTIPLIER</span>
        </div>
        <div className="flex-1 overflow-y-auto hidden-scrollbar p-6 space-y-2">
          {dailyTasks.length === 0 && (
            <div className="text-center text-slate-600 py-10 tracking-widest uppercase text-xs">
              [ NO OPERATIONS PENDING ]
            </div>
          )}
          {dailyTasks.map((task) => {
            const isDone = task.IsCompleted;
            const style = TASK_TYPE_STYLES[task.Type] || TASK_TYPE_STYLES.INT;

            return (
              <div 
                key={task.ID}
                className={`group flex items-center justify-between p-3 rounded bg-black/30 border-l-2 transition-all hover:bg-white/[0.03] ${
                  isDone 
                    ? 'border-emerald-500/30 text-slate-500' // Dimmed for completed
                    : `border-slate-700 text-cyan-50 hover:border-cyan-500/50`
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Strict Square Checkbox */}
                  <button
                    onClick={() => handleComplete(task)}
                    disabled={isDone || completing === task.ID}
                    className={`shrink-0 w-4 h-4 flex items-center justify-center border transition-all ${
                      isDone 
                        ? 'bg-emerald-500/50 border-emerald-500' 
                        : 'bg-[#050510] border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                    }`}
                  >
                    {isDone && <span className="text-[10px] text-black">✓</span>}
                  </button>

                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 w-8" style={{ color: style.glow }}>
                    {task.Type}
                  </span>

                  <span className={`truncate text-sm ${isDone ? 'line-through opacity-70' : ''}`}>
                    {task.Title}
                  </span>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  {/* FIRE STREAK */}
                  <span className={`text-xs font-black tracking-widest w-16 text-right ${isDone ? 'text-emerald-400/80' : 'text-amber-500'}`} 
                        style={{ textShadow: isDone ? 'none' : '0 0 10px rgba(245,158,11,0.5)' }}>
                    🔥 x{String(task.Streak || 0).padStart(2, '0')}
                  </span>
                  
                  {/* Delete button (shows on hover) */}
                  <button
                    onClick={() => handleDelete(task.ID)}
                    disabled={deleting === task.ID}
                    className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-400 transition-all px-2 focus:outline-none"
                  >
                    [DEL]
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
