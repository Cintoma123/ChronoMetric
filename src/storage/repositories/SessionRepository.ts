import { DatabaseManager } from "../DatabaseManager";
import { SessionRecord } from "../types";

export class SessionRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async startSession(record: SessionRecord): Promise<number> {
    return this.database.insert("sessions", {
      active_ms: 0,
      idle_ms: 0,
      total_ms: 0,
      files_touched: 0,
      ...record
    });
  }

  public async closeSession(id: number, patch: Partial<SessionRecord>): Promise<boolean> {
    return this.database.updateById("sessions", id, patch);
  }

  public async listAll(): Promise<SessionRecord[]> {
    return this.database.list<SessionRecord>("sessions");
  }
}
