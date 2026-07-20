import { EventLog } from "./models/EventLog.js";
import { TelemetryFrame } from "./models/TelemetryFrame.js";

const MAX_MEMORY_RECORDS = 600;

class MemoryTelemetryRepository {
  constructor() {
    this.records = [];
  }

  async create(record) {
    this.records.push({ ...record, id: crypto.randomUUID() });
    this.records = this.records.slice(-MAX_MEMORY_RECORDS);
    return this.records.at(-1);
  }

  async latest() {
    return this.records.at(-1) || null;
  }

  async history(limit) {
    return this.records.slice(-limit);
  }
}

class MongoTelemetryRepository {
  async create(record) {
    return TelemetryFrame.create(record);
  }

  async latest() {
    return TelemetryFrame.findOne().sort({ timestamp: -1 }).lean();
  }

  async history(limit) {
    const records = await TelemetryFrame.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    return records.reverse();
  }
}

class MemoryEventRepository {
  constructor() {
    this.records = [];
  }

  async create(record) {
    const event = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.push(event);
    this.records = this.records.slice(-MAX_MEMORY_RECORDS);
    return event;
  }

  async recent(limit) {
    return this.records.slice(-limit).reverse();
  }
}

class MongoEventRepository {
  async create(record) {
    return EventLog.create(record);
  }

  async recent(limit) {
    return EventLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}

export function createRepositories(useMongo) {
  return {
    telemetry: useMongo ? new MongoTelemetryRepository() : new MemoryTelemetryRepository(),
    events: useMongo ? new MongoEventRepository() : new MemoryEventRepository(),
  };
}

