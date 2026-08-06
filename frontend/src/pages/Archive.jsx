import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useStore from '../store/useStore';

const isDue = (node) => !node?.NextReviewAt || new Date(node.NextReviewAt) <= new Date();

function ReviewSession({ node }) {
  const reviewNode = useStore((state) => state.reviewNode);
  const [attempt, setAttempt] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const due = isDue(node);
  const codex = node.Codex || {};

  const submit = async (quality) => {
    setSubmitting(quality);
    setError(null);
    const result = await reviewNode(node.ID, quality);
    if (result.ok) {
      setMessage(`Next review: ${new Date(result.data.node.NextReviewAt).toLocaleString()}`);
    } else {
      setError(result.error);
    }
    setSubmitting(null);
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-7 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-pill">{due ? 'Review due' : 'Notes'}</span>
        {node.NextReviewAt && <span className="text-xs text-slate-500">Scheduled {new Date(node.NextReviewAt).toLocaleString()}</span>}
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{node.Title}</h1>
      <p className="mt-3 text-slate-400">Start from memory. Reveal your notes only after you have made a genuine recall attempt.</p>

      <section className="mt-7 rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-5 md:p-6">
        <p className="eyebrow text-violet-300">Recall prompt</p>
        <p className="mt-3 text-lg font-semibold leading-7 text-slate-100">{codex.recall_prompt || `Explain ${node.Title} without looking at your notes.`}</p>
        {due && !revealed && (
          <div className="mt-5">
            <label htmlFor={`recall-${node.ID}`} className="field-label">Your recall attempt</label>
            <textarea id={`recall-${node.ID}`} className="input-control min-h-32 resize-y" value={attempt} onChange={(event) => setAttempt(event.target.value)} placeholder="Write what you remember. This attempt stays private and is not graded." />
            <button className="button-primary mt-3" onClick={() => setRevealed(true)} disabled={!attempt.trim()}>Reveal notes</button>
          </div>
        )}
        {!due && !revealed && <button className="button-secondary mt-5" onClick={() => setRevealed(true)}>Show lesson notes</button>}
      </section>

      {revealed && (
        <div className="mt-7 space-y-6">
          <section>
            <h2 className="text-lg font-bold">Overview</h2>
            <p className="mt-2 leading-7 text-slate-300">{codex.overview || 'No overview was saved for this lesson.'}</p>
          </section>

          {codex.key_concepts?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400">Key concepts</h2>
              <div className="mt-3 flex flex-wrap gap-2">{codex.key_concepts.map((concept) => <span key={concept} className="status-pill">{concept}</span>)}</div>
            </section>
          )}

          <section className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.03] p-5">
            <h2 className="text-sm font-semibold text-emerald-200">Your original reflection</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-300">{node.KnowledgeShard || 'No reflection was recorded.'}</p>
          </section>

          {codex.practical_task && (
            <section className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-5">
              <h2 className="text-sm font-semibold text-amber-200">Practice reminder</h2>
              <p className="mt-2 leading-6 text-slate-300">{codex.practical_task}</p>
            </section>
          )}

          {due && !message && (
            <section>
              <h2 className="text-lg font-bold">How well did recall go?</h2>
              <p className="mt-1 text-sm text-slate-500">Rate the attempt, not your familiarity after seeing the answer.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button className="button-danger" onClick={() => submit('again')} disabled={submitting}>Again</button>
                <button className="button-secondary" onClick={() => submit('hard')} disabled={submitting}>Hard</button>
                <button className="button-secondary" onClick={() => submit('good')} disabled={submitting}>Good</button>
                <button className="button-primary" onClick={() => submit('easy')} disabled={submitting}>Easy</button>
              </div>
            </section>
          )}

          {message && <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.04] p-4 text-sm text-emerald-200" role="status">{message}</p>}
          {error && <p className="rounded-xl border border-rose-300/20 bg-rose-300/[0.04] p-4 text-sm text-rose-200" role="alert">{error}</p>}
        </div>
      )}
    </article>
  );
}

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const archive = useStore((state) => state.archiveData);
  const status = useStore((state) => state.archiveStatus);
  const error = useStore((state) => state.archiveError);
  const fetchArchive = useStore((state) => state.fetchArchive);
  const [selectedConstellationId, setSelectedConstellationId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  useEffect(() => {
    if (status === 'idle') fetchArchive();
  }, [fetchArchive, status]);

  const queryNodeId = Number(searchParams.get('node')) || null;
  const queryConstellation = archive.find((constellation) => constellation.nodes?.some((node) => node.ID === queryNodeId));
  const activeConstellationId = selectedConstellationId || queryConstellation?.ID || archive[0]?.ID || null;
  const activeConstellation = archive.find((constellation) => constellation.ID === activeConstellationId);
  const nodes = activeConstellation?.nodes || [];
  const activeNodeId = selectedNodeId || (nodes.some((node) => node.ID === queryNodeId) ? queryNodeId : null);
  const selectedNode = nodes.find((node) => node.ID === activeNodeId);
  const dueCount = archive.reduce((total, constellation) => total + (constellation.nodes || []).filter(isDue).length, 0);

  const selectConstellation = (id) => {
    setSelectedConstellationId(id);
    setSelectedNodeId(null);
    setSearchParams({});
  };

  const selectNode = (id) => {
    setSelectedNodeId(id);
    setSearchParams({ node: String(id) });
  };

  if (status === 'loading' && archive.length === 0) return <div className="page-shell"><div className="surface h-72 animate-pulse bg-white/[0.025]" /></div>;
  if (status === 'error' && archive.length === 0) return <div className="page-shell"><div className="surface mx-auto max-w-lg p-8 text-center"><h1 className="text-xl font-bold">Could not load your library</h1><p className="mt-2 text-slate-400">{error}</p><button className="button-primary mt-5" onClick={fetchArchive}>Try again</button></div></div>;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh lg:min-h-0">
      <header className="border-b border-[var(--border-soft)] bg-[#0c111a]/92 px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Completed lessons</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Library</h1></div>
          <span className="status-pill">{dueCount} reviews due</span>
        </div>
      </header>

      {archive.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-xl font-bold">Your library is empty</h2><p className="mt-2 text-sm text-slate-500">Complete a lesson in Forge and its notes will appear here.</p></div></div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] lg:grid-cols-[230px_290px_1fr] lg:grid-rows-1">
          <aside className="overflow-x-auto border-b border-[var(--border-soft)] bg-[#0b1018] p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex gap-2 lg:flex-col">
              {archive.map((constellation) => (
                <button key={constellation.ID} onClick={() => selectConstellation(constellation.ID)} className={`min-w-52 rounded-xl p-3 text-left lg:min-w-0 ${constellation.ID === activeConstellationId ? 'bg-sky-300/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.035]'}`}>
                  <p className="truncate text-sm font-semibold">{constellation.Topic}</p>
                  <p className="mt-1 text-xs text-slate-600">{constellation.nodes?.length || 0} completed</p>
                </button>
              ))}
            </div>
          </aside>

          <aside className="overflow-x-auto border-b border-[var(--border-soft)] bg-[#0d131d] p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="flex gap-2 lg:flex-col">
              {nodes.map((node) => (
                <button key={node.ID} onClick={() => selectNode(node.ID)} className={`min-w-60 rounded-xl border p-3 text-left lg:min-w-0 ${node.ID === activeNodeId ? 'border-violet-300/20 bg-violet-300/[0.055]' : 'border-transparent hover:bg-white/[0.035]'}`}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-200">{node.Title}</p>{isDue(node) && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" title="Review due" />}</div>
                  <p className="mt-1 text-xs text-slate-600">{isDue(node) ? 'Ready for recall' : `Next ${new Date(node.NextReviewAt).toLocaleDateString()}`}</p>
                </button>
              ))}
              {nodes.length === 0 && <p className="p-3 text-sm text-slate-500">No completed lessons in this plan.</p>}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto bg-[#090d15]">
            {selectedNode ? <ReviewSession key={selectedNode.ID} node={selectedNode} /> : <div className="flex min-h-[420px] items-center justify-center p-8 text-center"><div><h2 className="text-xl font-bold">Choose a completed lesson</h2><p className="mt-2 text-sm text-slate-500">Review due lessons are marked with an amber dot.</p></div></div>}
          </main>
        </div>
      )}
    </div>
  );
}
