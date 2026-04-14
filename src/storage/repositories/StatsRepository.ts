import { DatabaseManager } from "../DatabaseManager";
import {
  DailyStatRecord,
  HourlyStatRecord,
  LanguageStatRecord,
  MonthlyMetricRecord,
  SettingsSnapshotRecord
} from "../types";

export class StatsRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async upsertHourly(record: HourlyStatRecord): Promise<number> {
    return this.database.upsert("hourly_stats", ["date_key", "hour", "repo_path"], record);
  }

  public async upsertDaily(record: DailyStatRecord): Promise<number> {
    return this.database.upsert("daily_stats", ["date_key"], record);
  }

  public async upsertLanguage(record: LanguageStatRecord): Promise<number> {
    return this.database.upsert("language_stats", ["period_type", "period_key", "language_id"], record);
  }

  public async upsertMonthly(record: MonthlyMetricRecord): Promise<number> {
    return this.database.upsert("monthly_metrics", ["month_key"], record);
  }

  public async insertSettingsSnapshot(record: SettingsSnapshotRecord): Promise<number> {
    return this.database.insert("settings_snapshot", record);
  }
}
