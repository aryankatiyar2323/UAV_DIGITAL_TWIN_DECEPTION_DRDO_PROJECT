const FIELDS = [
  ["latitude", "Lat"],
  ["longitude", "Lon"],
  ["altitudeM", "Alt m"],
  ["speedMs", "Speed m/s"],
  ["headingDeg", "Head deg"],
  ["batteryPct", "Battery %"],
  ["signalPct", "Signal %"],
  ["motorTempC", "Temp C"],
];

function formatValue(value) {
  if (value === undefined || value === null) return "--";
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(2);
  return value;
}

export function TwinPanel({ title, twin, highlight = false }) {
  return (
    <article className={`twin-panel ${highlight ? "decoy" : ""}`}>
      <div className="twin-heading">
        <h3>{title}</h3>
        <span>{twin?.mode || "SYNCING"}</span>
      </div>
      <dl className="twin-fields">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{formatValue(twin?.[key])}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

