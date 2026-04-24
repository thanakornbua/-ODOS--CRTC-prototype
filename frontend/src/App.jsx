import { useEffect, useState } from "react";
import CanaryPanel from "./components/CanaryPanel.jsx";
import EventLog from "./components/EventLog.jsx";
import LayerStatus from "./components/LayerStatus.jsx";
import NetworkGraph from "./components/NetworkGraph.jsx";
import NodeDetail from "./components/NodeDetail.jsx";
import { useWebSocket } from "./hooks/useWebSocket.js";

const DEFAULT_ATTACKER_IP = "185.220.101.47";

const INITIAL_ATTACK_STATE = {
  cycle: null,
  currentNodeId: null,
  visitedNodes: new Set(),
  traversedEdges: new Set(),
  layers: { 1: false, 2: false, 3: false },
  canaries: [],
  flashNodeId: null,
};

function edgeKey(source, target) {
  return `${source}->${target}`;
}

function isNodeEvent(event) {
  return [
    "SCAN",
    "LOGIN_ATTEMPT",
    "LOGIN_SUCCESS",
    "FILE_ACCESS",
    "EXFILTRATE",
    "CANARY_FIRE",
    "LATERAL_MOVE",
    "LAYER_TRIGGER",
  ].includes(event.type);
}

export default function App() {
  const { events, connected, networkGraph, error } = useWebSocket();
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [attackState, setAttackState] = useState(INITIAL_ATTACK_STATE);
  const latestEvent = events[events.length - 1];

  const nodesById = networkGraph.nodes.reduce((index, node) => {
    index[node.id] = node;
    return index;
  }, {});

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    setAttackState((previous) => {
      const cycleChanged =
        previous.cycle !== null &&
        latestEvent.cycle !== null &&
        latestEvent.cycle !== previous.cycle;

      const next = {
        cycle: latestEvent.cycle ?? previous.cycle,
        currentNodeId: cycleChanged ? null : previous.currentNodeId,
        visitedNodes: cycleChanged ? new Set() : new Set(previous.visitedNodes),
        traversedEdges: cycleChanged ? new Set() : new Set(previous.traversedEdges),
        layers: cycleChanged ? { 1: false, 2: false, 3: false } : { ...previous.layers },
        canaries: previous.canaries,
        flashNodeId: previous.flashNodeId,
      };

      if (isNodeEvent(latestEvent)) {
        next.currentNodeId = latestEvent.target_node_id || latestEvent.node_id;
      }

      if (latestEvent.type === "LOGIN_SUCCESS") {
        next.visitedNodes.add(latestEvent.node_id);
      }

      if (latestEvent.type === "LATERAL_MOVE") {
        next.currentNodeId = latestEvent.target_node_id || latestEvent.node_id;
        if (latestEvent.source_node_id && latestEvent.target_node_id) {
          next.traversedEdges.add(edgeKey(latestEvent.source_node_id, latestEvent.target_node_id));
        }
      }

      if (latestEvent.layer) {
        next.layers[latestEvent.layer] = true;
      }

      if (latestEvent.type === "CANARY_FIRE") {
        next.layers[3] = true;
        next.flashNodeId = latestEvent.node_id;
        next.canaries = [
          {
            token: latestEvent.token || "MH-unknown",
            timestamp: latestEvent.timestamp,
            node_id: latestEvent.node_id,
            attacker_ip: latestEvent.attacker_ip,
          },
          ...previous.canaries,
        ].slice(0, 3);
      }

      return next;
    });

    if (isNodeEvent(latestEvent)) {
      setSelectedNodeId(latestEvent.target_node_id || latestEvent.node_id);
    }
  }, [latestEvent]);

  useEffect(() => {
    if (!attackState.flashNodeId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setAttackState((previous) => ({ ...previous, flashNodeId: null }));
    }, 650);

    return () => window.clearTimeout(timer);
  }, [attackState.flashNodeId]);

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null;
  const attackerIp = latestEvent?.attacker_ip || DEFAULT_ATTACKER_IP;

  function getNodeStatus(nodeId) {
    if (nodeId === attackState.currentNodeId) {
      return "Under Attack";
    }
    if (attackState.visitedNodes.has(nodeId)) {
      return "Compromised";
    }
    return "Clean";
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="logo-mark">MH</div>
          <div>
            <h1>MEDHIVE</h1>
            <p>Proactive Cyber Defense Simulation</p>
          </div>
        </div>

        <div className="header-metrics">
          <div className="metric-card">
            <span>Attacker IP</span>
            <strong>{attackerIp}</strong>
          </div>
          <div className={`connection-badge ${connected ? "connected" : "reconnecting"}`}>
            <span className="status-dot" />
            {connected ? "Live simulation" : "Reconnecting..."}
          </div>
        </div>
      </header>

      {error && <div className="error-strip">{error}</div>}

      <div className="dashboard-grid">
        <NetworkGraph
          graph={networkGraph}
          currentNodeId={attackState.currentNodeId}
          visitedNodes={attackState.visitedNodes}
          traversedEdges={attackState.traversedEdges}
          flashNodeId={attackState.flashNodeId}
          onSelectNode={setSelectedNodeId}
        />

        <EventLog events={events} />

        <div className="right-rail">
          <LayerStatus layers={attackState.layers} />
          <CanaryPanel canaries={attackState.canaries} nodesById={nodesById} />
          <NodeDetail
            node={selectedNode}
            status={selectedNode ? getNodeStatus(selectedNode.id) : "Clean"}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      </div>
    </main>
  );
}
