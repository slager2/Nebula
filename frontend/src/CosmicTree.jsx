import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const dummyData = {
  nodes: [
    { id: '1', name: 'Cosmic Awareness', desc: 'The foundation of the universe.', unlocked: true },
    { id: '2', name: 'Astral Projection', desc: 'Leave your physical form behind.', unlocked: true },
    { id: '3', name: 'Quantum Tunneling', desc: 'Move through solid matter.', unlocked: false },
    { id: '4', name: 'Void Singularity', desc: 'Generate a miniature black hole. Deals massive cosmic damage.', unlocked: false },
    { id: '5', name: 'Stellar Burst', desc: 'Release energy of a dying star.', unlocked: false },
    { id: '6', name: 'Nebula Weave', desc: 'Control cosmic dust.', unlocked: true },
    { id: '7', name: 'Supernova', desc: 'Ultimate explosive power.', unlocked: false },
  ],
  links: [
    { source: '1', target: '2' },
    { source: '1', target: '3' },
    { source: '2', target: '4' },
    { source: '3', target: '5' },
    { source: '1', target: '6' },
    { source: '6', target: '7' },
  ]
};

const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
};

export default function CosmicTree({ constellationId, onNodeClick }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [graphData, setGraphData] = useState(dummyData);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    setTimeout(updateDimensions, 100);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Fetch logic with fallback to dummy data
  useEffect(() => {
    if (!constellationId) return;
    
    fetch(`http://localhost:3000/api/v1/constellations/${constellationId}`)
      .then((res) => {
         if (!res.ok) throw new Error("API not ready");
         return res.json();
      })
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          setGraphData({ nodes: data.nodes, links: data.links || [] });
        }
      })
      .catch(err => {
        console.warn("Backend unavailable or tree empty. Rendering dummy data.", err);
        setGraphData(dummyData);
      });
  }, [constellationId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-[#0B0C10]" 
      onMouseMove={handleMouseMove}
      style={{
        backgroundImage: 'radial-gradient(circle at center, #1b0f3a 0%, #0B0C10 70%)' // Space vibe
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)" // Transparent to show space vibe bg
        nodeLabel="" // Disable default tooltip
        
        // Link Styling (Glowing neural pathways)
        linkColor={() => 'rgba(0, 255, 255, 0.4)'}
        linkWidth={1.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        
        // Custom Glowing 4-Point Star Nodes
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isHovered = hoveredNode && hoveredNode.id === node.id;
          
          // Outer Glow
          ctx.shadowBlur = isHovered ? 25 : 15;
          ctx.shadowColor = node.unlocked ? '#00ffff' : '#8a2be2'; 
          
          // Inner Fill Color
          ctx.fillStyle = node.unlocked ? '#ffffff' : '#4b0082';

          // Draw custom 4-point star
          const size = isHovered ? 8 : 5;
          drawStar(ctx, node.x, node.y, 4, size, size / 2.5);

          // Reset shadow to avoid trailing artifacts
          ctx.shadowBlur = 0;
        }}

        onNodeHover={(node) => {
          containerRef.current.style.cursor = node ? 'pointer' : 'default';
          setHoveredNode(node);
        }}
        onNodeClick={(node) => {
          if (onNodeClick) onNodeClick(node);
          if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(2.5, 1000);
          }
        }}
        
        minZoom={0.5}
        maxZoom={4}
      />

      {/* Glassmorphism Hover Tooltip Overlay */}
      {hoveredNode && (
        <div 
          className="absolute z-50 pointer-events-none transition-opacity duration-200"
          style={{ 
            left: mousePos.x + 20, 
            top: mousePos.y + 20,
          }}
        >
          <div className="bg-[#0B0C10]/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 w-72 shadow-[0_0_20px_rgba(0,255,255,0.15)] text-left flex flex-col gap-2 relative overflow-hidden">
            {/* Inner background glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
            
            <h3 className="font-bold text-cyan-400 text-[13px] uppercase tracking-wider truncate border-b border-cyan-500/20 pb-2 mb-1">
              {hoveredNode.name}
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-1">
              {hoveredNode.desc || 'Harness the cosmic energy.'}
            </p>
            
            <div className="text-[11px] text-slate-400 font-mono mt-1 flex flex-col gap-1">
              <span>Status: <span className={hoveredNode.unlocked ? "text-cyan-400" : "text-purple-400 font-bold"}>{hoveredNode.unlocked ? "UNLOCKED" : "LOCKED"}</span></span>
              {!hoveredNode.unlocked && <span>Cost: <span className="text-cyan-400">1 SP</span></span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
