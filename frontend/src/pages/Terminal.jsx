import { useEffect, useState, useMemo } from 'react';
import useStore from '../store/useStore';

const TASK_TYPE_STYLES = {
  INT: { color: 'text-cyan-400', borderColor: 'border-cyan-500/50', glowColor: 'rgba(34,211,238,0.35)', label: 'INT' },
  STR: { color: 'text-red-400',  borderColor: 'border-red-500/50',  glowColor: 'rgba(239,68,68,0.35)',  label: 'STR' },
  AGI: { color: 'text-lime-400', borderColor: 'border-lime-500/50', glowColor: 'rgba(163,230,53,0.35)', label: 'AGI' },
};

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateHeatmapData(routineScore) {
  const rand = mulberry32(42 + Math.floor(routineScore));
  return Array.from({ length: 90 }, (_, i) => {
    const r = rand();
    const bias = i / 90;
    const raw = r + bias * 0.4;
    if (raw < 0.25) return 0;
    if (raw < 0.5)  return 1;
    if (raw < 0.75) return 2;
    return 3;
  });
}

const HEAT_COLORS = [
  'bg-slate-800',
  'bg-cyan-900',
  'bg-cyan-600',
  'bg-cyan-400',
];

const HEAT_GLOWS = [
  '',
  '',
  '0 0 4px rgba(8,145,178,0.6)',
  '0 0 6px rgba(34,211,238,0.9)',
];

export default function Terminal() {
  const { dailyTasks, fetchDailyTasks, completeDaily, createDailyTask, deleteDailyTask, user } = useStore();
  const [completing, setCompleting] = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [title, setTitle]           = useState('');
  const [type, setType]             = useState('INT');
  const [creating, setCreating]     = useState(false);

  useEffect(() => { fetchDailyTasks(); }, [fetchDailyTasks]);

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
  const comboMultiplier = user?.ComboMultiplier ?? 1.0;
  const hasCombo = comboMultiplier > 1.0;
  const heatmap = useMemo(() => {
    const mocked = generateHeatmapData(routineScore);
    const todayLevel = Math.floor((routineScore / 100) * 3);
    mocked[89] = todayLevel;
    return mocked;
  }, [routineScore]);

  const completedCount = dailyTasks.filter(t => t.IsCompleted).length;
  const totalCount     = dailyTasks.length;

  return (
    <div className="h-full flex flex-col font-mono text-sm overflow-hidden bg-[#050510]">

      <div className="shrink-0 border-b border-white/5" style={{ background: 'rgba(5,5,16,0.95)' }}>
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
              style={{ boxShadow: '0 0 8px rgba(34,211,238,1)' }}
            />
            <span className="text-[10px] tracking-[0.35em] text-cyan-500/70 font-black uppercase">
              SYSTEM TELEMETRY // 90-DAY ROUTINE STABILITY
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-slate-600 tracking-widest uppercase">
              OPS {completedCount}/{totalCount}
            </span>
            {hasCombo && (
              <div className="flex items-center gap-2">
                <span
                  className="text-lg font-black text-amber-400 tabular-nums animate-pulse"
                  style={{ textShadow: '0 0 16px rgba(251,191,36,0.7)' }}
                >
                  {comboMultiplier.toFixed(1)}x
                </span>
                <span className="text-[8px] text-amber-600 tracking-[0.15em] font-black uppercase">
                  COMBO
                </span>
              </div>
            )}
            <span
              className="text-lg font-black text-cyan-400 tabular-nums"
              style={{ textShadow: '0 0 12px rgba(34,211,238,0.6)' }}
            >
              {routineScore.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-[9px] text-slate-600 tracking-widest uppercase font-semibold">LESS</span>
            {HEAT_COLORS.map((cls, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 ${cls}`}
                style={{ boxShadow: HEAT_GLOWS[i] }}
              />
            ))}
            <span className="text-[9px] text-slate-600 tracking-widest uppercase font-semibold">MORE</span>
          </div>

          <div
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
          >
            {heatmap.map((level, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm transition-all duration-200 cursor-default hover:scale-125 ${HEAT_COLORS[level]}`}
                style={{ boxShadow: HEAT_GLOWS[level] }}
                title={`Day -${90 - i}: Activity ${level}`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-2 px-[1px]">
            {['90D', '78D', '65D', '52D', '39D', '26D', '13D', 'NOW'].map(label => (
              <span key={label} className="text-[8px] text-slate-700 tracking-wider font-mono">{label}</span>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="shrink-0 flex items-center gap-0 border-b border-white/5"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <span
          className="pl-6 pr-3 text-cyan-400 font-black text-base select-none"
          style={{ textShadow: '0 0 10px rgba(34,211,238,0.8)' }}
        >
          &gt;
        </span>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="AWAITING COMMAND..."
          className="flex-1 bg-transparent border-none py-3.5 text-cyan-50 placeholder-slate-700 outline-none font-mono text-sm tracking-wider"
          spellCheck="false"
          autoComplete="off"
        />

        <div className="flex items-center gap-px px-4">
          {Object.entries(TASK_TYPE_STYLES).map(([key, s]) => {
            const isActive = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`px-3 py-1.5 text-[10px] font-black tracking-[0.2em] border transition-all duration-200 ${
                  isActive
                    ? `${s.color} ${s.borderColor} bg-white/[0.05]`
                    : 'text-slate-600 border-slate-800 hover:border-slate-600 hover:text-slate-400'
                }`}
                style={{ boxShadow: isActive ? `0 0 10px ${s.glowColor}, inset 0 0 8px ${s.glowColor.replace('0.35', '0.08')}` : 'none' }}
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="h-full px-6 py-3.5 text-[10px] font-black tracking-[0.3em] uppercase border-l border-white/5 text-cyan-400 hover:bg-cyan-500/5 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          style={{ textShadow: title.trim() ? '0 0 8px rgba(34,211,238,0.6)' : 'none' }}
        >
          {creating ? 'SYNTH...' : 'EXEC'}
        </button>
      </form>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-2 border-b border-white/[0.04] bg-black/30 select-none pointer-events-none">
          <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-bold">
            EXECUTION LOG // OUTSTANDING OPERATIONS
          </span>
          <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-bold">
            STREAK
          </span>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar">
          {dailyTasks.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span className="text-[10px] text-slate-700 tracking-[0.3em] uppercase font-mono">
                [ NO OPERATIONS PENDING ]
              </span>
            </div>
          )}

          {dailyTasks.map((task) => {
            const isDone  = task.IsCompleted;
            const style   = TASK_TYPE_STYLES[task.Type] || TASK_TYPE_STYLES.INT;
            const streak  = String(task.Streak || 0).padStart(2, '0');

            return (
              <div
                key={task.ID}
                className={`group flex items-center gap-4 px-6 py-2 border-b border-white/[0.04] transition-all duration-150 ${
                  isDone ? 'opacity-40' : 'hover:bg-white/[0.21] hover:shadow-[inset_0_0_20px_rgba(34,211,238,0.08)]'
                }`}
              >
                <button
                  onClick={() => handleComplete(task)}
                  disabled={isDone || completing === task.ID}
                  className={`shrink-0 w-5 h-5 border rounded transition-all duration-150 flex items-center justify-center ${
                    isDone
                      ? 'bg-cyan-400 border-cyan-400 shadow-[inset_0_0_6px_rgba(34,211,238,0.5)]'
                      : 'bg-transparent border-slate-600 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(34,211,238,0.7)]'
                  }`}
                >
                  {isDone && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4l2 2 4-4" stroke="#050510" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                <span
                  className={`shrink-0 text-[9px] font-black tracking-[0.25em] w-8 ${style.color}`}
                  style={{ textShadow: isDone ? 'none' : `0 0 8px ${style.glowColor}` }}
                >
                  {task.Type}
                </span>

                <span
                  className={`flex-1 truncate text-xs tracking-wider ${
                    isDone ? 'line-through text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {task.Title}
                </span>

                <span
                  className={`shrink-0 text-[10px] font-black tracking-widest tabular-nums ${
                    isDone ? 'text-slate-600' : 'text-amber-400'
                  }`}
                  style={{ textShadow: isDone ? 'none' : '0 0 12px rgba(251,191,36,0.8)' }}
                >
                  🔥 STREAK: {streak}
                </span>

                <button
                  onClick={() => handleDelete(task.ID)}
                  disabled={deleting === task.ID}
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-[9px] text-red-500/40 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.5)] tracking-widest transition-all font-mono duration-100"
                >
                  [DEL]
                </button>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 flex items-center gap-6 px-6 py-2 border-t border-white/[0.04] bg-black/20 select-none pointer-events-none">
          <span className="text-[9px] text-slate-700 font-mono tracking-widest">
            INT: {user?.StatINT ?? 10}
          </span>
          <span className="text-[9px] text-slate-700 font-mono tracking-widest">
            STR: {user?.StatSTR ?? 10}
          </span>
          <span className="text-[9px] text-slate-700 font-mono tracking-widest">
            AGI: {user?.StatAGI ?? 10}
          </span>
          <span className="ml-auto text-[9px] text-slate-700 font-mono tracking-widest">
            NEBULA OS v4.1 // TERMINAL SUBSYSTEM
          </span>
        </div>
      </div>
    </div>
  );
}
