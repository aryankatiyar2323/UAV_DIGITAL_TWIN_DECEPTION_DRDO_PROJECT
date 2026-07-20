import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  MapPinned,
  Radar,
  RefreshCcw,
  ShieldCheck,
  Signal,
} from "lucide-react";
import {
  activateScenario,
  getEvents,
  getHealth,
  getLatestTelemetry,
  getScenarios,
  getTelemetryHistory,
} from "./api.js";
import { EventLog } from "./components/EventLog.jsx";
import { MetricCard } from "./components/MetricCard.jsx";
import { ScenarioPanel } from "./components/ScenarioPanel.jsx";
import { TelemetryChart } from "./components/TelemetryChart.jsx";
import { TwinPanel } from "./components/TwinPanel.jsx";

const EMPTY_STATE = {
  health: null,
  scenarios: [],
  activeScenario: null,
  telemetry: null,
  history: [],
  events: [],
};

function formatTime(value) {
  if (!value) return "Waiting";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function App() {
  const [state, setState] = useState(EMPTY_STATE);
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [error, setError] = useState("");

  async function refreshAll() {
    try {
      const [health, scenarioData, telemetry, history, events] = await Promise.all([
        getHealth(),
        getScenarios(),
        getLatestTelemetry(),
        getTelemetryHistory(),
        getEvents(),
      ]);

      setState({
        health,
        scenarios: scenarioData.scenarios,
        activeScenario: scenarioData.activeScenario,
        telemetry,
        history,
        events,
      });
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to reach the simulator API.");
    }
  }

  async function handleScenarioChange(scenarioId) {
    setLoadingScenario(scenarioId);
    try {
      const result = await activateScenario(scenarioId);
      await refreshAll();
      setState((current) => ({
        ...current,
        activeScenario: result.activeScenario,
        telemetry: result.telemetry,
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || requestError.message);
    } finally {
      setLoadingScenario(null);
    }
  }

  useEffect(() => {
    refreshAll();
    const timer = setInterval(refreshAll, 2000);
    return () => clearInterval(timer);
  }, []);

  const telemetry = state.telemetry;
  const riskLevel = useMemo(() => {
    const score = telemetry?.riskScore || 0;
    if (score >= 75) return "critical";
    if (score >= 35) return "warning";
    return "stable";
  }, [telemetry]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Simulation-only prototype</p>
          <h1>UAV Digital Twin Deception Lab</h1>
        </div>
        <div className="topbar-actions">
          <div className="status-pill" title="Backend storage mode">
            <Database size={16} />
            <span>{state.health?.database || "connecting"}</span>
          </div>
          <button className="icon-button" onClick={refreshAll} title="Refresh dashboard">
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      {error && (
        <section className="alert-strip">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </section>
      )}

      <section className="metrics-grid">
        <MetricCard
          icon={ShieldCheck}
          label="Active profile"
          value={state.activeScenario?.name || "Loading"}
          tone={riskLevel}
        />
        <MetricCard
          icon={Gauge}
          label="Risk score"
          value={`${Math.round(telemetry?.riskScore || 0)} / 100`}
          tone={riskLevel}
        />
        <MetricCard
          icon={MapPinned}
          label="Position delta"
          value={`${telemetry?.deltas?.positionM?.toFixed(1) || "0.0"} m`}
          tone={telemetry?.deltas?.positionM > 120 ? "warning" : "stable"}
        />
        <MetricCard
          icon={Signal}
          label="Signal delta"
          value={`${telemetry?.deltas?.signalPct?.toFixed(1) || "0.0"}%`}
          tone={telemetry?.deltas?.signalPct > 10 ? "warning" : "stable"}
        />
      </section>

      <section className="main-grid">
        <ScenarioPanel
          scenarios={state.scenarios}
          activeScenarioId={state.activeScenario?.id}
          loadingScenario={loadingScenario}
          onActivate={handleScenarioChange}
        />

        <section className="mission-board">
          <div className="section-title">
            <div>
              <p className="eyebrow">Twin comparison</p>
              <h2>Trusted vs decoy state</h2>
            </div>
            <div className={`risk-badge ${riskLevel}`}>
              <Activity size={15} />
              <span>{riskLevel}</span>
            </div>
          </div>

          <div className="radar-visual" aria-label="Twin position visualization">
            <div className="radar-grid" />
            <div className="radar-center">
              <Radar size={28} />
            </div>
            <div className="track trusted-track" />
            <div
              className="track decoy-track"
              style={{
                transform: `translate(${Math.min((telemetry?.deltas?.positionM || 0) / 6, 42)}px, ${Math.min((telemetry?.deltas?.altitudeM || 0) * 1.2, 34)}px)`,
              }}
            />
          </div>

          <div className="twins-grid">
            <TwinPanel title="Trusted Twin" twin={telemetry?.trustedTwin} />
            <TwinPanel title="Decoy Twin" twin={telemetry?.decoyTwin} highlight />
          </div>

          <TelemetryChart history={state.history} />
        </section>

        <aside className="right-column">
          <section className="anomaly-panel">
            <div className="section-title compact">
              <div>
                <p className="eyebrow">Current frame</p>
                <h2>{formatTime(telemetry?.timestamp)}</h2>
              </div>
            </div>
            <div className="tag-list">
              {telemetry?.anomalies?.length ? (
                telemetry.anomalies.map((anomaly) => <span key={anomaly}>{anomaly}</span>)
              ) : (
                <span>NO_ACTIVE_ANOMALY</span>
              )}
            </div>
          </section>
          <EventLog events={state.events} />
        </aside>
      </section>
    </main>
  );
}

