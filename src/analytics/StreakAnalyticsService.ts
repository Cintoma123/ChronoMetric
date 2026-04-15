import { PersistenceService } from "../storage/PersistenceService";
import { StreakInsightsDto } from "./types";

const MIN_ACTIVE_STREAK_MS = 30 * 60 * 1000;

function sortDateKeys(keys: string[]): string[] {
  return keys.slice().sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
}

export class StreakAnalyticsService {
  public constructor(private readonly persistence: PersistenceService) {}

  public async getInsights(): Promise<StreakInsightsDto> {
    const daily = await this.persistence.stats.listDaily();
    const activeDays = sortDateKeys(
      daily.filter((entry) => Number(entry.active_ms ?? 0) >= MIN_ACTIVE_STREAK_MS).map((entry) => entry.date_key)
    );

    let longest = 0;
    let current = 0;

    for (let index = 0; index < activeDays.length; index += 1) {
      if (index === 0) {
        current = 1;
        longest = 1;
        continue;
      }

      const prevKey = activeDays[index - 1];
      const nextKey = activeDays[index];
      if (!prevKey || !nextKey) {
        continue;
      }

      const prev = new Date(prevKey).getTime();
      const next = new Date(nextKey).getTime();
      const deltaDays = Math.round((next - prev) / (24 * 60 * 60 * 1000));

      if (deltaDays === 1) {
        current += 1;
      } else {
        current = 1;
      }

      longest = Math.max(longest, current);
    }

    const consistencyScore = daily.length === 0 ? 0 : activeDays.length / daily.length;

    return {
      currentStreakDays: current,
      longestStreakDays: longest,
      consistencyScore
    };
  }
}
