import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/useStore';

const habitTypes = {
  INT: { label: 'Mind', color: 'bg-sky-300' },
  STR: { label: 'Body', color: 'bg-rose-300' },
  AGI: { label: 'Mobility', color: 'bg-emerald-300' },
};

function MetricCard({ label, value, detail }) {
  return (
    <div className="surface-muted p-4">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ActivityGrid({ days }) {
  const max = Math.max(1, ...days.map((day) => day.total));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" aria-label="Learning activity over the last 30 days">
        {days.map((day) => {
          const intensity = day.total / max;
          return (
            <div
              key={day.date}
              className="h-7 min-w-7 flex-1 rounded-md border border-white/[0.035]"
              style={{ backgroundColor: day.total ? `rgba(56, 189, 248, ${0.18 + intensity * 0.62})` : '#192230' }}
              title={`${day.date}: ${day.lessons} lessons, ${day.reviews} reviews, ${day.habits} habits`}
              role="img"
              aria-label={`${day.date}: ${day.lessons} lessons, ${day.reviews} reviews, ${day.habits} habits`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-600"><span>30 days ago</span><span>Today</span></div>
    </div>
  );
}

export default function Terminal() {
  const today = useStore((state) => state.learningToday);
  const status = useStore((state) => state.learningStatus);
  const error = useStore((state) => state.learningError);
  const fetchToday = useStore((state) => state.fetchLearningToday);
  const completeDaily = useStore((state) => state.completeDaily);
  const createDailyTask = useStore((state) => state.createDailyTask);
  const deleteDailyTask = useStore((state) => state.deleteDailyTask);
  const dailyTasks = useStore((state) => state.dailyTasks);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('INT');
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (status === 'idle') fetchToday();
  }, [fetchToday, status]);

  const handleComplete = async (task) => {
    setBusyId(task.ID);
    setFormError(null);
    const result = await completeDaily(task.ID);
    if (!result.ok) setFormError(result.error);
    setBusyId(null);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setFormError(null);
    const result = await createDailyTask({ title: title.trim(), type });
    if (result.ok) setTitle('');
    else setFormError(result.error);
    setCreating(false);
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    setFormError(null);
    const result = await deleteDailyTask(id);
    if (!result.ok) setFormError(result.error);
    setBusyId(null);
  };

  if (status === 'loading' && !today) {
    return <div className="page-shell"><div className="surface h-64 animate-pulse bg-white/[0.025]" /></div>;
  }

  if (status === 'error' && !today) {
    return (
      <div className="page-shell">
        <div className="surface mx-auto max-w-xl p-8 text-center">
          <h1 className="text-xl font-bold">Could not load today&apos;s focus</h1>
          <p className="mt-2 text-slate-400">{error}</p>
          <button className="button-primary mt-5" onClick={fetchToday}>Try again</button>
        </div>
      </div>
    );
  }

  const plan = today?.active_plan;
  const progress = plan?.total_nodes ? Math.round((plan.completed_nodes / plan.total_nodes) * 100) : 0;
  const habits = dailyTasks;
  const completedHabits = habits.filter((habit) => habit.IsCompleted).length;

  return (
    <div className="page-shell space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Daily learning</p>
          <h1 className="page-title mt-2">Today</h1>
          <p className="page-description mt-3">
            {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}. Start with recall, then continue your plan.
          </p>
        </div>
        {plan && <span className="status-pill">Current plan: {plan.topic}</span>}
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Learning summary">
        <MetricCard label="Reviews due" value={today?.due_review_count || 0} detail="Retrieval sessions ready now" />
        <MetricCard label="Lessons this week" value={today?.metrics?.lessons_completed_7d || 0} detail="Completed with a reflection" />
        <MetricCard label="Active learning days" value={today?.metrics?.active_days_30d || 0} detail="Over the last 30 days" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">First priority</p>
              <h2 className="mt-1 text-xl font-bold">Reviews due</h2>
            </div>
            <Link to="/archive" className="button-ghost">Open library</Link>
          </div>

          <div className="mt-5 space-y-2.5">
            {today?.due_reviews?.length ? today.due_reviews.map((review) => (
              <Link
                key={review.id}
                to={`/archive?node=${review.id}`}
                className="group flex min-h-16 items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-white/[0.018] px-4 py-3 transition-colors hover:border-sky-300/25 hover:bg-sky-300/[0.035]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-200 group-hover:text-white">{review.title}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{review.topic}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-sky-300">Review</span>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
                <p className="font-semibold text-slate-300">You are caught up</p>
                <p className="mt-1 text-sm text-slate-500">Completed lessons will return here when recall is due.</p>
              </div>
            )}
          </div>
        </div>

        <div className="surface p-5 md:p-6">
          <p className="eyebrow">Continue learning</p>
          {today?.next_lesson ? (
            <div className="mt-4 flex h-[calc(100%-2rem)] flex-col">
              <p className="text-sm font-medium text-slate-500">{today.next_lesson.topic}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{today.next_lesson.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">{today.next_lesson.codex?.learning_objective || today.next_lesson.description}</p>
              <div className="mt-5 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Practice</p>
                <p className="mt-2 text-sm text-slate-300">{today.next_lesson.codex?.practical_task}</p>
              </div>
              <Link to={`/forge?constellation=${today.next_lesson.constellation_id}&node=${today.next_lesson.id}`} className="button-primary mt-5 w-full sm:w-fit">Open lesson</Link>
            </div>
          ) : plan ? (
            <div className="mt-6 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] p-5">
              <p className="font-semibold text-emerald-200">Plan completed</p>
              <p className="mt-1 text-sm text-slate-400">Keep up with scheduled reviews or start a new learning plan.</p>
              <Link to="/forge" className="button-secondary mt-4">Create another plan</Link>
            </div>
          ) : (
            <div className="mt-6">
              <h2 className="text-xl font-bold">Create your first learning plan</h2>
              <p className="mt-2 text-sm text-slate-400">Choose a topic and Nebula will organize it into prerequisite-based lessons.</p>
              <Link to="/forge" className="button-primary mt-5">Go to Forge</Link>
            </div>
          )}
        </div>
      </section>

      {plan && (
        <section className="surface p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Current plan</p>
              <h2 className="mt-1 text-xl font-bold">{plan.topic}</h2>
            </div>
            <p className="text-sm text-slate-400">{plan.completed_nodes} of {plan.total_nodes} lessons completed</p>
          </div>
          <div className="progress-track mt-5" role="progressbar" aria-label={`${plan.topic} completion`} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </section>
      )}

      <section className="surface p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Real activity</p>
            <h2 className="mt-1 text-xl font-bold">Last 30 days</h2>
          </div>
          <p className="text-sm text-slate-500">Lessons, reviews, and habits recorded by the app</p>
        </div>
        <div className="mt-5"><ActivityGrid days={today?.activity_by_day || []} /></div>
      </section>

      <section className="surface p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Optional support</p>
            <h2 className="mt-1 text-xl font-bold">Habits</h2>
          </div>
          <p className="text-sm text-slate-500">{completedHabits}/{habits.length} completed today</p>
        </div>

        <form onSubmit={handleCreate} className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <label htmlFor="habit-title" className="field-label">New habit</label>
            <input id="habit-title" className="input-control" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Read for 20 minutes" maxLength={120} />
          </div>
          <fieldset>
            <legend className="field-label">Category</legend>
            <div className="flex min-h-11 overflow-hidden rounded-xl border border-[var(--border)] bg-[#0c111a]">
              {Object.entries(habitTypes).map(([key, item]) => (
                <label key={key} className={`flex cursor-pointer items-center px-3 text-sm ${type === key ? 'bg-white/[0.07] text-white' : 'text-slate-500'}`}>
                  <input className="sr-only" type="radio" name="habit-type" value={key} checked={type === key} onChange={() => setType(key)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-end"><button className="button-secondary w-full lg:w-auto" disabled={creating || !title.trim()}>{creating ? 'Adding…' : 'Add habit'}</button></div>
        </form>

        {formError && <p className="mt-3 text-sm text-rose-300" role="alert">{formError}</p>}

        <div className="mt-5 divide-y divide-[var(--border-soft)]">
          {habits.length ? habits.map((habit) => {
            const category = habitTypes[habit.Type] || habitTypes.INT;
            return (
              <div key={habit.ID} className="flex min-h-16 items-center gap-3 py-3">
                <button
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${habit.IsCompleted ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-[var(--border)] text-slate-500 hover:border-sky-300/30 hover:text-sky-200'}`}
                  onClick={() => handleComplete(habit)}
                  disabled={habit.IsCompleted || busyId === habit.ID}
                  aria-label={habit.IsCompleted ? `${habit.Title} completed` : `Complete ${habit.Title}`}
                >
                  {habit.IsCompleted ? '✓' : '○'}
                </button>
                <span className={`h-2 w-2 rounded-full ${category.color}`} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${habit.IsCompleted ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{habit.Title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{category.label} · {habit.Streak || 0} day streak</p>
                </div>
                <button className="button-ghost min-h-10 px-3 text-rose-300/70" onClick={() => handleDelete(habit.ID)} disabled={busyId === habit.ID} aria-label={`Delete ${habit.Title}`}>Delete</button>
              </div>
            );
          }) : <p className="py-8 text-center text-sm text-slate-500">No habits yet. Learning tasks above work independently.</p>}
        </div>
      </section>
    </div>
  );
}
