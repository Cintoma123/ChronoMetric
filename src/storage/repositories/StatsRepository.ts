import { DatabaseManager } from "../DatabaseManager";
import {
  AggregationWatermarkRecord,
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

  public async listHourly(): Promise<HourlyStatRecord[]> {
    return this.database.list<HourlyStatRecord>("hourly_stats");
  }

  public async listDaily(): Promise<DailyStatRecord[]> {
    return this.database.list<DailyStatRecord>("daily_stats");
  }

  public async listLanguage(): Promise<LanguageStatRecord[]> {
    return this.database.list<LanguageStatRecord>("language_stats");
  }

  public async listMonthly(): Promise<MonthlyMetricRecord[]> {
    return this.database.list<MonthlyMetricRecord>("monthly_metrics");
  }

  public async getWatermark(pipeline: string): Promise<AggregationWatermarkRecord | undefined> {
    return this.database.getOneBy<AggregationWatermarkRecord>("aggregation_watermarks", { pipeline });
  }

  public async upsertWatermark(record: AggregationWatermarkRecord): Promise<number> {
    return this.database.upsert("aggregation_watermarks", ["pipeline"], record);
  }
}
