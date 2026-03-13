import { useState } from 'react';
import useStore from '../store/useStore';
import CosmicTree from '../CosmicTree';

export default function Forge() {
  const user = useStore((s) => s.user);
  const [constellationId, setConstellationId] = useState(1);
  const [topicInput, setTopicInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const fetchProfile = useStore((s) => s.fetchProfile);

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

  const unlockNode = async () => {
    if (!selectedNode || !user) return;
    try {
      const res = await fetch(`http://localhost:3000/api/v1/nodes/${selectedNode.id}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchProfile();
        setConstellationId(null);
        setTimeout(() => setConstellationId(1), 50);
        setSelectedNode(null);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex">
      {/* Graph Area */}
      <div className="flex-1 relative">
        {constellationId ? (
          <CosmicTree constellationId={constellationId} onNodeClick={(node) => setSelectedNode(node)} />
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
              onClick={unlockNode}
              disabled={!user || user.SkillPoints < 1}
              className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white border border-blue-500/50 rounded-lg py-2 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Allocate Point (1 SP)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
