import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import useStore from '../store/useStore';

export default function UniverseMap() {
  const archiveData = useStore((s) => s.archiveData);
  const fetchArchive = useStore((s) => s.fetchArchive);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const graphRef = useRef(null);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Transform Archive Data into Macro-Map Graph Data
  const graphData = useMemo(() => {
    if (!archiveData || archiveData.length === 0) return { nodes: [], links: [] };

    const nodes = [];
    const links = [];

    // The Central Anchor Node
    nodes.push({
      id: 'CORE',
      name: 'NEBULA CORE // YOU',
      val: 30,
      color: '#fbbf24', // Gold/Yellow
      isCore: true
    });

    archiveData.forEach(constellation => {
      if (!constellation.nodes || constellation.nodes.length === 0) return;

      // Identify the root of this constellation. 
      // If passing from backend hasn't maintained hierarchy, we'll assume the first node is root, 
      // or specifically look for ParentNodeID == null.
      let rootNode = constellation.nodes.find(n => n.ParentNodeID == null);
      if (!rootNode && constellation.nodes.length > 0) {
        rootNode = constellation.nodes[0];
      }

      // Link Core to the root of the constellation
      if (rootNode) {
        links.push({
          source: 'CORE',
          target: `node-${rootNode.ID}`,
          isMacroLink: true
        });
      }

      // Add all nodes for this constellation
      constellation.nodes.forEach(n => {
        nodes.push({
          id: `node-${n.ID}`,
          name: n.Title,
          val: 5,
          color: '#06b6d4', // Cyan
        });

        // Add internal links for the constellation
        if (n.ParentNodeID != null) {
          links.push({
            source: `node-${n.ParentNodeID}`,
            target: `node-${n.ID}`,
          });
        }
      });
    });

    return { nodes, links };
  }, [archiveData]);

  // Apply custom physics to space things out beautifully
  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-400); // Stronger repulsion for spread
      graphRef.current.d3Force('link').distance(link => link.isMacroLink ? 150 : 50); // Longer links to core
    }
  }, [graphData]);

  // Custom node drawing to give it that cyberpunk glow aesthetic
  const paintNode = useCallback((node, ctx, globalScale) => {
    const radius = Math.sqrt(node.val) * 1.5; // Scale radius based on 'val'
    const color = node.color || '#fff';

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    
    // Core node gets an intense glow effect
    if (node.isCore) {
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 40 * globalScale;
    } else {
      ctx.fillStyle = '#cffafe';
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * globalScale;
    }
    
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
  }, []);

  const hasData = graphData.nodes.length > 1; // More than just the CORE

  return (
    <div className="h-full w-full bg-[#050510] relative overflow-hidden flex items-center justify-center">
      
      {/* HUD Overlay */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase">
          THE UNIVERSE // MACRO-MAP
        </h1>
        <p className="text-xs text-slate-500 font-mono tracking-widest mt-1 uppercase">
          Mapping Neural Constellations
        </p>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center text-slate-500 z-10">
          <div className="w-24 h-24 mb-6 rounded-full border border-dashed border-red-500/30 flex items-center justify-center animate-[spin_15s_linear_infinite]">
            <div className="w-16 h-16 rounded-full border border-dashed border-red-500/20 animate-[spin_10s_linear_infinite_reverse]" />
          </div>
          <h2 className="text-xl font-bold tracking-[0.3em] text-red-400/80 mb-2">NO DATA IN CORE</h2>
          <p className="text-xs font-mono text-slate-600">Forge constellations and verify shards to populate the macro-map.</p>
        </div>
      ) : (
        <div className="absolute inset-0 cursor-crosshair">
          <ForceGraph2D
            ref={graphRef}
            width={windowSize.width - 256} // Adjust for sidebar width (approx 256px = 64rem)
            height={windowSize.height}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            linkColor={() => 'rgba(6, 182, 212, 0.15)'}
            linkWidth={link => link.isMacroLink ? 1.5 : 0.8}
            backgroundColor="#050510"
            nodeLabel="name"
          />
        </div>
      )}
    </div>
  );
}
