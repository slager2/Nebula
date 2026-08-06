import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import useStore from '../store/useStore';

export default function Universe() {
  const archive = useStore((state) => state.archiveData);
  const status = useStore((state) => state.archiveStatus);
  const error = useStore((state) => state.archiveError);
  const fetchArchive = useStore((state) => state.fetchArchive);
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState({ width: 900, height: 650 });
  const [view, setView] = useState('map');

  useEffect(() => {
    if (status === 'idle') fetchArchive();
  }, [fetchArchive, status]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setDimensions({ width: Math.max(320, entry.contentRect.width), height: Math.max(480, entry.contentRect.height) }));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes = [{ id: 'core', name: 'Your knowledge', isCore: true, val: 18 }];
    const links = [];
    archive.forEach((constellation) => {
      const completed = constellation.nodes || [];
      const root = completed.find((node) => node.ParentNodeID == null) || completed[0];
      if (root) links.push({ source: 'core', target: `node-${root.ID}`, macro: true });
      completed.forEach((node) => {
        nodes.push({ id: `node-${node.ID}`, nodeId: node.ID, name: node.Title, topic: constellation.Topic, constellationId: constellation.ID, val: 6 });
        if (node.ParentNodeID != null) links.push({ source: `node-${node.ParentNodeID}`, target: `node-${node.ID}` });
      });
    });
    return { nodes, links };
  }, [archive]);

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length <= 1) return;
    graphRef.current.d3Force('charge')?.strength(-380);
    graphRef.current.d3Force('link')?.distance((link) => link.macro ? 130 : 70);
  }, [graphData]);

  const paintNode = useCallback((node, ctx, scale) => {
    const radius = node.isCore ? 8 : 5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = node.isCore ? 'rgba(167,139,250,.12)' : 'rgba(125,211,252,.11)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = node.isCore ? '#c4b5fd' : '#7dd3fc';
    ctx.fill();
    if (node.isCore || scale > 1.5) {
      ctx.font = `${12 / scale}px Inter, sans-serif`;
      ctx.fillStyle = '#aab6c7';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, node.y + 15 / scale);
    }
  }, []);

  const paintPointer = useCallback((node, color, ctx, scale) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.max(9, 22 / scale), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const openNode = (node) => {
    if (!node.isCore) navigate(`/forge?constellation=${node.constellationId}&node=${node.nodeId}`);
  };

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh lg:min-h-0">
      <header className="flex flex-col gap-4 border-b border-[var(--border-soft)] bg-[#0c111a]/92 px-5 py-5 sm:flex-row sm:items-end sm:justify-between md:px-7">
        <div><p className="eyebrow">Completed knowledge</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Knowledge map</h1><p className="mt-1 text-sm text-slate-500">A connected view of lessons you have completed.</p></div>
        <div className="flex gap-2"><button className={view === 'map' ? 'button-primary' : 'button-secondary'} onClick={() => setView('map')}>Map</button><button className={view === 'list' ? 'button-primary' : 'button-secondary'} onClick={() => setView('list')}>List</button></div>
      </header>

      {status === 'error' && archive.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-xl font-bold">Could not load the map</h2><p className="mt-2 text-slate-500">{error}</p><button className="button-primary mt-5" onClick={fetchArchive}>Try again</button></div></div>
      ) : graphData.nodes.length <= 1 ? (
        <div className="star-field flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-xl font-bold">Your map is empty</h2><p className="mt-2 text-sm text-slate-500">Complete lessons in Forge to connect them here.</p><button className="button-primary mt-5" onClick={() => navigate('/forge')}>Open Forge</button></div></div>
      ) : view === 'map' ? (
        <div ref={containerRef} className="star-field min-h-[540px] flex-1 overflow-hidden">
          <ForceGraph2D ref={graphRef} width={dimensions.width} height={dimensions.height} graphData={graphData} backgroundColor="rgba(0,0,0,0)" nodeCanvasObject={paintNode} nodePointerAreaPaint={paintPointer} nodeLabel="" linkColor={(link) => link.macro ? 'rgba(167,139,250,.2)' : 'rgba(125,211,252,.14)'} linkWidth={(link) => link.macro ? 1.4 : 1} enableNodeDrag={false} cooldownTicks={80} onNodeClick={openNode} onEngineStop={() => graphRef.current?.zoomToFit(350, 70)} />
        </div>
      ) : (
        <div className="page-shell grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {archive.map((constellation) => (
            <section key={constellation.ID} className="surface p-5">
              <p className="eyebrow">{constellation.nodes?.length || 0} lessons</p>
              <h2 className="mt-2 text-xl font-bold">{constellation.Topic}</h2>
              <div className="mt-4 space-y-1">{constellation.nodes?.map((node) => <button key={node.ID} className="button-ghost min-h-11 w-full justify-start px-3 text-left" onClick={() => navigate(`/forge?constellation=${constellation.ID}&node=${node.ID}`)}>{node.Title}</button>)}</div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
