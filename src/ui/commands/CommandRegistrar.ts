import * as vscode from "vscode";
import { ConfigService } from "../../core/config/ConfigService";
import { AggregationScheduler } from "../../aggregation/AggregationScheduler";
import { LanguageAnalyticsService } from "../../analytics/LanguageAnalyticsService";
import { ProductivityAnalyticsService } from "../../analytics/ProductivityAnalyticsService";
import { SessionAnalyticsService } from "../../analytics/SessionAnalyticsService";
import { StreakAnalyticsService } from "../../analytics/StreakAnalyticsService";

export class CommandRegistrar {
  public static register(
    configService: ConfigService,
    aggregationScheduler: AggregationScheduler,
    productivityAnalytics: ProductivityAnalyticsService,
    sessionAnalytics: SessionAnalyticsService,
    languageAnalytics: LanguageAnalyticsService,
    streakAnalytics: StreakAnalyticsService
  ): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand("chronometric.viewTodayStats", async () => {
        const result = await aggregationScheduler.runAggregation();
        const today = await productivityAnalytics.getTodayStats();
        await vscode.window.showInformationMessage(
          `Today: ${(today.activeMs / 3600000).toFixed(2)}h active, ${today.commits} commits, ${today.linesWritten} lines. Aggregated ${result.processedEventCount} new events.`
        );
      }),
      vscode.commands.registerCommand("chronometric.showMonthlyTrends", async () => {
        const trends = await languageAnalytics.getMonthlyTrends();
        const preview = trends.slice(0, 3).map((row) => `${row.languageId}: ${(row.activeMs / 3600000).toFixed(1)}h`).join(", ");
        await vscode.window.showInformationMessage(
          preview.length > 0 ? `Monthly language trends: ${preview}` : "No monthly language trends yet."
        );
      }),
      vscode.commands.registerCommand("chronometric.setDailyGoals", async () => {
        const snapshot = configService.getSnapshot();
        await vscode.window.showInformationMessage(
          `ChronoMetric: Goal setup UI is coming in Phase 8. Tracking paused: ${snapshot.pauseTracking ? "yes" : "no"}.`
        );
      }),
      vscode.commands.registerCommand("chronometric.viewProductivityInsights", async () => {
        const productivity = await productivityAnalytics.getInsights();
        const session = await sessionAnalytics.getInsights();
        const streak = await streakAnalytics.getInsights();
        const topHour = productivity.productiveHours[0];

        await vscode.window.showInformationMessage(
          [
            `Top hour: ${topHour ? `${topHour.hour}:00 (${Math.round(topHour.score * 100)}%)` : "n/a"}`,
            `Avg commits/session: ${session.averageCommitsPerSession.toFixed(2)}`,
            `Current streak: ${streak.currentStreakDays} day(s)`
          ].join(" | ")
        );
      })
    ];
  }
}
