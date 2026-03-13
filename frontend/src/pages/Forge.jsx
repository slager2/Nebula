import { useState } from 'react';
import useStore from '../store/useStore';
import CosmicTree from '../CosmicTree';

const RESOURCE_ICONS = {
  article: '📄',
  video: '🎬',
  exercise: '🏋️',
};

function NodeInspector({ node, user, onClose }) {
  const unlockNode = useStore((s) => s.unlockNode);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const cost = node.cost || 1;
  const resources = node.resources || [];
  const canAfford = user && user.SkillPoints >= cost;

  const handleCommit = async () => {
    if (!canAfford || node.unlocked) return;
    setErrorMsg(null);
    setUnlocking(true);
    const result = await unlockNode(node.id);
    setUnlocking(false);
    if (result.ok) {
      setActiveNode(null);
    } else {
      setErrorMsg(result.data?.error || 'Failed to commit mastery.');
    }
  };

  return (
    <div className="w-80 bg-black/60 backdrop-blur-xl border-l border-white/5 flex flex-col shrink-0 relative overflow-hidden">
      {/* Neon edge */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="p-5 pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          {node.unlocked ? (
            <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full border border-emerald-400/20">
              Mastered
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold text-purple-400 px-2 py-0.5 bg-purple-400/10 rounded-full border border-purple-400/20">
              Locked
            </span>
          )}
          <span className="text-[10px] font-mono text-yellow-400">{cost} SP</span>
        </div>
        <h3 className="text-lg font-black text-white tracking-tight">{node.name}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{node.desc || 'Study this node to progress.'}</p>
      </div>

      {/* Resources — scrollable */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <h4 className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-3">Study Resources</h4>

        {resources.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No resources available for this node.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {resources.map((res, i) => (
              <a
                key={i}
                href={res.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition-all duration-200 cursor-pointer no-underline block"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">
                    {RESOURCE_ICONS[res.type] || '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium truncate">
                      {res.title}
                    </p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5 font-mono">
                      {res.type}
                    </p>
                  </div>
                  {/* External link icon */}
                  <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer — Error + Commit */}
      <div className="p-5 pt-3 border-t border-white/5 shrink-0">
        {/* Error Message */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
            ⚠ {errorMsg}
          </div>
        )}

        {node.unlocked ? (
          <div className="w-full text-center py-2.5 text-xs text-emerald-400 font-bold tracking-wider uppercase opacity-60">
            ✓ MASTERY COMMITTED
          </div>
        ) : (
          <button
            onClick={handleCommit}
            disabled={!canAfford || unlocking}
            className="w-full py-3 rounded-xl text-xs uppercase tracking-[0.15em] font-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canAfford
                ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))'
                : 'rgba(30,41,59,0.5)',
              border: canAfford ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(51,65,85,0.5)',
              color: canAfford ? '#67e8f9' : '#64748b',
              boxShadow: canAfford ? '0 0 20px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
            }}
          >
            {unlocking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                COMMITTING...
              </span>
            ) : (
              `COMMIT MASTERY // ${cost} SP`
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Forge() {
  const user = useStore((s) => s.user);
  const activeNode = useStore((s) => s.activeNode);
  const setActiveNode = useStore((s) => s.setActiveNode);
  const [constellationId, setConstellationId] = useState(1);
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  const generateTree = async (e) => {
    e.preventDefault();
    if (!topicInput) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('http://localhost:3000/api/v1/constellations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'Generation failed.');
        return;
      }
      setConstellationId(null);
      setActiveNode(null);
      setTimeout(() => setConstellationId(data.constellation.ID), 50);
    } catch {
      setGenError('Network error. Is the backend running?');
    } finally {
      setIsGenerating(false);
      setTopicInput('');
    }
  };

  const handleNodeClick = (node) => {
    setActiveNode(node);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Graph Area */}
      <div className="flex-1 relative overflow-hidden">
        {constellationId ? (
          <CosmicTree constellationId={constellationId} onNodeClick={handleNodeClick} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <h1 className="text-4xl font-bold tracking-tighter text-white/20 mb-4">FORGE SYSTEM</h1>
            <p>Generate a constellation to begin.</p>
          </div>
        )}
      </div>

      {/* Right Panel — Contextual */}
      {activeNode ? (
        <NodeInspector
          node={activeNode}
          user={user}
          onClose={() => setActiveNode(null)}
        />
      ) : (
        <div className="w-72 bg-black/40 backdrop-blur-md border-l border-white/5 flex flex-col p-5 shrink-0 overflow-hidden">
          <h3 className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Forge Constellation</h3>
          <form onSubmit={generateTree} className="relative mb-6">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="e.g. Distributed Systems"
              className="w-full bg-slate-900/80 text-sm border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="mt-2 w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg py-2.5 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50"
            >
              {isGenerating ? 'GENERATING...' : 'INITIALIZE'}
            </button>
          </form>

          {/* Generation Error */}
          {genError && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
              ⚠ {genError}
            </div>
          )}

          {/* SP Display */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 mb-4">
            <span className="text-xs text-slate-400">Skill Points</span>
            <span className="text-lg font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
              {user?.SkillPoints || 0} SP
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              Click a node on the graph<br />to inspect its resources
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
