import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

const COLORS = {
  background: "#0a0e1a",
  border: "#1e3a5f",
  real: "#1d6fa4",
  honeypot: "#dc2626",
  compromised: "#d97706",
  active: "#ffffff",
  text: "#e2e8f0",
  red: "#dc2626",
};

function nodeId(value) {
  return typeof value === "object" ? value.id : value;
}

function edgeKey(source, target) {
  return `${nodeId(source)}->${nodeId(target)}`;
}

function isTraversed(link, traversedEdges) {
  const forward = edgeKey(link.source, link.target);
  const reverse = edgeKey(link.target, link.source);
  return traversedEdges.has(forward) || traversedEdges.has(reverse);
}

function nodeColor(node, currentNodeId, visitedNodes, flashNodeId) {
  if (node.id === flashNodeId) {
    return COLORS.red;
  }
  if (node.id === currentNodeId) {
    return COLORS.active;
  }
  if (visitedNodes.has(node.id)) {
    return COLORS.compromised;
  }
  if (node.type === "honeypot") {
    return COLORS.honeypot;
  }
  return COLORS.real;
}

export default function NetworkGraph({
  graph,
  currentNodeId,
  visitedNodes,
  traversedEdges,
  flashNodeId,
  onSelectNode,
}) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const graphData = {
    nodes: graph.nodes.map((node) => ({ ...node })),
    links: graph.links.map((link) => ({ ...link })),
  };

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(320, entry.contentRect.height),
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      graphRef.current?.refresh();
    }, 220);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      window.setTimeout(() => graphRef.current?.zoomToFit(500, 42), 300);
    }
  }, [graphData.nodes.length, size.width, size.height]);

  return (
    <section className="panel graph-panel">
      <div className="panel-heading">
        <span>Honeynet Topology</span>
        <span className="panel-count">{graphData.nodes.length} nodes</span>
      </div>
      <div className="graph-canvas-wrap" ref={containerRef}>
        {graphData.nodes.length === 0 ? (
          <div className="empty-state">Loading honeynet graph...</div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={size.width}
            height={size.height}
            backgroundColor={COLORS.background}
            cooldownTicks={80}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkColor={(link) => (isTraversed(link, traversedEdges) ? COLORS.compromised : COLORS.border)}
            linkWidth={(link) => (isTraversed(link, traversedEdges) ? 2.5 : 1.5)}
            linkDirectionalParticles={(link) => (isTraversed(link, traversedEdges) ? 2 : 0)}
            linkDirectionalParticleColor={() => COLORS.compromised}
            linkDirectionalParticleWidth={2}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const active = node.id === currentNodeId;
              const color = nodeColor(node, currentNodeId, visitedNodes, flashNodeId);
              const radius = active ? 10 : 8;
              const pulse = active ? 1 + Math.sin(Date.now() / 180) * 0.12 : 1;

              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius * pulse, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.shadowColor = active || node.id === flashNodeId ? color : "transparent";
              ctx.shadowBlur = active || node.id === flashNodeId ? 20 : 0;
              ctx.fill();

              if (node.type === "honeypot") {
                ctx.strokeStyle = COLORS.red;
                ctx.lineWidth = 2;
                ctx.stroke();
              }

              if (active) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y - 22);
                ctx.lineTo(node.x - 6, node.y - 10);
                ctx.lineTo(node.x + 6, node.y - 10);
                ctx.closePath();
                ctx.fillStyle = COLORS.red;
                ctx.fill();
              }

              const fontSize = Math.max(8, 11 / globalScale);
              ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = COLORS.text;
              ctx.shadowBlur = 0;
              ctx.fillText(node.label, node.x, node.y + radius + 5);
              ctx.restore();
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, 16, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeClick={(node) => onSelectNode(node.id)}
          />
        )}
      </div>
    </section>
  );
}
