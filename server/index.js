import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./src/database.js";
import { createRepositories } from "./src/repositories.js";
import { DigitalTwinSimulator } from "./src/simulator.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173";

app.use(
  cors({
    origin: clientOrigin.split(",").map((origin) => origin.trim()),
  }),
);
app.use(express.json());

const databaseState = await connectDatabase(process.env.MONGODB_URI);
const repositories = createRepositories(databaseState.connected);
const simulator = new DigitalTwinSimulator({
  telemetryRepository: repositories.telemetry,
  eventRepository: repositories.events,
  intervalMs: Number(process.env.SIMULATION_INTERVAL_MS || 2000),
});

await repositories.events.create({
  type: "system",
  title: databaseState.connected ? "MongoDB connected" : "In-memory mode active",
  detail: databaseState.message,
  severity: databaseState.connected ? "info" : "warning",
});

await simulator.bootstrap();
simulator.start();

app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    service: "uav-digital-twin-deception-api",
    database: databaseState.connected ? "mongodb" : "memory",
    activeScenario: simulator.getActiveScenario(),
    generatedAt: new Date().toISOString(),
  });
});

app.get("/api/scenarios", (_req, res) => {
  res.json({
    activeScenario: simulator.getActiveScenario(),
    scenarios: simulator.getScenarios(),
  });
});

app.post("/api/scenarios", async (req, res, next) => {
  try {
    const { scenarioId } = req.body;
    const result = await simulator.setScenario(scenarioId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/telemetry/latest", async (_req, res) => {
  const latest = await repositories.telemetry.latest();
  res.json({ telemetry: latest });
});

app.get("/api/telemetry/history", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 60), 240);
  const history = await repositories.telemetry.history(limit);
  res.json({ telemetry: history });
});

app.get("/api/events", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const events = await repositories.events.recent(limit);
  res.json({ events });
});

const clientDistPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDistPath));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: {
      message: error.message || "Unexpected server error",
      status,
    },
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Allowed client origin: ${clientOrigin}`);
});
