import mongoose from "mongoose";

const twinSchema = new mongoose.Schema(
  {
    latitude: Number,
    longitude: Number,
    altitudeM: Number,
    speedMs: Number,
    headingDeg: Number,
    batteryPct: Number,
    signalPct: Number,
    motorTempC: Number,
    mode: String,
  },
  { _id: false },
);

const telemetryFrameSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, required: true },
    activeScenario: { type: String, required: true },
    trustedTwin: twinSchema,
    decoyTwin: twinSchema,
    deltas: {
      positionM: Number,
      altitudeM: Number,
      speedMs: Number,
      headingDeg: Number,
      signalPct: Number,
    },
    riskScore: Number,
    anomalies: [String],
  },
  { timestamps: true },
);

telemetryFrameSchema.index({ timestamp: -1 });

export const TelemetryFrame = mongoose.model("TelemetryFrame", telemetryFrameSchema);

