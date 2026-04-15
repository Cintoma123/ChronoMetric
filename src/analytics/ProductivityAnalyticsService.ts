import { PersistenceService } from "../storage/PersistenceService";
import { DailyStatRecord, HourlyStatRecord } from "../storage/types";
import { ProductivityInsightsDto, TodayStatsDto } from "./types";

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export class ProductivityAnalyticsService {
  public constructor(private readonly persistence: PersistenceService) {}

  public async getTodayStats(): Promise<TodayStatsDto> {
    const dateKey = todayKey();
    const daily = await this.persistence.stats.listDaily();
    const row = daily.find((entry) => entry.date_key === dateKey);
    return this.toTodayDto(dateKey, row);
  }

  public async getInsights(): Promise<ProductivityInsightsDto> {
    const hourly = await this.persistence.stats.listHourly();
    const today = await this.getTodayStats();

    const productiveHours = this.computeProductiveHours(hourly);
    return {
      productiveHours,
      today
    };
  }

  private computeProductiveHours(hourly: HourlyStatRecord[]): Array<{ hour: number; score: number; activeMs: number }> {
    const byHour = new Map<number, { activeMs: number; totalMs: number }>();

    for (const row of hourly) {
      const entry = byHour.get(row.hour) ?? { activeMs: 0, totalMs: 0 };
      entry.activeMs += Number(row.active_ms ?? 0);
      entry.totalMs += Number(row.active_ms ?? 0) + Number(row.idle_ms ?? 0);
      byHour.set(row.hour, entry);
    }

    return Array.from(byHour.entries())
      .map(([hour, value]) => ({
        hour,
        score: value.activeMs / Math.max(value.totalMs, 1),
        activeMs: value.activeMs
      }))
      .sort((left, right) => right.score - left.score || right.activeMs - left.activeMs)
      .slice(0, 5);
  }

  private toTodayDto(dateKey: string, row: DailyStatRecord | undefined): TodayStatsDto {
    const activeMs = Number(row?.active_ms ?? 0);
    const idleMs = Number(row?.idle_ms ?? 0);
    const totalMs = Number(row?.total_ms ?? activeMs + idleMs);

    return {
      dateKey,
      activeMs,
      idleMs,
      totalMs,
      commits: Number(row?.commit_count ?? 0),
      linesWritten: Number(row?.lines_written ?? 0),
      productivityScore: activeMs / Math.max(totalMs, 1)
    };
  }
}
