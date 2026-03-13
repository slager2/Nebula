import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function CosmicTree({ constellationId, onNodeClick }) {
  const fgRef = useRef();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  // Fetch logic
  useEffect(() => {
    if (!constellationId) return;
    
    setLoading(true);
    fetch(`http://localhost:3000/api/v1/constellations/${constellationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.nodes) return;
        
        const nodes = data.nodes.map(n => ({
          id: n.ID,
          name: n.Title,
          desc: n.Description,
          unlocked: n.IsUnlocked,
          val: 1
        }));

        const links = data.nodes
          .filter(n => n.ParentNodeID)
          .map(n => ({
            source: n.ParentNodeID,
            target: n.ID
          }));

        setGraphData({ nodes, links });
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load constellation map", err);
        setLoading(false);
      });
  }, [constellationId]);

  // Center Graph on load
  useEffect(() => {
    if (!loading && fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [loading, graphData]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center relative">
        <div className="absolute w-32 h-32 border-4 border-blue-500/30 rounded-full animate-ping"></div>
        <div className="absolute w-24 h-24 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
        <div className="text-blue-200 z-10 font-bold tracking-widest uppercase">Plotting Course...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative font-sans">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        
        linkColor={() => 'rgba(100, 150, 255, 0.3)'}
        linkWidth={(link) => (link.source.unlocked && link.target.unlocked) ? 2.5 : 1}
        linkDirectionalParticles={(link) => (link.source.unlocked && link.target.unlocked) ? 2 : 0}
        linkDirectionalParticleSpeed={0.005}
        
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 14 / globalScale;
          
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          
          if (node.unlocked) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 20;
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = node.unlocked ? '#e0e7ff' : '#475569';
          ctx.fillText(label, node.x, node.y + 10);
        }}

        onNodeClick={(node) => {
          if (onNodeClick) onNodeClick(node);
        }}
        
        minZoom={0.5}
        maxZoom={4}
      />
    </div>
  );
}
