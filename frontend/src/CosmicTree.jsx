import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import useStore from './store/useStore';
import { apiRequest } from './api';

function drawStar(ctx, x, y, outerRadius, innerRadius) {
  let angle = -Math.PI / 2;
  const step = Math.PI / 5;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    angle += step;
  }
  ctx.closePath();
  ctx.fill();
}

const nodePalette = {
  completed: { fill: '#86efac', glow: 'rgba(74, 222, 128, 0.2)', label: 'Completed' },
  available: { fill: '#7dd3fc', glow: 'rgba(56, 189, 248, 0.24)', label: 'Available' },
  blocked: { fill: '#64748b', glow: 'rgba(100, 116, 139, 0.12)', label: 'Blocked' },
};

export default function CosmicTree({ constellationId, initialNodeId, onNodeClick }) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const graphData = useStore((state) => state.graphData);
  const setGraphData = useStore((state) => state.setGraphData);
  const [dimensions, setDimensions] = useState({ width: 800, height: 640 });
  const [loadedId, setLoadedId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(460, Math.floor(entry.contentRect.height)),
      });
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!constellationId) return undefined;
    const controller = new AbortController();
    apiRequest(`/constellations/${constellationId}`, { signal: controller.signal })
      .then((data) => {
        setGraphData({ nodes: data.nodes || [], links: data.links || [] });
        setLoadedId(String(constellationId));
        setFailedId(null);
        const initialNode = data.nodes?.find((node) => String(node.id) === String(initialNodeId));
        if (initialNode) onNodeClick?.(initialNode);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setFailedId(String(constellationId));
      });
    return () => controller.abort();
  }, [constellationId, initialNodeId, onNodeClick, setGraphData]);

  useEffect(() => {
    if (!graphRef.current || loadedId !== String(constellationId)) return;
    const charge = graphRef.current.d3Force('charge');
    if (charge) charge.strength(-420);
    const link = graphRef.current.d3Force('link');
    if (link) link.distance(90);
  }, [constellationId, loadedId, graphData]);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const palette = nodePalette[node.status] || nodePalette.blocked;
    const hovered = hoveredNode?.id === node.id;
    const size = hovered ? 8 : 6;

    ctx.beginPath();
    ctx.arc(node.x, node.y, size * 2.1, 0, Math.PI * 2);
    ctx.fillStyle = palette.glow;
    ctx.fill();

    if (node.status === 'available') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 1.55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.46)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }

    ctx.fillStyle = palette.fill;
    drawStar(ctx, node.x, node.y, size, size * 0.45);

    if (globalScale > 1.25 || hovered) {
      ctx.font = `${hovered ? 600 : 500} ${12 / globalScale}px Inter, sans-serif`;
      ctx.fillStyle = hovered ? '#f8fafc' : '#aab6c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(node.name, node.x, node.y + (14 / globalScale));
    }
  }, [hoveredNode]);

  const paintPointerArea = useCallback((node, color, ctx, globalScale) => {
    const radius = Math.max(10, 22 / globalScale);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const selectNode = useCallback((node) => {
    onNodeClick?.(node);
    graphRef.current?.centerAt(node.x, node.y, 350);
    graphRef.current?.zoom(2.2, 350);
  }, [onNodeClick]);

  const isLoading = loadedId !== String(constellationId) && failedId !== String(constellationId);
  const hasFailed = failedId === String(constellationId);

  return (
    <div ref={containerRef} className="star-field relative h-full min-h-[520px] w-full overflow-hidden">
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button className="button-secondary min-h-10 px-3" onClick={() => setShowList((value) => !value)} aria-expanded={showList}>
          {showList ? 'Hide lesson list' : 'Lesson list'}
        </button>
        <button className="button-ghost min-h-10 px-3" onClick={() => graphRef.current?.zoomToFit(350, 64)}>Fit map</button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090d15]">
          <div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-sky-300/20 border-t-sky-300" /><p className="mt-3 text-sm text-slate-400">Loading learning map…</p></div>
        </div>
      )}

      {hasFailed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#090d15] p-6 text-center">
          <div><p className="text-lg font-semibold">Could not load this plan</p><p className="mt-2 text-sm text-slate-500">Choose another plan or refresh the page.</p></div>
        </div>
      )}

      {!isLoading && !hasFailed && graphData?.nodes?.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
          <div><p className="text-lg font-semibold">This plan has no lessons</p><p className="mt-2 text-sm text-slate-500">Create a new plan to continue.</p></div>
        </div>
      )}

      {!isLoading && !hasFailed && graphData?.nodes?.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          nodeLabel=""
          nodeRelSize={5}
          linkColor={(link) => link.target?.unlocked ? 'rgba(74, 222, 128, 0.25)' : 'rgba(125, 211, 252, 0.16)'}
          linkWidth={1.2}
          warmupTicks={35}
          cooldownTicks={70}
          enableNodeDrag={false}
          minZoom={0.55}
          maxZoom={4}
          onNodeHover={setHoveredNode}
          onNodeClick={selectNode}
          onEngineStop={() => graphRef.current?.zoomToFit(350, 72)}
        />
      )}

      {showList && graphData?.nodes?.length > 0 && (
        <div className="absolute inset-x-4 bottom-4 z-30 max-h-[52%] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[#0c111a]/95 p-3 shadow-2xl backdrop-blur md:inset-x-auto md:left-4 md:w-80">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold">Lessons</p>
            <span className="text-xs text-slate-500">{graphData.nodes.length}</span>
          </div>
          <div className="space-y-1">
            {graphData.nodes.map((node) => {
              const palette = nodePalette[node.status] || nodePalette.blocked;
              return (
                <button key={node.id} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-white/[0.045]" onClick={() => selectNode(node)}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette.fill }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{node.name}</span>
                  <span className="text-xs text-slate-600">{palette.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden max-w-xs rounded-xl border border-[var(--border)] bg-[#0c111a]/94 p-3 shadow-xl md:block">
          <p className="font-semibold text-slate-100">{hoveredNode.name}</p>
          <p className="mt-1 text-xs text-slate-500">{nodePalette[hoveredNode.status]?.label || 'Blocked'} · Click to open</p>
        </div>
      )}
    </div>
  );
}
