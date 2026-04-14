import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ConfigService } from "./config/ConfigService";
import { ChronoMetricStoragePaths } from "./types";
import { CommandRegistrar } from "../ui/commands/CommandRegistrar";
import { StatusBarController } from "../ui/statusbar/StatusBarController";
import { PersistenceService } from "../storage/PersistenceService";

export class ServiceContainer implements vscode.Disposable {
  private readonly managedDisposables: vscode.Disposable[] = [];

  private configService?: ConfigService;
  private statusBarController?: StatusBarController;
  private persistenceService?: PersistenceService;
  private storagePaths?: ChronoMetricStoragePaths;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async start(): Promise<void> {
    this.storagePaths = await this.initializeStoragePaths();

    this.configService = new ConfigService();
    this.statusBarController = new StatusBarController();
    this.persistenceService = new PersistenceService(this.storagePaths);

    this.statusBarController.setInitializing();
    this.managedDisposables.push(this.configService, this.statusBarController, this.persistenceService);

    await this.persistenceService.start();

    const commandDisposables = CommandRegistrar.register(this.configService);
    this.managedDisposables.push(...commandDisposables);

    const configChangeDisposable = this.configService.onDidChange((nextConfig) => {
      this.statusBarController?.setReady(nextConfig, this.persistenceService?.getMode());
      void this.persistenceService?.stats.insertSettingsSnapshot({
        captured_ts: Date.now(),
        pause_tracking: nextConfig.pauseTracking ? 1 : 0,
        idle_threshold_min: nextConfig.idleThresholdMinutes,
        excluded_json: JSON.stringify({
          excludedGlobs: nextConfig.excludedGlobs,
          excludedRepos: nextConfig.excludedRepos
        })
      });
    });
    this.managedDisposables.push(configChangeDisposable);

    const currentConfig = this.configService.getSnapshot();
    await this.persistenceService.stats.insertSettingsSnapshot({
      captured_ts: Date.now(),
      pause_tracking: currentConfig.pauseTracking ? 1 : 0,
      idle_threshold_min: currentConfig.idleThresholdMinutes,
      excluded_json: JSON.stringify({
        excludedGlobs: currentConfig.excludedGlobs,
        excludedRepos: currentConfig.excludedRepos
      })
    });

    this.statusBarController.setReady(currentConfig, this.persistenceService.getMode());
    void this.context.globalState.update("chronometric.storagePaths", this.storagePaths);
    void this.context.globalState.update("chronometric.persistenceMode", this.persistenceService.getMode());
  }

  public getStoragePaths(): ChronoMetricStoragePaths {
    if (!this.storagePaths) {
      throw new Error("Storage paths requested before container startup.");
    }

    return this.storagePaths;
  }

  public dispose(): void {
    for (const disposable of this.managedDisposables.reverse()) {
      disposable.dispose();
    }
    this.managedDisposables.length = 0;
  }

  private async initializeStoragePaths(): Promise<ChronoMetricStoragePaths> {
    const baseDir = path.join(os.homedir(), ".chrono-metric");
    const logsDir = path.join(baseDir, "logs");
    const databasePath = path.join(baseDir, "chronometric.db");

    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    return { baseDir, logsDir, databasePath };
  }
}
