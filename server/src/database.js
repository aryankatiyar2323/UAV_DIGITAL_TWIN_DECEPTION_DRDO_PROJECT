import mongoose from "mongoose";

export async function connectDatabase(uri) {
  if (!uri) {
    return {
      connected: false,
      message: "MONGODB_URI was not provided, so telemetry is stored in memory.",
    };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 1500,
    });

    return {
      connected: true,
      message: `Connected to ${mongoose.connection.name}.`,
    };
  } catch (error) {
    return {
      connected: false,
      message: `MongoDB unavailable (${error.message}). Telemetry is stored in memory.`,
    };
  }
}

