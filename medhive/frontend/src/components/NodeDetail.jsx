export default function NodeDetail({ node, status, onClose }) {
  if (!node) {
    return (
      <section className="panel node-detail">
        <div className="panel-heading">
          <span>Node Detail</span>
        </div>
        <div className="empty-state">Select a device or wait for the attacker to move.</div>
      </section>
    );
  }

  return (
    <aside className="panel node-detail">
      <div className="panel-heading">
        <span>Node Detail</span>
        <button className="ghost-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="node-title-row">
        <div>
          <h2>{node.label}</h2>
          <span className={`type-pill type-${node.type}`}>{node.type}</span>
        </div>
        <span className={`status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`}>
          {status}
        </span>
      </div>

      <dl className="node-meta">
        <div>
          <dt>OS</dt>
          <dd>{node.os}</dd>
        </div>
        <div>
          <dt>Open ports</dt>
          <dd>{node.ports.join(", ")}</dd>
        </div>
      </dl>

      {node.has_honeyrecords && (
        <div className="honeyrecord-badge">Contains Honeyrecords</div>
      )}

      <div className="log-block">
        <div className="log-heading">Device Logs</div>
        {node.logs.map((log) => (
          <code key={log}>{log}</code>
        ))}
      </div>
    </aside>
  );
}
