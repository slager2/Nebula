import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import useStore from './store/useStore';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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
  const graphData = useStore((s) => s.graphData);
  const setGraphData = useStore((s) => s.setGraphData);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [fetchError, setFetchError] = useState(false);

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

  // Fetch constellation data — no dummy data fallback
  useEffect(() => {
    if (!constellationId) return;
    setFetchError(false);
    
    fetch(`${API}/constellations/${constellationId}`)
      .then((res) => {
         if (!res.ok) throw new Error("API not ready");
         return res.json();
      })
      .then((data) => {
        if (data.nodes && data.nodes.length > 0) {
          setGraphData({ nodes: data.nodes, links: data.links || [] });
        } else {
          setFetchError(true);
          setGraphData(null);
        }
      })
      .catch(err => {
        console.warn("Backend unavailable or tree empty.", err);
        setFetchError(true);
        setGraphData(null);
      });
  }, [constellationId, setGraphData]);

  // Настройка физики графа: расталкиваем ноды и удлиняем связи
  useEffect(() => {
    try {
      if (fgRef.current) {
        const charge = fgRef.current.d3Force('charge');
        if (charge) charge.strength(-1200);
        const link = fgRef.current.d3Force('link');
        if (link) link.distance(120);
      }
    } catch (e) {
      console.warn('Could not configure graph physics:', e);
    }
  }, [graphData]);

  // No data — show error state instead of dummy data
  if (fetchError || !graphData) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden bg-[#0B0C10] flex items-center justify-center"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #1b0f3a 0%, #0B0C10 70%)'
        }}
      >
        <div className="text-center space-y-3">
          <div className="text-red-500 font-mono text-sm animate-pulse tracking-widest">
            UPLINK SEVERED // NO CONSTELLATION DATA
          </div>
          <div className="text-slate-600 font-mono text-xs">
            Generate a skill tree from the side panel to initialize the Forge
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-[#0B0C10]" 
      onMouseMove={handleMouseMove}
      style={{
        backgroundImage: 'radial-gradient(circle at center, #1b0f3a 0%, #0B0C10 70%)'
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel=""
        
        linkColor={() => 'rgba(0, 255, 255, 0.4)'}
        linkWidth={() => 1.5}
        linkDirectionalParticles={0}
        linkDirectionalParticleSpeed={0.005}
        
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isHovered = hoveredNode && hoveredNode.id === node.id;
          const size = isHovered ? 8 : 5;
          
          // Цвета: разблокировано = белая звезда, заблокировано = фиолетовая
          const starColor = node.unlocked ? '#ffffff' : '#6b21a8';
          // Свечение: циановое для открытых, тускло-фиолетовое для закрытых
          const glowColor = node.unlocked ? 'rgba(0, 255, 255, 0.15)' : 'rgba(126, 34, 206, 0.15)';

          // 1. Оптимизированное свечение (маленький прозрачный круг вместо тяжелого shadowBlur)
          ctx.beginPath();
          ctx.arc(node.x, node.y, size * 1.8, 0, 2 * Math.PI, false);
          ctx.fillStyle = glowColor;
          ctx.fill();

          // 2. Дополнительное свечение при наведении мышки (сделано тоньше и прозрачнее)
          if (isHovered) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fill();
          }

          // 3. Отрисовка самой звезды
          ctx.fillStyle = starColor;
          drawStar(ctx, node.x, node.y, 4, size, size / 2.5);
        }}

        onNodeHover={(node) => {
          if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'pointer' : 'default';
          }
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

      {/* Glassmorphism Hover Tooltip */}
      {hoveredNode && (
        <div 
          className="absolute z-50 pointer-events-none transition-opacity duration-200"
          style={{ 
            left: mousePos.x + 20, 
            top: mousePos.y + 20,
          }}
        >
          <div className="bg-[#0B0C10]/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 w-72 shadow-[0_0_20px_rgba(0,255,255,0.15)] text-left flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
            
            <h3 className="font-bold text-cyan-400 text-[13px] uppercase tracking-wider truncate border-b border-cyan-500/20 pb-2 mb-1">
              {hoveredNode.name}
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-1">
              {hoveredNode.desc || 'Harness the cosmic energy.'}
            </p>
            
            <div className="text-[11px] text-slate-400 font-mono mt-1 flex flex-col gap-1">
              <span>Status: <span className={hoveredNode.unlocked ? "text-cyan-400" : "text-purple-400 font-bold"}>{hoveredNode.unlocked ? "UNLOCKED" : "LOCKED"}</span></span>
              {!hoveredNode.unlocked && <span>Cost: <span className="text-cyan-400">{hoveredNode.cost || 1} SP</span></span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
