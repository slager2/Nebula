import { useState, useEffect } from 'react'
import CosmicTree from './CosmicTree'

function App() {
  const [user, setUser] = useState(null);
  const [constellationId, setConstellationId] = useState(null);
  const [topicInput, setTopicInput] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch initial user state
  useEffect(() => {
    fetchUser();
    // For MVP, if we had a list of constellations we'd fetch them here.
    // Hardcoding to load ID 1 if it exists, for quick dev reloading
    setConstellationId(1);
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/v1/user");
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.error("No backend detected", e);
    }
  };

  const generateTree = async (e) => {
    e.preventDefault();
    if (!topicInput) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("http://localhost:3000/api/v1/constellations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicInput })
      });
      const data = await res.json();
      setConstellationId(data.constellation.ID);
    } catch (error) {
      alert("Failed to generate constellation. Is Gemini API key valid?");
    } finally {
      setIsGenerating(false);
      setTopicInput("");
    }
  };

  const completeDaily = async () => {
    // Hardcoded Task ID 1 created in Go `handlers.GetUser`
    try {
      const res = await fetch("http://localhost:3000/api/v1/dailies/1/complete", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unlockSelectedNode = async () => {
    if (!selectedNode || !user) return;
    
    try {
      const res = await fetch(`http://localhost:3000/api/v1/nodes/${selectedNode.id}/unlock`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        // Optimistic refresh
        fetchUser();
        setConstellationId(null);
        setTimeout(() => setConstellationId(1), 50); // hacky reload for MVP forceGraph
        setSelectedNode(null);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="w-full h-screen bg-[#030014] overflow-hidden flex font-sans text-white relative">
      
      {/* Background radial gradient representing deep space */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-black to-black pointer-events-none z-0" />

      {/* Main Graph Area */}
      <main className="flex-1 relative z-10 border-r border-white/10">
        {constellationId ? (
          <CosmicTree 
            constellationId={constellationId} 
            onNodeClick={(node) => setSelectedNode(node)} 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <h1 className="text-4xl font-bold tracking-tighter text-white/20 mb-4">NEBULA SYSTEM</h1>
            <p>Generate a constellation to begin your journey.</p>
          </div>
        )}
      </main>

      {/* Right Sidebar - HUD */}
      <aside className="w-80 bg-black/60 backdrop-blur-md z-20 flex flex-col p-6 shadow-2xl relative">
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>
        
        {/* User Stats Card */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-6 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <h2 className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">Architect Profile</h2>
          
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-3xl font-bold text-white">Lvl {user?.Level || 1}</span>
            <span className="text-blue-400 font-mono text-sm">{user?.EXP || 0} / {user?.Level ? user.Level * 100 : 100} XP</span>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
            <div 
              className="bg-blue-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" 
              style={{ width: `${user ? (user.EXP / (user.Level * 100)) * 100 : 0}%` }}></div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Skill Points</span>
            <span className="text-xl font-bold text-yellow-500 shadow-yellow-500/50 drop-shadow-md">
              {user?.SkillPoints || 0}
            </span>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="mb-6">
          <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 px-1">Daily Operations</h3>
          <button 
            onClick={completeDaily}
            className="w-full text-left bg-gradient-to-r from-slate-900 to-slate-800 hover:from-blue-900/40 hover:to-indigo-900/40 transition-all border border-slate-700/50 hover:border-blue-500/50 rounded-lg p-4 group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-200 group-hover:text-white transition-colors">Commit Code Tracker</span>
              <span className="text-xs font-mono text-blue-400">+100 XP</span>
            </div>
            <p className="text-xs text-slate-500">Click to execute routine.</p>
          </button>
        </div>

        {/* AI Generator */}
        <div className="mb-auto">
           <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-3 px-1">Forge Constellation</h3>
           <form onSubmit={generateTree} className="relative">
             <input 
                type="text" 
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="e.g. Distributed Systems" 
                className="w-full bg-slate-900 text-sm border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
             />
             <button 
                type="submit" 
                disabled={isGenerating}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white rounded px-3 text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
              >
               {isGenerating ? '...' : 'Init'}
             </button>
           </form>
        </div>

        {/* Node Inspector Modal/Drawer */}
        <div className={`mt-6 p-5 border border-white/10 rounded-xl bg-slate-900/80 backdrop-blur transition-all duration-300 ${selectedNode ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white">{selectedNode?.name}</h4>
            {selectedNode?.unlocked ? (
               <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">Unlocked</span>
            ) : (
               <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 bg-slate-800 rounded-full border border-slate-600">Locked</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">{selectedNode?.desc}</p>
          
          {!selectedNode?.unlocked && (
            <button 
              onClick={unlockSelectedNode}
              disabled={!user || user.SkillPoints < 1}
              className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white border border-blue-500/50 rounded-lg py-2 text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Allocate Point (1 SP)
            </button>
          )}
        </div>
      </aside>

    </div>
  )
}

export default App
