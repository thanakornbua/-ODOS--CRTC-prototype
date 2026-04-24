const LAYERS = [
  {
    id: 1,
    title: "Layer 1",
    label: "IoMT Gateway",
    activeText: "ACTIVE",
  },
  {
    id: 2,
    title: "Layer 2",
    label: "Honeynet",
    activeText: "TRAP ENGAGED",
  },
  {
    id: 3,
    title: "Layer 3",
    label: "Honeyrecords",
    activeText: "CANARY FIRED",
  },
];

export default function LayerStatus({ layers }) {
  return (
    <section className="panel layer-panel">
      <div className="panel-heading">
        <span>MEDHIVE Layers</span>
        <span className="panel-count">3-layer defense</span>
      </div>

      <div className="layer-list">
        {LAYERS.map((layer) => {
          const isActive = Boolean(layers[layer.id]);

          return (
            <div className={`layer-row ${isActive ? "layer-row-active" : ""}`} key={layer.id}>
              <div>
                <strong>{layer.title}</strong>
                <span>{layer.label}</span>
              </div>
              <span className={`layer-badge ${isActive ? `layer-${layer.id}` : "layer-monitoring"}`}>
                {isActive ? layer.activeText : "MONITORING"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
