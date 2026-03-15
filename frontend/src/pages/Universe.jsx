import { useEffect, useState } from 'react';
import useStore from '../store/useStore';

export default function Archive() {
  const archiveData = useStore((s) => s.archiveData);
  const fetchArchive = useStore((s) => s.fetchArchive);
  const [selectedConstellationId, setSelectedConstellationId] = useState(null);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  useEffect(() => {
    if (archiveData.length > 0 && !selectedConstellationId) {
      setSelectedConstellationId(archiveData[0].ID);
    }
  }, [archiveData, selectedConstellationId]);

  // Calculate pending reviews
  let pendingCount = 0;
  const now = new Date();
  
  archiveData.forEach(c => {
    c.nodes?.forEach(n => {
      // ReviewCount == 0 OR NextReviewAt is in the past
      if (n.ReviewCount === 0 || (n.NextReviewAt && new Date(n.NextReviewAt) < now)) {
        pendingCount++;
      }
    });
  });

  const selectedConstellation = archiveData.find(c => c.ID === selectedConstellationId);
  const nodes = selectedConstellation?.nodes || [];

  const handleReview = (nodeId, difficulty) => {
    console.log(`Review Node ${nodeId} - Difficulty: ${difficulty}`);
    // Will be wired to API later
  };

  return (
    <div className="h-full flex overflow-hidden bg-[#030014]">
      {/* 25% Left Sidebar */}
      <div className="w-1/4 min-w-[300px] border-r border-white/5 bg-black/40 backdrop-blur-md flex flex-col p-6 overflow-y-auto hidden-scrollbar relative z-10">
        <h2 className="text-2xl font-black tracking-widest text-white mb-6 uppercase">
          THE <span className="text-cyan-400">ARCHIVE</span>
        </h2>
        
        {/* Pending Reviews Warning Box */}
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 relative overflow-hidden" style={{ boxShadow: '0 0 25px rgba(239,68,68,0.1)' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse" />
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-red-500 uppercase mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]" />
            SYNAPTIC ALERT
          </h3>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {pendingCount} <span className="text-sm text-red-400/80 tracking-widest uppercase">PENDING</span>
          </p>
          <p className="text-[10px] text-red-500/60 font-mono mt-1.5 uppercase tracking-wider">Review required to prevent entropy</p>
        </div>

        {/* Constellations List */}
        <h3 className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mb-4">Constellations</h3>
        <div className="flex flex-col gap-3">
          {archiveData.map(c => {
            const isActive = selectedConstellationId === c.ID;
            return (
              <button
                key={c.ID}
                onClick={() => setSelectedConstellationId(c.ID)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 border ${
                  isActive 
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <h4 className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-cyan-400' : 'text-slate-300'}`}>
                  {c.Topic}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">
                  ID: {c.ID} <span className="text-slate-700 mx-1">//</span> SHARDS: {c.nodes?.length || 0}
                </p>
              </button>
            );
          })}
          {archiveData.length === 0 && (
            <div className="p-4 border border-dashed border-white/10 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">No constellations found in the archive.</p>
            </div>
          )}
        </div>
      </div>

      {/* 75% Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Faint grid background for the whole area */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-8 relative z-10 hidden-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-600 animate-[spin_10s_linear_infinite]" />
                <p className="text-xs font-mono tracking-widest uppercase text-slate-400/60">No verified knowledge shards in this sector</p>
              </div>
            ) : (
              nodes.map(node => (
                <div 
                  key={node.ID}
                  className="bg-[#0B0C10]/80 backdrop-blur-md rounded-2xl border border-cyan-500/30 overflow-hidden"
                  style={{ boxShadow: '0 0 40px rgba(6,182,212,0.05)' }}
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.05), transparent)' }}>
                    <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                      <span className="text-cyan-500">SHARD ID: X-00{node.ID}</span> 
                      <span className="text-cyan-500/30">//</span> 
                      <span className="text-slate-300">TOPIC: {node.Title}</span>
                    </div>
                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest font-bold">Verified</span>
                    </div>
                  </div>

                  {/* Card Body - Blueprint Style */}
                  <div className="p-8 relative min-h-[160px]">
                    {/* Blueprint faint inner grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                    
                    <p className="relative z-10 text-[13px] font-mono text-cyan-50 leading-loose whitespace-pre-wrap">
                      {node.KnowledgeShard || '// EMPTY SHARD DATA'}
                    </p>
                  </div>

                  {/* Anki Buttons */}
                  <div className="px-6 py-5 border-t border-cyan-500/10 bg-black/60 flex items-center justify-center gap-6">
                    <button 
                      onClick={() => handleReview(node.ID, 'HARD')}
                      className="px-10 py-3 rounded-xl border border-red-500/50 text-red-500 text-[10px] font-black tracking-[0.3em] uppercase hover:bg-red-500/10 transition-all duration-300"
                      style={{ textShadow: '0 0 10px rgba(239,68,68,0.6)', boxShadow: '0 0 20px rgba(239,68,68,0.15) inset' }}
                    >
                      HARD
                    </button>
                    <button 
                      onClick={() => handleReview(node.ID, 'GOOD')}
                      className="px-10 py-3 rounded-xl border border-yellow-500/50 text-yellow-500 text-[10px] font-black tracking-[0.3em] uppercase hover:bg-yellow-500/10 transition-all duration-300"
                      style={{ textShadow: '0 0 10px rgba(234,179,8,0.6)', boxShadow: '0 0 20px rgba(234,179,8,0.15) inset' }}
                    >
                      GOOD
                    </button>
                    <button 
                      onClick={() => handleReview(node.ID, 'EASY')}
                      className="px-10 py-3 rounded-xl border border-cyan-400/50 text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase hover:bg-cyan-400/10 transition-all duration-300"
                      style={{ textShadow: '0 0 10px rgba(34,211,238,0.6)', boxShadow: '0 0 20px rgba(6,182,212,0.15) inset' }}
                    >
                      EASY
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
