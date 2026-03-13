import { useEffect, useState } from 'react';
import useStore from '../store/useStore';

const TASK_TYPE_STYLES = {
  INT: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', glow: '#22d3ee', icon: '🧠' },
  STR: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', glow: '#f87171', icon: '💪' },
  AGI: { color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/20', glow: '#a3e635', icon: '⚡' },
};

export default function Terminal() {
  const { dailyTasks, fetchDailyTasks, completeDaily, createDailyTask, deleteDailyTask } = useStore();
  const [completing, setCompleting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [flash, setFlash] = useState(null);

  // Creation form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('INT');
  const [baseExp, setBaseExp] = useState(50);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDailyTasks();
  }, [fetchDailyTasks]);

  const handleComplete = async (task) => {
    if (task.IsCompleted || completing) return;
    setCompleting(task.ID);
    const result = await completeDaily(task.ID);
    setCompleting(null);
    if (result.ok) {
      setFlash(task.ID);
      setTimeout(() => setFlash(null), 1000);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    await createDailyTask({ title: title.trim(), type, base_exp: baseExp });
    setTitle('');
    setCreating(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteDailyTask(id);
    setDeleting(null);
  };

  const completedCount = dailyTasks.filter((t) => t.IsCompleted).length;
  const totalXP = dailyTasks.reduce((sum, t) => sum + (t.BaseEXP || 0), 0);
  const earnedXP = dailyTasks.filter((t) => t.IsCompleted).reduce((sum, t) => sum + (t.BaseEXP || 0), 0);

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            DAILY <span className="text-emerald-400">TERMINAL</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Execute routines. Create habits. Grow stats.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">
            {completedCount}<span className="text-slate-600">/{dailyTasks.length}</span>
          </p>
          <p className="text-[10px] text-slate-500 tracking-wider uppercase">Completed</p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">Daily XP Progress</span>
          <span className="text-xs font-mono text-blue-400">{earnedXP} / {totalXP} XP</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${totalXP > 0 ? (earnedXP / totalXP) * 100 : 0}%`, boxShadow: '0 0 10px rgba(52,211,153,0.4)' }}
          />
        </div>
      </div>

      {/* Command Line — Create Task Form */}
      <form onSubmit={handleCreate} className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-xl p-5">
        <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">⌘ New Command</h3>

        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter habit name..."
            className="flex-1 bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          <input
            type="number"
            value={baseExp}
            onChange={(e) => setBaseExp(parseInt(e.target.value) || 50)}
            min={10}
            max={500}
            className="w-20 bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-center focus:outline-none focus:border-blue-500/50 transition-all font-mono"
          />
          <span className="flex items-center text-[10px] text-slate-600 tracking-wider">XP</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Type Toggle */}
          <div className="flex gap-2 flex-1">
            {Object.entries(TASK_TYPE_STYLES).map(([key, style]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-wider border transition-all duration-200 ${
                  type === key
                    ? `${style.bg} ${style.color} ${style.border}`
                    : 'bg-transparent text-slate-600 border-slate-800 hover:border-slate-600'
                }`}
                style={type === key ? { boxShadow: `0 0 15px ${style.glow}30` } : {}}
              >
                {style.icon} {key}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="px-6 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: title.trim() ? '0 0 12px rgba(52,211,153,0.15)' : 'none' }}
          >
            {creating ? '...' : 'EXECUTE'}
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pb-4">
        {dailyTasks.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <p className="text-sm">No routines assigned. Create one above.</p>
          </div>
        )}

        {dailyTasks.map((task) => {
          const style = TASK_TYPE_STYLES[task.Type] || TASK_TYPE_STYLES.INT;
          const isFlashing = flash === task.ID;

          return (
            <div
              key={task.ID}
              className={`group w-full text-left rounded-xl p-4 border transition-all duration-300 relative overflow-hidden flex items-center gap-4 ${
                task.IsCompleted
                  ? 'bg-white/[0.01] border-white/5 opacity-40'
                  : `bg-white/[0.03] ${style.border} hover:bg-white/[0.05]`
              } ${isFlashing ? 'ring-2 ring-emerald-400/40' : ''}`}
            >
              {isFlashing && (
                <div className="absolute inset-0 bg-emerald-400/5 animate-pulse rounded-xl pointer-events-none" />
              )}

              {/* Checkbox */}
              <button
                onClick={() => handleComplete(task)}
                disabled={task.IsCompleted || completing === task.ID}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  task.IsCompleted
                    ? 'bg-emerald-500/20 border-emerald-500/40'
                    : 'border-slate-600 hover:border-slate-400'
                } ${completing === task.ID ? 'animate-pulse' : ''}`}
              >
                {task.IsCompleted && (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${task.IsCompleted ? 'line-through text-slate-600' : 'text-white'}`}>
                  {task.Title}
                </p>
              </div>

              {/* Type badge */}
              <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${style.bg} ${style.color} ${style.border} border shrink-0`}>
                {style.icon} {task.Type}
              </span>

              {/* XP */}
              <span className={`text-xs font-mono shrink-0 ${task.IsCompleted ? 'text-slate-600' : 'text-blue-400'}`}>
                +{task.BaseEXP} XP
              </span>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(task.ID); }}
                disabled={deleting === task.ID}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 shrink-0 p-1 disabled:animate-pulse"
                title="Delete task"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
