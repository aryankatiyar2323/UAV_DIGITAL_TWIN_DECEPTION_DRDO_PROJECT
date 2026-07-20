function scale(value, min, max, height) {
  if (max === min) return height / 2;
  return height - ((value - min) / (max - min)) * height;
}

function buildPath(values, width, height) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
      const y = scale(value, min, max, height);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TelemetryChart({ history }) {
  const width = 760;
  const height = 180;
  const riskValues = history.map((frame) => frame.riskScore || 0);
  const positionValues = history.map((frame) => frame.deltas?.positionM || 0);

  return (
    <section className="chart-panel">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Telemetry history</p>
          <h2>Risk and position delta</h2>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Risk and position delta chart">
        <defs>
          <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dc6b2f" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#dc6b2f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="chart-grid-line" d={`M 0 ${height * 0.25} H ${width}`} />
        <path className="chart-grid-line" d={`M 0 ${height * 0.5} H ${width}`} />
        <path className="chart-grid-line" d={`M 0 ${height * 0.75} H ${width}`} />
        <path className="chart-line position" d={buildPath(positionValues, width, height)} />
        <path className="chart-line risk" d={buildPath(riskValues, width, height)} />
      </svg>
      <div className="legend-row">
        <span><i className="legend-dot risk" />Risk</span>
        <span><i className="legend-dot position" />Position delta</span>
      </div>
    </section>
  );
}

