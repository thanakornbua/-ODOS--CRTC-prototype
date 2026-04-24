import { useEffect, useState } from "react";

function formatTime(timestamp) {
  if (!timestamp) {
    return "--:--:--";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export default function CanaryPanel({ canaries, nodesById }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (canaries.length === 0) {
      return;
    }

    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 500);
    return () => window.clearTimeout(timer);
  }, [canaries.length]);

  return (
    <section className={`panel canary-panel ${flash ? "canary-flash" : ""}`}>
      <div className="panel-heading">
        <span>Canary Alerts</span>
        <span className="layer-badge layer-critical">Layer 3</span>
      </div>

      {canaries.length === 0 ? (
        <div className="canary-empty">
          <span className="canary-icon" aria-hidden="true" />
          <div>
            <strong>No canary events</strong>
            <span>Honeyrecords are armed and listening.</span>
          </div>
        </div>
      ) : (
        <div className="canary-stack">
          {canaries.map((canary) => (
            <article className="canary-card" key={`${canary.token}-${canary.timestamp}`}>
              <div className="canary-card-top">
                <strong>{canary.token}</strong>
                <span>{formatTime(canary.timestamp)}</span>
              </div>
              <p>{nodesById[canary.node_id]?.label || canary.node_id}</p>
              <span>External IP: {canary.attacker_ip}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
