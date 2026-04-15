import { PersistenceService } from "../storage/PersistenceService";
import { LanguageTrendDto } from "./types";

function compareMonthKey(monthKey: string): string {
  const [rawYear, rawMonth] = monthKey.split("-").map((part) => Number(part));
  const y = typeof rawYear === "number" && Number.isFinite(rawYear) ? rawYear : new Date().getFullYear();
  const m = typeof rawMonth === "number" && Number.isFinite(rawMonth) ? rawMonth : 1;
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export class LanguageAnalyticsService {
  public constructor(private readonly persistence: PersistenceService) {}

  public async getMonthlyTrends(): Promise<LanguageTrendDto[]> {
    const rows = await this.persistence.stats.listLanguage();
    const monthRows = rows.filter((row) => row.period_type === "month");

    return monthRows.map((row) => {
      const previousMonth = compareMonthKey(row.period_key);
      const previous = monthRows.find((candidate) => candidate.period_key === previousMonth && candidate.language_id === row.language_id);

      const currentActive = Number(row.active_ms ?? 0);
      const previousActive = Number(previous?.active_ms ?? 0);

      return {
        monthKey: row.period_key,
        languageId: row.language_id,
        activeMs: currentActive,
        linesWritten: Number(row.lines_written ?? 0),
        growthRate: (currentActive - previousActive) / Math.max(previousActive, 1)
      };
    });
  }
}
