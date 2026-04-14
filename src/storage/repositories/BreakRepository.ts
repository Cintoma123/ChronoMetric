import { DatabaseManager } from "../DatabaseManager";
import { BreakRecord } from "../types";

export class BreakRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async insert(record: BreakRecord): Promise<number> {
    return this.database.insert("breaks", record);
  }

  public async closeBreak(id: number, patch: Partial<BreakRecord>): Promise<boolean> {
    return this.database.updateById("breaks", id, patch);
  }

  public async listAll(): Promise<BreakRecord[]> {
    return this.database.list<BreakRecord>("breaks");
  }
}
