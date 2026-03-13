import { useEffect, useState } from 'react';
import useStore from '../store/useStore';

const TASK_TYPE_STYLES = {
  INT: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', glow: 'rgba(34,211,238,0.3)', icon: '🧠' },
  STR: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', glow: 'rgba(248,113,113,0.3)', icon: '💪' },
  AGI: { color: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/20', glow: 'rgba(163,230,54,0.3)', icon: '⚡' },
};

const DEFAULT_TASKS = [
  { ID: 1, Title: 'Commit Code', Type: 'INT', BaseEXP: 50, IsCompleted: false },
  { ID: 2, Title: '30-min Workout', Type: 'STR', BaseEXP: 75, IsCompleted: false },
  { ID: 3, Title: 'Morning Run (5k)', Type: 'AGI', BaseEXP: 100, IsCompleted: false },
  { ID: 4, Title: 'Read 20 pages', Type: 'INT', BaseEXP: 40, IsCompleted: false },
  { ID: 5, Title: 'Stretch Routine', Type: 'AGI', BaseEXP: 30, IsCompleted: false },
];

export default function Terminal() {
  const { dailyTasks, setDailyTasks, completeDaily, user } = useStore();
  const [completing, setCompleting] = useState(null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (dailyTasks.length === 0) {
      setDailyTasks(DEFAULT_TASKS);
    }
  }, []);

  const handleComplete = async (task) => {
    if (task.IsCompleted || completing) return;
    setCompleting(task.ID);
    const result = await completeDaily(task.ID);
    setCompleting(null);

    if (result.ok) {
      setFlash(task.ID);
      setTimeout(() => setFlash(null), 1000);
    } else {
      const tasks = dailyTasks.map((t) =>
        t.ID === task.ID ? { ...t, IsCompleted: true } : t
      );
      setDailyTasks(tasks);
    }
  };

  const completedCount = dailyTasks.filter((t) => t.IsCompleted).length;
  const totalXP = dailyTasks.reduce((sum, t) => sum + t.BaseEXP, 0);
  const earnedXP = dailyTasks.filter((t) => t.IsCompleted).reduce((sum, t) => sum + t.BaseEXP, 0);

  return (
    <div className="h-full p-8 flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            DAILY <span className="text-emerald-400">TERMINAL</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">Execute your daily routines for stat gains</p>
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

      {/* Task List */}
      <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-4">
        {dailyTasks.map((task) => {
          const style = TASK_TYPE_STYLES[task.Type] || TASK_TYPE_STYLES.INT;
          const isFlashing = flash === task.ID;

          return (
            <button
              key={task.ID}
              onClick={() => handleComplete(task)}
              disabled={task.IsCompleted || completing === task.ID}
              className={`w-full text-left rounded-xl p-4 border transition-all duration-300 group relative overflow-hidden ${
                task.IsCompleted
                  ? 'bg-white/[0.02] border-white/5 opacity-50'
                  : `bg-white/[0.03] ${style.border} hover:border-white/20 hover:bg-white/[0.05]`
              } ${isFlashing ? 'ring-2 ring-emerald-400/50' : ''}`}
            >
              {/* Glow effect on flash */}
              {isFlashing && (
                <div className="absolute inset-0 bg-emerald-400/10 animate-pulse rounded-xl pointer-events-none" />
              )}

              <div className="flex items-center gap-4 relative z-10">
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.IsCompleted
                      ? 'bg-emerald-500/20 border-emerald-500/40'
                      : 'border-slate-600 group-hover:border-slate-400'
                  } ${completing === task.ID ? 'animate-pulse' : ''}`}
                >
                  {task.IsCompleted && (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className={`font-medium text-sm ${task.IsCompleted ? 'line-through text-slate-600' : 'text-white'}`}>
                    {task.Title}
                  </p>
                </div>

                {/* Type badge */}
                <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${style.bg} ${style.color} ${style.border} border`}>
                  {style.icon} {task.Type}
                </span>

                {/* XP */}
                <span className={`text-xs font-mono ${task.IsCompleted ? 'text-slate-600' : 'text-blue-400'}`}>
                  +{task.BaseEXP} XP
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
