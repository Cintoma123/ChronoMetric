import { DatabaseManager } from "../DatabaseManager";
import { TrackedEventRecord } from "../types";

export class EventRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async insert(event: TrackedEventRecord): Promise<number> {
    return this.database.insert("events", {
      line_delta: 0,
      char_delta: 0,
      is_focus: 1,
      ...event
    });
  }

  public async listAll(): Promise<TrackedEventRecord[]> {
    return this.database.list<TrackedEventRecord>("events");
  }
}
