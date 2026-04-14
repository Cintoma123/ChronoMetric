import * as vscode from "vscode";
import { ConfigService } from "../../core/config/ConfigService";

export class CommandRegistrar {
  public static register(configService: ConfigService): vscode.Disposable[] {
    return [
      vscode.commands.registerCommand("chronometric.viewTodayStats", async () => {
        await vscode.window.showInformationMessage("ChronoMetric: Today's stats panel is coming in Phase 9.");
      }),
      vscode.commands.registerCommand("chronometric.showMonthlyTrends", async () => {
        await vscode.window.showInformationMessage("ChronoMetric: Monthly trends dashboard is coming in Phase 9.");
      }),
      vscode.commands.registerCommand("chronometric.setDailyGoals", async () => {
        const snapshot = configService.getSnapshot();
        await vscode.window.showInformationMessage(
          `ChronoMetric: Goal setup UI is coming in Phase 8. Tracking paused: ${snapshot.pauseTracking ? "yes" : "no"}.`
        );
      }),
      vscode.commands.registerCommand("chronometric.viewProductivityInsights", async () => {
        await vscode.window.showInformationMessage("ChronoMetric: Productivity insights UI is coming in Phase 7/9.");
      })
    ];
  }
}
