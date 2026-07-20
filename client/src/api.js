import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  timeout: 4000,
});

export async function getHealth() {
  const { data } = await api.get("/api/health");
  return data;
}

export async function getScenarios() {
  const { data } = await api.get("/api/scenarios");
  return data;
}

export async function activateScenario(scenarioId) {
  const { data } = await api.post("/api/scenarios", { scenarioId });
  return data;
}

export async function getLatestTelemetry() {
  const { data } = await api.get("/api/telemetry/latest");
  return data.telemetry;
}

export async function getTelemetryHistory(limit = 80) {
  const { data } = await api.get("/api/telemetry/history", {
    params: { limit },
  });
  return data.telemetry;
}

export async function getEvents(limit = 25) {
  const { data } = await api.get("/api/events", {
    params: { limit },
  });
  return data.events;
}

