import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import useStore from '../store/useStore';

export default function Universe() {
  const archiveData  = useStore((s) => s.archiveData);
  const fetchArchive = useStore((s) => s.fetchArchive);
  const graphRef     = useRef(null);

  const [dimensions, setDimensions] = useState({
    width:  window.innerWidth  - 256,
    height: window.innerHeight,
  });

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  useEffect(() => {
    const onResize = () => setDimensions({
      width:  window.innerWidth  - 256,
      height: window.innerHeight,
    });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Build macro-graph dataset from archive ──────────────────────────
  const graphData = useMemo(() => {
    if (!archiveData || archiveData.length === 0) return { nodes: [], links: [] };

    const nodes = [];
    const links = [];

    // Master anchor — the operator's neural core
    nodes.push({
      id:     'CORE',
      name:   'NEBULA CORE // OPERATOR',
      val:    25,
      color:  '#fbbf24',
      isCore: true,
    });

    archiveData.forEach(constellation => {
      if (!constellation.nodes || constellation.nodes.length === 0) return;

      // Root node = ParentNodeID is null, or first node as fallback
      const rootNode =
        constellation.nodes.find(n => n.ParentNodeID == null) ||
        constellation.nodes[0];

      if (rootNode) {
        links.push({
          source:      'CORE',
          target:      `node-${rootNode.ID}`,
          isMacroLink: true,
        });
      }

      constellation.nodes.forEach(n => {
        nodes.push({
          id:              `node-${n.ID}`,
          name:            n.Title,
          val:             5,
          color:           '#06b6d4',
          constellationId: constellation.ID,
          topic:           constellation.Topic,
        });

        if (n.ParentNodeID != null) {
          links.push({
            source:      `node-${n.ParentNodeID}`,
            target:      `node-${n.ID}`,
            isMacroLink: false,
          });
        }
      });
    });

    return { nodes, links };
  }, [archiveData]);

  // ── Apply physics after graph data is set ───────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    fg.d3Force('charge').strength(-500);
    fg.d3Force('link').distance(link => link.isMacroLink ? 160 : 45);
  }, [graphData]);

  // ── Custom node painter ─────────────────────────────────────────────
  const paintNode = useCallback((node, ctx, globalScale) => {
    const radius = Math.sqrt(node.val) * 1.5;
    const color  = node.color || '#fff';

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

    if (node.isCore) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur  = 35 / globalScale;
      ctx.fillStyle   = '#fef08a';
    } else {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10 / globalScale;
      ctx.fillStyle   = '#cffafe';
    }

    ctx.fill();
    ctx.shadowBlur = 0;

    // Label for core node only (always visible)
    if (node.isCore && globalScale > 0.4) {
      ctx.font         = `bold ${11 / globalScale}px 'Courier New', monospace`;
      ctx.fillStyle    = '#fbbf24';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor  = '#fbbf24';
      ctx.shadowBlur   = 8 / globalScale;
      ctx.fillText(node.name, node.x, node.y + radius + 10 / globalScale);
      ctx.shadowBlur   = 0;
    }
  }, []);

  // ── Link color by type ──────────────────────────────────────────────
  const getLinkColor = useCallback((link) => {
    return link.isMacroLink
      ? 'rgba(167,139,250,0.2)'   // faint purple for CORE -> root links
      : 'rgba(6,182,212,0.12)';   // faint cyan for internal links
  }, []);

  const getLinkWidth = useCallback((link) => {
    return link.isMacroLink ? 1.2 : 0.6;
  }, []);

  const hasData = graphData.nodes.length > 1;

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{ background: '#050510' }}
    >
      {/* ── HUD Overlay ─────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-8 py-4 border-b border-white/[0.04]"
          style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div>
            <h1
              className="text-sm font-black tracking-[0.4em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
              style={{ filter: 'drop-shadow(0 0 12px rgba(34,211,238,0.3))' }}
            >
              MACRO-UNIVERSE // SYNAPTIC TOPOLOGY
            </h1>
            <p className="text-[9px] text-slate-600 font-mono tracking-[0.3em] mt-0.5 uppercase">
              {graphData.nodes.length - 1} nodes &nbsp;·&nbsp; {graphData.links.length} synaptic links
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 8px rgba(251,191,36,0.8)' }} />
              <span className="text-[9px] text-slate-500 tracking-widest uppercase font-mono">NEBULA CORE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.7)' }} />
              <span className="text-[9px] text-slate-500 tracking-widest uppercase font-mono">KNOWLEDGE NODE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-px bg-purple-400/40" />
              <span className="text-[9px] text-slate-500 tracking-widest uppercase font-mono">MACRO LINK</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-dashed border-red-500/20 animate-[spin_18s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border border-dashed border-red-500/15 animate-[spin_12s_linear_infinite_reverse]" />
            <div className="absolute inset-8 rounded-full border border-dashed border-red-500/10 animate-[spin_8s_linear_infinite]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black tracking-[0.35em] text-red-400/70 uppercase mb-2">
              NO NODES IN CORE
            </p>
            <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
              Forge constellations · verify shards · populate the macro-map
            </p>
          </div>
        </div>
      )}

      {/* ── Force Graph ─────────────────────────────────────────────── */}
      {hasData && (
        <div className="absolute inset-0 cursor-crosshair">
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={paintNode}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={(node) => node.isCore ? node.name : `${node.topic ? node.topic + ' // ' : ''}${node.name}`}
            nodeRelSize={1}
            enableNodeDrag={true}
            enableZoomInteraction={true}
          />
        </div>
      )}

      {/* ── Bottom-right corner metadata ────────────────────────────── */}
      <div className="absolute bottom-6 right-8 z-10 pointer-events-none text-right">
        <p className="text-[8px] text-slate-700 font-mono tracking-widest uppercase">
          NEBULA OS v4.1 // UNIVERSE SUBSYSTEM
        </p>
        <p className="text-[8px] text-slate-700 font-mono tracking-widest uppercase mt-0.5">
          {archiveData.length} CONSTELLATION{archiveData.length !== 1 ? 'S' : ''} MAPPED
        </p>
      </div>
    </div>
  );
}
