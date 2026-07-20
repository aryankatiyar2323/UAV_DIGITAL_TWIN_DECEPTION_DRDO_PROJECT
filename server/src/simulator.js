import { SCENARIOS, getScenarioById } from "./scenarioProfiles.js";

const BASE_LAT = 13.02;
const BASE_LON = 77.58;
const EARTH_METERS_PER_DEGREE = 111_320;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function headingDelta(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function distanceMeters(a, b) {
  const latMeters = (a.latitude - b.latitude) * EARTH_METERS_PER_DEGREE;
  const lonMeters =
    (a.longitude - b.longitude) *
    EARTH_METERS_PER_DEGREE *
    Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(latMeters ** 2 + lonMeters ** 2);
}

function generateTrustedTwin(tick) {
  const routeAngle = tick / 20;
  const latitude = BASE_LAT + Math.sin(routeAngle) * 0.008 + Math.cos(tick / 43) * 0.002;
  const longitude = BASE_LON + Math.cos(routeAngle) * 0.01 + Math.sin(tick / 37) * 0.002;
  const headingDeg = (routeAngle * 180 + 90) % 360;

  return {
    latitude: round(latitude, 6),
    longitude: round(longitude, 6),
    altitudeM: round(128 + Math.sin(tick / 9) * 7 + Math.cos(tick / 21) * 3),
    speedMs: round(17 + Math.sin(tick / 6) * 1.6),
    headingDeg: round(headingDeg),
    batteryPct: round(clamp(96 - tick * 0.035, 24, 100)),
    signalPct: round(clamp(87 + Math.sin(tick / 8) * 9, 40, 100)),
    motorTempC: round(47 + Math.sin(tick / 5) * 5 + Math.cos(tick / 13) * 2),
    mode: "LAB_ROUTE",
  };
}

function withSensorNoise(twin, tick) {
  return {
    ...twin,
    latitude: round(twin.latitude + Math.sin(tick) * 0.00002, 6),
    longitude: round(twin.longitude + Math.cos(tick) * 0.00002, 6),
    altitudeM: round(twin.altitudeM + Math.sin(tick / 3) * 0.4),
    speedMs: round(twin.speedMs + Math.cos(tick / 4) * 0.12),
    signalPct: round(clamp(twin.signalPct + Math.sin(tick / 2) * 0.7, 0, 100)),
  };
}

function applyScenario({ scenarioId, trustedTwin, tick, history }) {
  const delayed = history.at(-5)?.trustedTwin || trustedTwin;

  switch (scenarioId) {
    case "gps-shadow":
      return {
        ...trustedTwin,
        latitude: round(trustedTwin.latitude + 0.0019 + Math.sin(tick / 10) * 0.00025, 6),
        longitude: round(trustedTwin.longitude - 0.0017 + Math.cos(tick / 12) * 0.00025, 6),
        signalPct: round(clamp(trustedTwin.signalPct - 6, 0, 100)),
      };
    case "altitude-drift":
      return {
        ...trustedTwin,
        altitudeM: round(trustedTwin.altitudeM + clamp(9 + Math.sin(tick / 14) * 10, 0, 21)),
        motorTempC: round(trustedTwin.motorTempC - 1.2),
      };
    case "link-latency":
      return {
        ...delayed,
        signalPct: round(clamp(delayed.signalPct - 12, 0, 100)),
      };
    case "sensor-mask":
      return {
        ...trustedTwin,
        speedMs: round(16.8 + Math.sin(tick / 24) * 0.3),
        motorTempC: round(46.5 + Math.cos(tick / 30) * 0.4),
      };
    case "baseline":
    default:
      return withSensorNoise(trustedTwin, tick);
  }
}

function analyzeFrame({ trustedTwin, decoyTwin, scenarioId }) {
  const deltas = {
    positionM: round(distanceMeters(trustedTwin, decoyTwin)),
    altitudeM: round(Math.abs(trustedTwin.altitudeM - decoyTwin.altitudeM)),
    speedMs: round(Math.abs(trustedTwin.speedMs - decoyTwin.speedMs)),
    headingDeg: round(headingDelta(trustedTwin.headingDeg, decoyTwin.headingDeg)),
    signalPct: round(Math.abs(trustedTwin.signalPct - decoyTwin.signalPct)),
  };

  const anomalies = [];
  if (deltas.positionM > 120) anomalies.push("POSITION_DIVERGENCE");
  if (deltas.altitudeM > 10) anomalies.push("ALTITUDE_DIVERGENCE");
  if (deltas.speedMs > 1.8) anomalies.push("SPEED_DIVERGENCE");
  if (deltas.signalPct > 10) anomalies.push("LINK_QUALITY_SHIFT");
  if (scenarioId === "link-latency") anomalies.push("STALE_TWIN_REPLAY");
  if (scenarioId === "sensor-mask") anomalies.push("SENSOR_SMOOTHING");

  const weighted =
    deltas.positionM / 3.2 +
    deltas.altitudeM * 2.4 +
    deltas.speedMs * 10 +
    deltas.signalPct * 1.4 +
    anomalies.length * 7;

  return {
    deltas,
    anomalies,
    riskScore: round(clamp(weighted, 0, 100)),
  };
}

export class DigitalTwinSimulator {
  constructor({ telemetryRepository, eventRepository, intervalMs }) {
    this.telemetryRepository = telemetryRepository;
    this.eventRepository = eventRepository;
    this.intervalMs = intervalMs;
    this.tick = 0;
    this.activeScenario = "baseline";
    this.history = [];
    this.timer = null;
  }

  getScenarios() {
    return SCENARIOS;
  }

  getActiveScenario() {
    return getScenarioById(this.activeScenario);
  }

  async setScenario(scenarioId) {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      const error = new Error(`Unknown scenario: ${scenarioId}`);
      error.status = 400;
      throw error;
    }

    this.activeScenario = scenario.id;
    await this.eventRepository.create({
      type: "scenario",
      title: `${scenario.name} activated`,
      detail: `${scenario.description} Limit: ${scenario.limit}.`,
      severity: scenario.severity === "low" ? "info" : "warning",
    });

    const frame = await this.generateFrame();
    return {
      activeScenario: scenario,
      telemetry: frame,
    };
  }

  async bootstrap() {
    if (!(await this.telemetryRepository.latest())) {
      await this.generateFrame();
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.generateFrame().catch((error) => {
        console.error("Simulation frame failed", error);
      });
    }, this.intervalMs);
  }

  async generateFrame() {
    this.tick += 1;
    const trustedTwin = generateTrustedTwin(this.tick);
    const decoyTwin = applyScenario({
      scenarioId: this.activeScenario,
      trustedTwin,
      tick: this.tick,
      history: this.history,
    });

    const analysis = analyzeFrame({
      trustedTwin,
      decoyTwin,
      scenarioId: this.activeScenario,
    });

    const frame = {
      timestamp: new Date(),
      activeScenario: this.activeScenario,
      trustedTwin,
      decoyTwin,
      ...analysis,
    };

    this.history.push(frame);
    this.history = this.history.slice(-24);
    return this.telemetryRepository.create(frame);
  }
}

