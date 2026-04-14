import * as vscode from "vscode";
import { ChronoMetricConfig } from "../types";

const SECTION = "chronometric";
const MIN_IDLE_MINUTES = 5;
const MAX_IDLE_MINUTES = 10;

export class ConfigService implements vscode.Disposable {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<ChronoMetricConfig>();
  private readonly configurationChangeDisposable: vscode.Disposable;
  private currentConfig: ChronoMetricConfig;

  public constructor() {
    this.currentConfig = this.readConfig();
    this.configurationChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(SECTION)) {
        return;
      }

      this.currentConfig = this.readConfig();
      this.onDidChangeEmitter.fire(this.currentConfig);
    });
  }

  public get onDidChange(): vscode.Event<ChronoMetricConfig> {
    return this.onDidChangeEmitter.event;
  }

  public getSnapshot(): ChronoMetricConfig {
    return this.currentConfig;
  }

  public dispose(): void {
    this.configurationChangeDisposable.dispose();
    this.onDidChangeEmitter.dispose();
  }

  private readConfig(): ChronoMetricConfig {
    const config = vscode.workspace.getConfiguration(SECTION);

    const rawIdle = config.get<number>("idleThresholdMinutes", MIN_IDLE_MINUTES);
    const idleThresholdMinutes = Math.max(MIN_IDLE_MINUTES, Math.min(MAX_IDLE_MINUTES, Number(rawIdle) || MIN_IDLE_MINUTES));

    return {
      pauseTracking: config.get<boolean>("pauseTracking", false),
      idleThresholdMinutes,
      excludedGlobs: this.readStringArray(config, "excludedGlobs"),
      excludedRepos: this.readStringArray(config, "excludedRepos"),
      aggregationMode: this.readAggregationMode(config.get<string>("aggregationMode", "lazy")),
      gitPollingMinutes: this.readPollingMinutes(config.get<number>("gitPollingMinutes", 10))
    };
  }

  private readStringArray(config: vscode.WorkspaceConfiguration, key: string): string[] {
    const candidate = config.get<unknown>(key, []);
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter((value) => value.length > 0);
  }

  private readAggregationMode(mode: string): "lazy" | "incremental" {
    return mode === "incremental" ? "incremental" : "lazy";
  }

  private readPollingMinutes(rawPollingMinutes: number): number {
    const normalized = Number(rawPollingMinutes);
    if (!Number.isFinite(normalized)) {
      return 10;
    }

    return Math.max(1, Math.min(60, Math.trunc(normalized)));
  }
}
