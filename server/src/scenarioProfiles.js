export const SCENARIOS = [
  {
    id: "baseline",
    name: "Baseline Mirror",
    severity: "low",
    limit: "Noise capped to normal sensor tolerance",
    description: "Decoy telemetry mirrors the trusted twin with tiny bounded noise.",
  },
  {
    id: "gps-shadow",
    name: "GPS Shadow",
    severity: "medium",
    limit: "Position offset capped below 320 m",
    description: "Decoy route is shifted by a fixed, bounded coordinate offset.",
  },
  {
    id: "altitude-drift",
    name: "Altitude Drift",
    severity: "medium",
    limit: "Altitude offset capped below 22 m",
    description: "Decoy altitude slowly diverges while other channels stay stable.",
  },
  {
    id: "link-latency",
    name: "Link Latency",
    severity: "warning",
    limit: "Delay capped to the simulator history window",
    description: "Decoy telemetry replays a recent trusted frame to mimic a stale twin.",
  },
  {
    id: "sensor-mask",
    name: "Sensor Mask",
    severity: "medium",
    limit: "Speed and temperature smoothing use fixed windows",
    description: "Decoy telemetry smooths selected sensor channels to hide fluctuation.",
  },
];

export function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

