import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import CosmicTree from '../CosmicTree';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function NodeInspector({ node, user, constellationId, onClose, onConstellationDeleted }) {
  const verifyNode = useStore((s) => s.verifyNode);
  const deleteConstellation = useStore((s) => s.deleteConstellation);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // localStorage draft persistence — load saved draft for this node
  const draftKey = `draft_${node.id}`;
  const [knowledgeShard, setKnowledgeShard] = useState(() => {
    if (node.unlocked) return '';
    try { return localStorage.getItem(draftKey) || ''; } catch { return ''; }
  });

  // Reset state when node changes
  useEffect(() => {
    setErrorMsg(null);
    if (node.unlocked) {
      setKnowledgeShard('');
      return;
    }
    try {
      setKnowledgeShard(localStorage.getItem(`draft_${node.id}`) || '');
    } catch {
      setKnowledgeShard('');
    }
  }, [node.id, node.unlocked]);

  // Auto-save draft to localStorage on every keystroke
  useEffect(() => {
    if (node.unlocked) return;
    try {
      if (knowledgeShard.trim().length > 0) {
        localStorage.setItem(draftKey, knowledgeShard);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch { /* quota exceeded — silently ignore */ }
  }, [knowledgeShard, draftKey, node.unlocked]);

  const codex = node.codex || {};
  const keyConcepts = codex.key_concepts || [];
  const isShardReady = knowledgeShard.trim().length >= 50;

  const handleCommit = async () => {
    if (!isShardReady || node.unlocked) return;
    setErrorMsg(null);
    setVerifying(true);
    const result = await verifyNode(node.id, knowledgeShard.trim());
    setVerifying(false);
    if (result.ok) {
      try { localStorage.removeItem(draftKey); } catch {}
      setKnowledgeShard('');
    } else {
      setErrorMsg(result.data?.error || 'Verification failed.');
   }
   };

   const handleDelete = async () => {
     if (!window.confirm('Delete this entire constellation and all its nodes? This cannot be undone.')) {
       return;
     }
     setDeleting(true);
     const result = await deleteConstellation(constellationId);
     setDeleting(false);
     if (result.ok) {
       onConstellationDeleted?.();
       onClose();
     } else {
       setErrorMsg(result.data?.error || 'Deletion failed.');
     }
   };

   const charCount = knowledgeShard.trim().length;

  return (
    <div className="w-96 bg-black/70 backdrop-blur-xl border-l border-cyan-500/10 flex flex-col shrink-0 relative overflow-hidden">
      {/* Neon edge glow */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/40 to-transparent" />

       {/* Close */}
       <button
         onClick={onClose}
         className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
       >
         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
         </svg>
       </button>

       {/* Delete Constellation Button */}
       <button
         onClick={handleDelete}
         disabled={deleting}
         className="absolute top-4 right-12 text-slate-500 hover:text-red-400 transition-colors z-10 disabled:opacity-50"
         title="Delete constellation"
       >
         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
         </svg>
       </button>

      {/* Header */}
      <div className="p-5 pb-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          {node.unlocked ? (
            <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded-full border border-emerald-400/20">
              Verified
            </span>
          ) : (
            <span className="text-[10px] uppercase font-bold text-purple-400 px-2 py-0.5 bg-purple-400/10 rounded-full border border-purple-400/20">
              Locked
            </span>
          )}
        </div>
        <h3 className="text-lg font-black text-white tracking-tight">{node.name}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{node.desc || 'Study this node to progress.'}</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

        {/* CODEX: Overview */}
        {codex.overview && (
          <div className="p-3.5 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03]">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-cyan-500/60 uppercase mb-2">Overview</h4>
            <p className="text-sm text-slate-300 leading-relaxed" style={{ textShadow: '0 0 8px rgba(6,182,212,0.1)' }}>
              {codex.overview}
            </p>
          </div>
        )}

        {/* CODEX: Key Concepts */}
        {keyConcepts.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-cyan-500/60 uppercase mb-2">Key Concepts</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyConcepts.map((concept, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))',
                    borderColor: 'rgba(6,182,212,0.2)',
                    color: '#67e8f9',
                    textShadow: '0 0 6px rgba(6,182,212,0.3)',
                  }}
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CODEX: Practical Task */}
        {codex.practical_task && (
          <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.04]">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-amber-400/70 uppercase mb-2">⚡ Practical Task</h4>
            <p className="text-sm text-amber-200/80 leading-relaxed font-medium">
              {codex.practical_task}
            </p>
          </div>
        )}

        {/* Knowledge Shard Input — only for locked nodes */}
        {!node.unlocked && (
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-2">Knowledge Shard</h4>
            <textarea
              value={knowledgeShard}
              onChange={(e) => setKnowledgeShard(e.target.value)}
              placeholder="Upload your knowledge shard to the Nebula matrix... (Min 50 chars)"
              rows={4}
              className="w-full p-3 rounded-lg text-sm leading-relaxed resize-none focus:outline-none transition-all"
              style={{
                background: '#0a0a0f',
                border: '1px solid rgba(34,197,94,0.15)',
                color: '#4ade80',
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '12px',
                caretColor: '#4ade80',
                boxShadow: knowledgeShard.length > 0 ? '0 0 12px rgba(34,197,94,0.05)' : 'none',
              }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[10px] font-mono ${charCount >= 50 ? 'text-emerald-400' : 'text-slate-600'}`}>
                {charCount}/50 chars
              </span>
              {charCount > 0 && charCount < 50 && (
                <span className="text-[10px] text-red-400/70 font-mono">
                  {50 - charCount} more needed
                </span>
              )}
              {charCount >= 50 && (
                <span className="text-[10px] text-emerald-400 font-mono">✓ Ready</span>
              )}
            </div>
          </div>
        )}

        {/* Previously written shard — for verified nodes */}
        {node.unlocked && node.knowledge_shard && (
          <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
            <h4 className="text-[10px] font-bold tracking-[0.2em] text-emerald-500/60 uppercase mb-2">Your Knowledge Shard</h4>
            <p className="text-xs text-emerald-300/70 font-mono leading-relaxed">{node.knowledge_shard}</p>
          </div>
        )}
      </div>

      {/* Footer — Error + Verify */}
      <div className="p-5 pt-3 border-t border-white/5 shrink-0">
        {errorMsg && (
          <div
            className="mb-3 p-2.5 rounded-lg text-xs font-mono"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <span className="mr-1">⚠</span> {errorMsg}
          </div>
        )}

        {node.unlocked ? (
          <div className="w-full text-center py-2.5 text-xs text-emerald-400 font-bold tracking-wider uppercase opacity-60">
            ✓ KNOWLEDGE VERIFIED
          </div>
        ) : (
          <button
            onClick={handleCommit}
            disabled={!isShardReady || verifying}
            className="w-full py-3 rounded-xl text-xs uppercase tracking-[0.15em] font-black transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isShardReady
                ? 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))'
                : 'rgba(30,41,59,0.5)',
              border: isShardReady ? '1px solid rgba(6,182,212,0.3)' : '1px solid rgba(51,65,85,0.3)',
              color: isShardReady ? '#67e8f9' : '#475569',
              boxShadow: isShardReady ? '0 0 25px rgba(6,182,212,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
            }}
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                VERIFYING...
              </span>
            ) : (
              'VERIFY KNOWLEDGE'
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
  
  const syncRate = user?.SyncRate ?? 0;
  const isLocked = syncRate < 50;

  const generateTree = async (e) => {
    e.preventDefault();
    if (!topicInput) return;
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`${API}/constellations/generate`, {
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
    <div className="h-screen flex overflow-hidden relative">
      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-red-950/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-auto">
          <p className="text-2xl font-black text-red-400 tracking-[0.2em] mb-4 uppercase">
            [!] UPLINK SEVERED
          </p>
          <p className="text-red-500/80 font-mono text-[10px] tracking-[0.35em] uppercase max-w-xs text-center">
            SYNC RATE CRITICAL<br />COMPLETE DAILY ROUTINES TO RESTORE
          </p>
        </div>
      )}
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
          constellationId={constellationId}
          onClose={() => setActiveNode(null)}
          onConstellationDeleted={() => setConstellationId(null)}
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
              disabled={isGenerating || !topicInput.trim() || isLocked}
              className="mt-2 w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg py-2.5 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50"
            >
              {isGenerating ? 'GENERATING...' : 'INITIALIZE'}
            </button>
          </form>

          {/* Generation Error */}
          {genError && (
            <div className="mb-4 p-2.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              ⚠ {genError}
            </div>
           )}

           {/* Sync Rate Display */}
           <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 mb-4">
            <span className="text-xs text-slate-400">Sync Rate</span>
            <span
              className="text-lg font-black font-mono"
              style={{
                color: syncRate >= 80 ? '#22d3ee' : syncRate >= 50 ? '#a78bfa' : '#f87171',
                textShadow: syncRate >= 80 ? '0 0 12px rgba(34,211,238,0.4)' : 'none',
              }}
            >
              {syncRate.toFixed(0)}%
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-[11px] text-slate-600 text-center leading-relaxed">
              Click a node on the graph<br />to open its Codex
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
