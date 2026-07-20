import mongoose from "mongoose";

const eventLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    detail: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  { timestamps: true },
);

export const EventLog = mongoose.model("EventLog", eventLogSchema);

