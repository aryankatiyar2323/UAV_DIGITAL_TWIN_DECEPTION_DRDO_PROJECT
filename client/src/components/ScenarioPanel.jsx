import { LoaderCircle, Play } from "lucide-react";

export function ScenarioPanel({ scenarios, activeScenarioId, loadingScenario, onActivate }) {
  return (
    <aside className="scenario-panel">
      <div className="section-title compact">
        <div>
          <p className="eyebrow">Fixed profiles</p>
          <h2>Deception bounds</h2>
        </div>
      </div>

      <div className="scenario-list">
        {scenarios.map((scenario) => {
          const isActive = scenario.id === activeScenarioId;
          const isLoading = loadingScenario === scenario.id;
          return (
            <button
              className={`scenario-option ${isActive ? "active" : ""}`}
              key={scenario.id}
              onClick={() => onActivate(scenario.id)}
              disabled={isLoading}
              title={scenario.limit}
            >
              <span>
                <strong>{scenario.name}</strong>
                <small>{scenario.limit}</small>
              </span>
              {isLoading ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

