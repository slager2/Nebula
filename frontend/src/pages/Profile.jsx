import { useState } from 'react';
import useStore from '../store/useStore';

function getBmiLabel(value) {
  if (!value) return 'Add height and weight to calculate';
  if (value < 18.5) return 'Below the common reference range';
  if (value < 25) return 'Within the common reference range';
  if (value < 30) return 'Above the common reference range';
  return 'Well above the common reference range';
}

export default function Profile() {
  const user = useStore((state) => state.user);
  const profileStatus = useStore((state) => state.profileStatus);
  const profileError = useStore((state) => state.profileError);
  const fetchProfile = useStore((state) => state.fetchProfile);
  const updatePhysics = useStore((state) => state.updatePhysics);
  const today = useStore((state) => state.learningToday);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (profileStatus === 'loading' && !user) return <div className="page-shell"><div className="surface h-64 animate-pulse bg-white/[0.025]" /></div>;
  if (!user) return <div className="page-shell"><div className="surface mx-auto max-w-lg p-8 text-center"><h1 className="text-xl font-bold">Could not load your profile</h1><p className="mt-2 text-slate-400">{profileError}</p><button className="button-primary mt-5" onClick={fetchProfile}>Try again</button></div></div>;

  const currentHeight = Number(height || user.Height || 0);
  const currentWeight = Number(weight || user.Weight || 0);
  const bmi = currentHeight >= 50 && currentWeight >= 20 ? currentWeight / ((currentHeight / 100) ** 2) : 0;
  const plan = today?.active_plan;
  const planProgress = plan?.total_nodes ? Math.round((plan.completed_nodes / plan.total_nodes) * 100) : 0;

  const save = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (currentHeight < 50 || currentHeight > 250 || currentWeight < 20 || currentWeight > 400) {
      setError('Enter a height from 50-250 cm and a weight from 20-400 kg.');
      return;
    }
    setSaving(true);
    const result = await updatePhysics(currentHeight, currentWeight);
    if (result.ok) {
      setMessage('Body metrics saved.');
      setHeight('');
      setWeight('');
    } else setError(result.error);
    setSaving(false);
  };

  return (
    <div className="page-shell space-y-6">
      <header>
        <p className="eyebrow">Account and preferences</p>
        <h1 className="page-title mt-2">Profile</h1>
        <p className="page-description mt-3">A simple overview of your learning activity and optional body metrics. These metrics do not control access to learning features.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-muted p-4"><p className="text-sm text-slate-500">Current plan</p><p className="mt-2 truncate text-xl font-bold">{plan?.topic || 'No active plan'}</p><p className="mt-1 text-xs text-slate-600">{plan ? `${plan.completed_nodes}/${plan.total_nodes} lessons` : 'Create one in Forge'}</p></div>
        <div className="surface-muted p-4"><p className="text-sm text-slate-500">Plan completion</p><p className="mt-2 text-3xl font-bold">{planProgress}%</p><div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${planProgress}%` }} /></div></div>
        <div className="surface-muted p-4"><p className="text-sm text-slate-500">Reviews due</p><p className="mt-2 text-3xl font-bold">{today?.due_review_count || 0}</p><p className="mt-1 text-xs text-slate-600">Ready for retrieval practice</p></div>
        <div className="surface-muted p-4"><p className="text-sm text-slate-500">Active days</p><p className="mt-2 text-3xl font-bold">{today?.metrics?.active_days_30d || 0}</p><p className="mt-1 text-xs text-slate-600">Learning days in the last month</p></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <form onSubmit={save} className="surface p-5 md:p-6">
          <h2 className="text-xl font-bold">Body metrics</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Optional personal reference values. Nebula does not provide medical diagnosis or recommendations.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="height">Height (cm)</label>
              <input id="height" className="input-control" type="number" min="50" max="250" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} placeholder={user.Height ? String(user.Height) : '175'} />
            </div>
            <div>
              <label className="field-label" htmlFor="weight">Weight (kg)</label>
              <input id="weight" className="input-control" type="number" min="20" max="400" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder={user.Weight ? String(user.Weight) : '70'} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p>}
          {message && <p className="mt-3 text-sm text-emerald-300" role="status">{message}</p>}
          <button className="button-primary mt-5" disabled={saving}>{saving ? 'Saving…' : 'Save metrics'}</button>
        </form>

        <div className="surface p-5 md:p-6">
          <p className="text-sm font-semibold text-slate-400">Body mass index</p>
          <p className="mt-4 text-5xl font-bold tracking-tight">{bmi ? bmi.toFixed(1) : '—'}</p>
          <p className="mt-3 text-sm text-slate-400">{getBmiLabel(bmi)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="surface-muted p-3"><p className="text-xs text-slate-600">Height</p><p className="mt-1 font-semibold">{currentHeight || '—'} cm</p></div>
            <div className="surface-muted p-3"><p className="text-xs text-slate-600">Weight</p><p className="mt-1 font-semibold">{currentWeight || '—'} kg</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
