import { useState } from 'react';
import useStore from '../store/useStore';
import CosmicTree from '../CosmicTree';

export default function Forge() {
  const user = useStore((s) => s.user);
  const unlockNode = useStore((s) => s.unlockNode);
  const fetchProfile = useStore((s) => s.fetchProfile);
  const [constellationId, setConstellationId] = useState(1);
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [unlocking, setUnlocking] = useState(false);

  const generateTree = async (e) => {
    e.preventDefault();
    if (!topicInput) return;
    setIsGenerating(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/constellations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput }),
      });
      const data = await res.json();
      setConstellationId(null);
      setTimeout(() => setConstellationId(data.constellation.ID), 50);
    } catch {
      alert('Failed to generate constellation.');
    } finally {
      setIsGenerating(false);
      setTopicInput('');
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);

    if (!node.unlocked) {
      const cost = node.cost || 1;
      const confirmed = window.confirm(`Unlock "${node.name}" for ${cost} SP?`);
      if (confirmed) {
        handleUnlock(node, cost);
      }
    }
  };

  const handleUnlock = async (node, cost) => {
    if (!user || user.SkillPoints < cost) {
      alert('Not enough Skill Points.');
      return;
    }
    setUnlocking(true);
    const result = await unlockNode(node.id);
    setUnlocking(false);
    if (result.ok) {
      setSelectedNode(null);
    } else {
      alert(result.data?.error || 'Failed to unlock node.');
    }
  };

  const handlePanelUnlock = async () => {
    if (!selectedNode || selectedNode.unlocked) return;
    const cost = selectedNode.cost || 1;
    const confirmed = window.confirm(`Unlock "${selectedNode.name}" for ${cost} SP?`);
    if (confirmed) {
      await handleUnlock(selectedNode, cost);
    }
  };

  return (
    <div className="h-full flex">
      {/* Graph Area */}
      <div className="flex-1 relative">
        {constellationId ? (
          <CosmicTree constellationId={constellationId} onNodeClick={handleNodeClick} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <h1 className="text-4xl font-bold tracking-tighter text-white/20 mb-4">FORGE SYSTEM</h1>
            <p>Generate a constellation to begin.</p>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-72 bg-black/40 backdrop-blur-md border-l border-white/5 flex flex-col p-5 shrink-0">
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

        {/* SP Display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 mb-4">
          <span className="text-xs text-slate-400">Skill Points</span>
          <span className="text-lg font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(250,204,21,0.4)' }}>
            {user?.SkillPoints || 0} SP
          </span>
        </div>

        {/* Node Inspector */}
        <div
          className={`p-4 border border-white/10 rounded-xl bg-slate-900/60 backdrop-blur transition-all duration-300 ${
            selectedNode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white text-sm">{selectedNode?.name}</h4>
            {selectedNode?.unlocked ? (
              <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                Unlocked
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 bg-slate-800 rounded-full border border-slate-600">
                Locked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">{selectedNode?.desc}</p>
          {!selectedNode?.unlocked && (
            <button
              onClick={handlePanelUnlock}
              disabled={!user || user.SkillPoints < (selectedNode?.cost || 1) || unlocking}
              className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg py-2 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 12px rgba(6,182,212,0.15)' }}
            >
              {unlocking ? 'UNLOCKING...' : `Unlock (${selectedNode?.cost || 1} SP)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
