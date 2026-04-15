import { DailyStatRecord, HourlyStatRecord, LanguageStatRecord, MonthlyMetricRecord } from "../storage/types";
import { QuarterHourBucket } from "./types";

function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export class DailyMonthlyAggregator {
  public aggregateDaily(hourly: HourlyStatRecord[]): DailyStatRecord[] {
    const grouped = new Map<string, DailyStatRecord>();

    for (const row of hourly) {
      const key = row.date_key;
      const existing = grouped.get(key) ?? {
        date_key: row.date_key,
        workspace_id: row.workspace_id,
        repo_path: row.repo_path,
        active_ms: 0,
        idle_ms: 0,
        total_ms: 0,
        session_count: 0,
        commit_count: 0,
        lines_written: 0,
        productivity_score: 0,
        goal_status: "yellow",
        summary_json: "{}"
      };

      existing.active_ms = Number(existing.active_ms ?? 0) + Number(row.active_ms ?? 0);
      existing.idle_ms = Number(existing.idle_ms ?? 0) + Number(row.idle_ms ?? 0);
      existing.commit_count = Number(existing.commit_count ?? 0) + Number(row.commit_count ?? 0);
      existing.lines_written = Number(existing.lines_written ?? 0) + Number(row.lines_written ?? 0);
      grouped.set(key, existing);
    }

    for (const row of grouped.values()) {
      row.total_ms = Number(row.active_ms ?? 0) + Number(row.idle_ms ?? 0);
      row.productivity_score = Number(row.active_ms ?? 0) / Math.max(Number(row.total_ms ?? 0), 1);
      row.summary_json = JSON.stringify({
        activeHours: Number(row.active_ms ?? 0) / (60 * 60 * 1000),
        commits: Number(row.commit_count ?? 0),
        linesWritten: Number(row.lines_written ?? 0)
      });
    }

    return Array.from(grouped.values());
  }

  public aggregateLanguage(buckets: QuarterHourBucket[]): LanguageStatRecord[] {
    const grouped = new Map<string, LanguageStatRecord>();

    for (const bucket of buckets) {
      const language = bucket.languageId ?? "plaintext";
      const monthKey = monthKeyFromDateKey(bucket.dateKey);
      const key = ["month", monthKey, language].join("|");

      const existing = grouped.get(key) ?? {
        period_type: "month",
        period_key: monthKey,
        language_id: language,
        active_ms: 0,
        lines_written: 0,
        session_count: 0,
        commit_count: 0,
        productivity_score: 0
      };

      existing.active_ms = Number(existing.active_ms ?? 0) + bucket.activeMs;
      existing.lines_written = Number(existing.lines_written ?? 0) + bucket.linesWritten;
      grouped.set(key, existing);
    }

    for (const row of grouped.values()) {
      row.productivity_score = Number(row.active_ms ?? 0) > 0 ? 1 : 0;
    }

    return Array.from(grouped.values());
  }

  public aggregateMonthly(daily: DailyStatRecord[], language: LanguageStatRecord[]): MonthlyMetricRecord[] {
    const grouped = new Map<string, MonthlyMetricRecord>();

    for (const row of daily) {
      const monthKey = monthKeyFromDateKey(row.date_key);
      const existing = grouped.get(monthKey) ?? {
        month_key: monthKey,
        workspace_id: row.workspace_id,
        repo_path: row.repo_path,
        active_ms: 0,
        idle_ms: 0,
        session_count: 0,
        commit_count: 0,
        top_language: "plaintext",
        consistency_score: 0,
        growth_json: "{}",
        heatmap_json: "{}"
      };

      existing.active_ms = Number(existing.active_ms ?? 0) + Number(row.active_ms ?? 0);
      existing.idle_ms = Number(existing.idle_ms ?? 0) + Number(row.idle_ms ?? 0);
      existing.commit_count = Number(existing.commit_count ?? 0) + Number(row.commit_count ?? 0);
      grouped.set(monthKey, existing);
    }

    for (const [monthKey, row] of grouped.entries()) {
      const monthLang = language.filter((entry) => entry.period_type === "month" && entry.period_key === monthKey);
      const top = monthLang
        .slice()
        .sort((left, right) => Number(right.active_ms ?? 0) - Number(left.active_ms ?? 0))[0];

      row.top_language = top?.language_id ?? "plaintext";
      row.consistency_score = Number(row.active_ms ?? 0) / Math.max(Number(row.active_ms ?? 0) + Number(row.idle_ms ?? 0), 1);
      row.growth_json = JSON.stringify({ monthKey, note: "phase-6-baseline" });
      row.heatmap_json = JSON.stringify({ monthKey, bins: [] });
    }

    return Array.from(grouped.values());
  }
}
