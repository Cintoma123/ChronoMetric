import { PersistenceService } from "../storage/PersistenceService";
import { SessionInsightsDto } from "./types";

export class SessionAnalyticsService {
  public constructor(private readonly persistence: PersistenceService) {}

  public async getInsights(): Promise<SessionInsightsDto> {
    const sessions = await this.persistence.sessions.listAll();
    const commits = await this.persistence.gitCommits.listAll();

    const averageCommitsPerSession = commits.length / Math.max(sessions.length, 1);

    const durationDistribution = {
      under30: 0,
      min31to60: 0,
      min61to90: 0,
      over90: 0
    };

    for (const session of sessions) {
      const durationMs = Number(session.total_ms ?? 0);
      const minutes = durationMs / (60 * 1000);

      if (minutes <= 30) {
        durationDistribution.under30 += 1;
      } else if (minutes <= 60) {
        durationDistribution.min31to60 += 1;
      } else if (minutes <= 90) {
        durationDistribution.min61to90 += 1;
      } else {
        durationDistribution.over90 += 1;
      }
    }

    return {
      averageCommitsPerSession,
      durationDistribution
    };
  }
}
