import { useEffect, useState } from 'react';
import useStore from '../store/useStore';

function getPendingCount(archiveData) {
  const now = new Date();
  let count = 0;
  archiveData.forEach(c => {
    c.nodes?.forEach(n => {
      if (n.ReviewCount === 0 || (n.NextReviewAt && new Date(n.NextReviewAt) < now)) {
        count++;
      }
    });
  });
  return count;
}

export default function Archive() {
  const archiveData  = useStore((s) => s.archiveData);
  const fetchArchive = useStore((s) => s.fetchArchive);
  const reviewNode   = useStore((s) => s.reviewNode);

  const [selectedConstellationId, setSelectedConstellationId] = useState(null);
  const [selectedShardId, setSelectedShardId]                 = useState(null);
  const [reviewingNodeId, setReviewingNodeId]                 = useState(null);

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  useEffect(() => {
    if (archiveData.length > 0 && !selectedConstellationId) {
      setSelectedConstellationId(archiveData[0].ID);
    }
  }, [archiveData, selectedConstellationId]);

  const handleSelectConstellation = (id) => {
    setSelectedConstellationId(id);
    setSelectedShardId(null);
  };

  const selectedConstellation = archiveData.find(c => c.ID === selectedConstellationId);
  const shards                = selectedConstellation?.nodes || [];
  const selectedShard         = shards.find(n => n.ID === selectedShardId);
  const pendingCount          = getPendingCount(archiveData);

  const handleReview = async (nodeId, quality) => {
    setReviewingNodeId(nodeId);
    const result = await reviewNode(nodeId, quality);
    if (result.ok) {
      setTimeout(() => setReviewingNodeId(null), 1500);
    } else {
      setReviewingNodeId(null);
    }
  };

  return (
    <div className="h-full flex overflow-hidden font-sans bg-[#050510]">

      <div className="w-[20%] min-w-[180px] flex flex-col border-r border-white/[0.06] overflow-hidden">
        <div className="shrink-0 px-4 pt-5 pb-3 border-b border-white/[0.04]">
          <span className="text-[9px] font-black tracking-[0.35em] text-slate-500 uppercase font-mono">
            CONSTELLATIONS
          </span>
        </div>

        <div className="shrink-0 mx-3 my-3">
          <div
            className="relative overflow-hidden border border-red-500/30 p-3 rounded-lg backdrop-blur-xl"
            style={{ background: 'rgba(239,68,68,0.04)', boxShadow: '0 0 20px rgba(239,68,68,0.08) inset' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-500 animate-pulse" />
            <div className="pl-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"
                  style={{ boxShadow: '0 0 6px rgba(239,68,68,1)' }}
                />
                <span className="text-[8px] font-black tracking-[0.3em] text-red-500 uppercase font-mono">
                  SYNAPTIC ALERT
                </span>
              </div>
              <p className="text-xl font-black text-white tabular-nums">
                {pendingCount}
                <span className="text-[9px] text-red-400/70 tracking-widest ml-1.5 uppercase font-mono">PENDING</span>
              </p>
              <p className="text-[8px] text-red-500/50 uppercase tracking-wider mt-0.5 font-mono">
                Entropy risk detected
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar px-3 pb-4 flex flex-col gap-0.5">
          {archiveData.length === 0 && (
            <div className="p-3 border border-dashed border-white/10 text-center mt-2 rounded">
              <span className="text-[9px] text-slate-600 uppercase tracking-widest font-mono">
                NO DATA
              </span>
            </div>
          )}
          {archiveData.map(c => {
            const isActive = selectedConstellationId === c.ID;
            return (
              <button
                key={c.ID}
                onClick={() => handleSelectConstellation(c.ID)}
                className={`w-full text-left px-3 py-2.5 border-l-2 transition-all duration-200 rounded ${
                  isActive
                    ? 'border-l-cyan-400 bg-cyan-500/[0.07] text-cyan-300'
                    : 'border-l-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] hover:border-l-slate-600'
                }`}
                style={isActive ? { boxShadow: 'inset 0 0 25px rgba(34,211,238,0.05), 0 0 15px rgba(34,211,238,0.15)' } : {}}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wider truncate font-sans"
                  style={isActive ? { textShadow: '0 0 8px rgba(34,211,238,0.5)' } : {}}
                >
                  {c.Topic}
                </p>
                <p className="text-[8px] text-slate-600 mt-0.5 tracking-widest font-mono">
                  {(c.nodes?.length || 0)} SHARDS
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-[30%] min-w-[200px] flex flex-col border-r border-white/[0.06] overflow-hidden">
        <div className="shrink-0 px-4 pt-5 pb-3 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-[9px] font-black tracking-[0.35em] text-slate-500 uppercase font-mono">
            DATA SHARDS
          </span>
          {selectedConstellation && (
            <span className="text-[8px] text-slate-700 tracking-wider truncate max-w-[50%] text-right font-mono">
              {selectedConstellation.Topic}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto hidden-scrollbar flex flex-col">
          {!selectedConstellationId && (
            <div className="flex items-center justify-center flex-1">
              <span className="text-[9px] text-slate-700 tracking-[0.3em] uppercase px-4 text-center font-mono">
                SELECT CONSTELLATION
              </span>
            </div>
          )}

          {selectedConstellationId && shards.length === 0 && (
            <div className="flex items-center justify-center flex-1">
              <span className="text-[9px] text-slate-700 tracking-[0.3em] uppercase px-4 text-center font-mono">
                NO VERIFIED SHARDS
              </span>
            </div>
          )}

          {shards.map((node, idx) => {
            const isActive = selectedShardId === node.ID;
            return (
              <button
                key={node.ID}
                onClick={() => setSelectedShardId(node.ID)}
                className={`w-full text-left px-4 py-3 border-b border-white/[0.04] border-l-2 transition-all duration-200 rounded ${
                  isActive
                    ? 'border-l-cyan-400 bg-cyan-500/[0.10] text-cyan-300'
                    : 'border-l-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300 hover:border-l-slate-700'
                }`}
                style={isActive ? { boxShadow: 'inset 0 0 25px rgba(34,211,238,0.05), 0 0 15px rgba(34,211,238,0.20)' } : {}}
              >
                <p className="text-[8px] text-slate-600 tracking-widest mb-0.5 font-mono">
                  SHARD X-{String(node.ID).padStart(3, '0')}
                </p>
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider truncate font-sans ${
                    isActive ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                  style={isActive ? { textShadow: '0 0 8px rgba(34,211,238,0.4)' } : {}}
                >
                  {node.Title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">

        {!selectedShard && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border border-dashed border-cyan-500/10 animate-[spin_20s_linear_infinite]"
              />
              <div
                className="absolute inset-3 rounded-full border border-dashed border-cyan-500/15 animate-[spin_12s_linear_infinite_reverse]"
              />
              <div
                className="w-2 h-2 rounded-full bg-cyan-500/30"
                style={{ boxShadow: '0 0 12px rgba(34,211,238,0.4)' }}
              />
            </div>
            <p className="text-[10px] text-slate-600 tracking-[0.4em] uppercase text-center max-w-[300px] leading-loose font-mono">
              SELECT DATA SHARD TO INITIATE<br />READING PROTOCOL
            </p>
          </div>
        )}

        {selectedShard && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto hidden-scrollbar px-8 py-6">

              <p className="text-[8px] text-slate-600 tracking-[0.4em] uppercase mb-2 font-mono">
                {selectedConstellation?.Topic} // SHARD X-{String(selectedShard.ID).padStart(3, '0')}
              </p>

              <h1
                className="text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400 mb-6 leading-tight font-sans"
                style={{ filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.3))' }}
              >
                {selectedShard.Title}
              </h1>

              <div className="mb-6">
                <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-black block mb-2 font-mono">
                  AI OVERVIEW
                </span>
                <p className="text-sm text-slate-300 leading-relaxed tracking-normal font-sans">
                  {selectedShard.Codex?.overview || '// NO AI OVERVIEW AVAILABLE'}
                </p>
              </div>

              {selectedShard.Codex?.key_concepts?.length > 0 && (
                <div className="mb-6">
                  <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-black block mb-2 font-mono">
                    KEY CONCEPTS
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedShard.Codex.key_concepts.map((concept, i) => (
                      <span
                        key={i}
                        className="text-[9px] text-cyan-400 border border-cyan-500/30 px-2.5 py-1 tracking-wider uppercase rounded font-mono"
                        style={{
                          background: 'rgba(34,211,238,0.04)',
                          boxShadow: '0 0 8px rgba(34,211,238,0.08) inset',
                        }}
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-black block mb-2 font-mono">
                  KNOWLEDGE SHARD // OPERATOR SYNTHESIS
                </span>
                <blockquote
                  className="border-l-4 border-cyan-500 pl-6 py-6 pr-6 rounded-r-lg font-sans"
                  style={{
                    background: 'rgba(11,12,16,0.85)',
                    borderLeftColor: '#06b6d4',
                    boxShadow: 'inset 0 0 50px rgba(34,211,238,0.08), 0 0 50px rgba(34,211,238,0.15)',
                    backdropFilter: 'blur(18px)',
                    border: '1px solid rgba(34,211,238,0.20)',
                  }}
                >
                  <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed tracking-normal text-slate-300">
                    {selectedShard.KnowledgeShard || '// EMPTY SHARD DATA — NO SYNTHESIS RECORDED'}
                  </p>
                </blockquote>
              </div>

              {selectedShard.Codex?.practical_task && (
                <div className="mb-2">
                  <span className="text-[9px] text-slate-600 tracking-[0.35em] uppercase font-black block mb-2 font-mono">
                    PRACTICAL DIRECTIVE
                  </span>
                  <div
                    className="border border-amber-500/30 px-4 py-3 text-sm text-amber-400/70 tracking-wide leading-relaxed font-sans rounded"
                    style={{ background: 'rgba(245,158,11,0.03)', boxShadow: '0 0 25px rgba(245,158,11,0.10)' }}
                  >
                    {selectedShard.Codex.practical_task}
                  </div>
                </div>
              )}

            </div>

            <div className="shrink-0 flex items-center justify-center gap-0 border-t border-white/[0.06] bg-black/40">
              {reviewingNodeId === selectedShard?.ID ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-cyan-400 font-mono text-[10px] tracking-[0.35em] uppercase">
                    [ ✓ NEURAL LINK UPDATED ]
                  </span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleReview(selectedShard.ID, 'hard')}
                    className="flex-1 py-4 text-[10px] font-black tracking-[0.35em] uppercase border-r border-white/[0.05] text-red-400 bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 transition-all duration-200 font-mono"
                  >
                    [ HARD ]
                  </button>
                  <button
                    onClick={() => handleReview(selectedShard.ID, 'good')}
                    className="flex-1 py-4 text-[10px] font-black tracking-[0.35em] uppercase border-r border-white/[0.05] text-yellow-400 bg-yellow-500/10 border border-yellow-500/50 hover:bg-yellow-500/20 transition-all duration-200 font-mono"
                  >
                    [ GOOD ]
                  </button>
                  <button
                    onClick={() => handleReview(selectedShard.ID, 'easy')}
                    className="flex-1 py-4 text-[10px] font-black tracking-[0.35em] uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 transition-all duration-200 font-mono"
                  >
                    [ EASY ]
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
