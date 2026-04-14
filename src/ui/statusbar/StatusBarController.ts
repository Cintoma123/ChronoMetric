import * as vscode from "vscode";
import { ChronoMetricConfig } from "../../core/types";
import { PersistenceMode } from "../../storage/types";

export class StatusBarController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "chronometric.viewTodayStats";
    this.item.name = "ChronoMetric";
    this.item.show();
  }

  public setInitializing(): void {
    this.item.text = "$(pulse) ChronoMetric initializing";
    this.item.tooltip = "ChronoMetric is starting services and loading settings.";
    this.item.backgroundColor = undefined;
  }

  public setReady(config: ChronoMetricConfig, persistenceMode: PersistenceMode = "json"): void {
    const stateText = config.pauseTracking ? "Paused" : "Running";
    this.item.text = `$(clock) ChronoMetric ${stateText}`;
    this.item.tooltip = [
      "ChronoMetric Foundation Phase active",
      `Persistence: ${persistenceMode.toUpperCase()}`,
      `Idle threshold: ${config.idleThresholdMinutes} min`,
      `Git polling: ${config.gitPollingMinutes} min`,
      "Click to view today's stats"
    ].join("\n");
    this.item.backgroundColor = undefined;
  }

  public setError(errorMessage: string): void {
    this.item.text = "$(error) ChronoMetric error";
    this.item.tooltip = `ChronoMetric startup failed: ${errorMessage}`;
    this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
  }

  public dispose(): void {
    this.item.dispose();
  }
}
