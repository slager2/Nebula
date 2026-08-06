import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CosmicTree from '../CosmicTree';
import useStore from '../store/useStore';
import { apiRequest } from '../api';

const statusCopy = {
  blocked: { label: 'Blocked', className: 'border-slate-500/20 bg-slate-500/[0.06] text-slate-400' },
  available: { label: 'Ready to learn', className: 'border-sky-300/20 bg-sky-300/[0.06] text-sky-200' },
  completed: { label: 'Completed', className: 'border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200' },
};

function NodeInspector({ node, constellationId, onClose, onDeleted }) {
  const completeNode = useStore((state) => state.completeNode);
  const deleteConstellation = useStore((state) => state.deleteConstellation);
  const [reflection, setReflection] = useState(() => {
    try { return localStorage.getItem(`reflection_${node.id}`) || ''; } catch { return ''; }
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (node.unlocked) return undefined;
    const timer = window.setTimeout(() => {
      try {
        if (reflection.trim()) localStorage.setItem(`reflection_${node.id}`, reflection);
        else localStorage.removeItem(`reflection_${node.id}`);
      } catch { /* Local drafts are optional. */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [node.id, node.unlocked, reflection]);

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    const result = await completeNode(node.id, reflection.trim());
    if (result.ok) {
      try { localStorage.removeItem(`reflection_${node.id}`); } catch { /* Local drafts are optional. */ }
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this learning plan and all of its lessons?')) return;
    setDeleting(true);
    const result = await deleteConstellation(constellationId);
    if (result.ok) onDeleted();
    else setError(result.error);
    setDeleting(false);
  };

  const codex = node.codex || {};
  const state = statusCopy[node.status] || statusCopy.blocked;
  const count = Array.from(reflection.trim()).length;

  return (
    <aside className="fixed inset-x-0 z-50 flex max-h-[76dvh] flex-col overflow-hidden rounded-t-3xl border-t border-[var(--border)] bg-[#0d131d] shadow-2xl xl:static xl:inset-auto xl:max-h-none xl:w-[410px] xl:shrink-0 xl:rounded-none xl:border-l xl:border-t-0" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-700 xl:hidden" />
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] p-5">
        <div className="min-w-0">
          <span className={`status-pill ${state.className}`}>{state.label}</span>
          <h2 className="mt-3 text-xl font-bold tracking-tight">{node.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{node.desc}</p>
        </div>
        <button className="button-ghost min-h-10 shrink-0 px-3" onClick={onClose} aria-label="Close lesson">Close</button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section>
          <p className="eyebrow">Learning objective</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{codex.learning_objective || codex.overview || node.desc}</p>
        </section>

        {codex.overview && (
          <section className="surface-muted p-4">
            <h3 className="text-sm font-semibold text-slate-200">Overview</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{codex.overview}</p>
          </section>
        )}

        {codex.key_concepts?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-300">Key concepts</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {codex.key_concepts.map((concept) => <span key={concept} className="status-pill">{concept}</span>)}
            </div>
          </section>
        )}

        {codex.practical_task && (
          <section className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-4">
            <h3 className="text-sm font-semibold text-amber-200">Practice</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{codex.practical_task}</p>
            {codex.completion_criteria && <p className="mt-3 border-t border-amber-200/10 pt-3 text-xs leading-5 text-slate-500"><strong className="text-slate-400">Done when:</strong> {codex.completion_criteria}</p>}
          </section>
        )}

        {node.status === 'blocked' && (
          <div className="rounded-xl border border-slate-500/15 bg-white/[0.02] p-4 text-sm text-slate-400">
            Complete the prerequisite lesson before recording this one. You can still read the material and prepare.
          </div>
        )}

        {node.status === 'available' && (
          <section>
            <label htmlFor={`reflection-${node.id}`} className="field-label">Your reflection and practice result</label>
            <p className="mb-3 text-xs leading-5 text-slate-500">Explain the idea in your own words, describe what happened in the practical task, and note one remaining question.</p>
            <textarea id={`reflection-${node.id}`} className="input-control min-h-36 resize-y" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What did you understand? What did you build or try? What is still unclear?" />
            <div className="mt-2 flex justify-between text-xs text-slate-600"><span>Saved locally as a draft</span><span className={count >= 80 ? 'text-emerald-300' : ''}>{count}/80 minimum</span></div>
          </section>
        )}

        {node.unlocked && node.knowledge_shard && (
          <section className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.03] p-4">
            <h3 className="text-sm font-semibold text-emerald-200">Your reflection</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{node.knowledge_shard}</p>
            {node.next_review_at && <p className="mt-3 text-xs text-slate-500">Next review: {new Date(node.next_review_at).toLocaleString()}</p>}
          </section>
        )}

        {error && <p className="rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-3 text-sm text-rose-200" role="alert">{error}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] p-4">
        {node.status === 'available' && <button className="button-primary w-full" onClick={handleComplete} disabled={saving || count < 80}>{saving ? 'Saving lesson…' : 'Complete lesson'}</button>}
        {node.status === 'completed' && <p className="py-2 text-center text-sm text-emerald-200">Lesson completed and scheduled for review</p>}
        <button className="button-ghost w-full text-rose-300/70" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete learning plan'}</button>
      </div>
    </aside>
  );
}

export default function Forge() {
  const [searchParams, setSearchParams] = useSearchParams();
  const plans = useStore((state) => state.plans);
  const plansStatus = useStore((state) => state.plansStatus);
  const fetchPlans = useStore((state) => state.fetchPlans);
  const fetchLearningToday = useStore((state) => state.fetchLearningToday);
  const activeNode = useStore((state) => state.activeNode);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const constellationId = Number(searchParams.get('constellation')) || null;
  const initialNodeId = searchParams.get('node');
  const plan = plans.find((item) => item.id === constellationId);
  const selectedNode = activeNode?.constellation_id === constellationId ? activeNode : null;

  useEffect(() => {
    if (plansStatus === 'idle') fetchPlans();
  }, [fetchPlans, plansStatus]);

  const selectPlan = (id) => {
    setActiveNode(null);
    setSearchParams({ constellation: String(id) });
  };

  const selectNode = useCallback((node) => {
    setActiveNode(node);
  }, [setActiveNode]);

  const generatePlan = async (event) => {
    event.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await apiRequest('/constellations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      setTopic('');
      setActiveNode(null);
      await Promise.all([fetchPlans(), fetchLearningToday()]);
      setSearchParams({ constellation: String(data.constellation.ID) });
    } catch (requestError) {
      setError(requestError.message);
    }
    setGenerating(false);
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh lg:min-h-0">
      <header className="border-b border-[var(--border-soft)] bg-[#0c111a]/92 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">Learning plans</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Forge</h1>
            <p className="mt-1 text-sm text-slate-500">Generate a plan, inspect any lesson, and continue from available prerequisites.</p>
          </div>
          <form onSubmit={generatePlan} className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
            <label className="sr-only" htmlFor="plan-topic">Learning topic</label>
            <input id="plan-topic" className="input-control flex-1" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} placeholder="What do you want to learn?" />
            <button className="button-primary shrink-0" disabled={generating || !topic.trim()}>{generating ? 'Building plan…' : 'Create plan'}</button>
          </form>
        </div>
        {error && <p className="mx-auto mt-3 max-w-[1500px] text-sm text-rose-300" role="alert">{error}</p>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <aside className="shrink-0 border-b border-[var(--border-soft)] bg-[#0b1018] p-3 xl:w-64 xl:border-b-0 xl:border-r">
          <div className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-y-auto">
            {plans.map((item) => {
              const itemProgress = item.total_nodes ? Math.round((item.completed_nodes / item.total_nodes) * 100) : 0;
              return (
                <button key={item.id} className={`min-w-56 rounded-xl border p-3 text-left transition-colors xl:min-w-0 ${item.id === constellationId ? 'border-sky-300/25 bg-sky-300/[0.055]' : 'border-transparent hover:bg-white/[0.035]'}`} onClick={() => selectPlan(item.id)}>
                  <p className="truncate text-sm font-semibold text-slate-200">{item.topic}</p>
                  <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${itemProgress}%` }} /></div>
                  <p className="mt-2 text-xs text-slate-600">{item.completed_nodes}/{item.total_nodes} lessons · {item.due_reviews} due</p>
                </button>
              );
            })}
            {plansStatus === 'success' && plans.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Your plans will appear here.</p>}
			{plansStatus === 'error' && <div className="min-w-56 px-3 py-2 text-sm text-rose-300 xl:min-w-0"><p>Could not load plans.</p><button className="button-ghost mt-2 px-0" onClick={fetchPlans}>Try again</button></div>}
          </div>
        </aside>

        <section className="relative min-h-[560px] min-w-0 flex-1 overflow-hidden">
          {constellationId ? (
            <CosmicTree constellationId={constellationId} initialNodeId={initialNodeId} onNodeClick={selectNode} />
          ) : (
            <div className="star-field flex h-full min-h-[560px] items-center justify-center p-6 text-center">
              <div className="max-w-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.05] text-2xl text-sky-200">✦</div>
                <h2 className="mt-5 text-2xl font-bold">Choose a plan or create one</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">The map shows completed, available, and blocked lessons without preventing you from reading ahead.</p>
              </div>
            </div>
          )}
        </section>

        {selectedNode ? (
          <NodeInspector key={selectedNode.id} node={selectedNode} constellationId={constellationId} onClose={() => setActiveNode(null)} onDeleted={() => setSearchParams({})} />
        ) : constellationId && (
          <aside className="hidden w-72 shrink-0 border-l border-[var(--border-soft)] bg-[#0d131d] p-5 xl:block">
            <p className="eyebrow">{plan?.topic || 'Learning plan'}</p>
            <h2 className="mt-2 text-lg font-bold">Select a lesson</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Every star is inspectable. Bright blue lessons are ready now, green lessons are completed, and muted lessons need a prerequisite.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
