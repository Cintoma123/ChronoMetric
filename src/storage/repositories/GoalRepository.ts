import { DatabaseManager } from "../DatabaseManager";
import { GoalRecord } from "../types";

export class GoalRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async upsertForDate(record: GoalRecord): Promise<number> {
    return this.database.upsert("goals", ["date_key"], record);
  }

  public async getByDate(dateKey: string): Promise<GoalRecord | undefined> {
    return this.database.getOneBy<GoalRecord>("goals", { date_key: dateKey });
  }
}
