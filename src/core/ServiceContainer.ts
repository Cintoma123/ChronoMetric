import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ConfigService } from "./config/ConfigService";
import { ChronoMetricStoragePaths } from "./types";
import { CommandRegistrar } from "../ui/commands/CommandRegistrar";
import { StatusBarController } from "../ui/statusbar/StatusBarController";
import { PersistenceService } from "../storage/PersistenceService";
import { GitProcessRunner } from "../git/GitProcessRunner";
import { GitTracker } from "../git/GitTracker";
import { GitWorkspaceResolver } from "../git/GitWorkspaceResolver";
import { EventNormalizer } from "../tracking/EventNormalizer";
import { EventTracker } from "../tracking/EventTracker";
import { ExclusionMatcher } from "../tracking/ExclusionMatcher";
import { AggregationScheduler } from "../aggregation/AggregationScheduler";
import { ProductivityAnalyticsService } from "../analytics/ProductivityAnalyticsService";
import { SessionAnalyticsService } from "../analytics/SessionAnalyticsService";
import { LanguageAnalyticsService } from "../analytics/LanguageAnalyticsService";
import { StreakAnalyticsService } from "../analytics/StreakAnalyticsService";

export class ServiceContainer implements vscode.Disposable {
  private readonly managedDisposables: vscode.Disposable[] = [];

  private configService?: ConfigService;
  private statusBarController?: StatusBarController;
  private persistenceService?: PersistenceService;
  private gitWorkspaceResolver?: GitWorkspaceResolver;
  private eventTracker?: EventTracker;
  private gitTracker?: GitTracker;
  private aggregationScheduler?: AggregationScheduler;
  private productivityAnalytics?: ProductivityAnalyticsService;
  private sessionAnalytics?: SessionAnalyticsService;
  private languageAnalytics?: LanguageAnalyticsService;
  private streakAnalytics?: StreakAnalyticsService;
  private storagePaths?: ChronoMetricStoragePaths;

  public constructor(private readonly context: vscode.ExtensionContext) {}

  public async start(): Promise<void> {
    this.storagePaths = await this.initializeStoragePaths();

    this.configService = new ConfigService();
    this.statusBarController = new StatusBarController();
    this.persistenceService = new PersistenceService(this.storagePaths);
    this.gitWorkspaceResolver = new GitWorkspaceResolver();

    this.statusBarController.setInitializing();
    this.managedDisposables.push(this.configService, this.statusBarController, this.persistenceService, this.gitWorkspaceResolver);

    await this.persistenceService.start();

    const exclusionMatcher = new ExclusionMatcher(() => this.configService!.getSnapshot());
    const eventNormalizer = new EventNormalizer(this.gitWorkspaceResolver);
    this.eventTracker = new EventTracker(this.configService, this.persistenceService, exclusionMatcher, eventNormalizer);
    this.eventTracker.start();
    this.managedDisposables.push(this.eventTracker);

    this.gitTracker = new GitTracker(
      this.configService,
      this.persistenceService,
      this.gitWorkspaceResolver,
      new GitProcessRunner()
    );
    await this.gitTracker.start();
    this.managedDisposables.push(this.gitTracker);

    this.aggregationScheduler = new AggregationScheduler(this.configService, this.persistenceService);
    await this.aggregationScheduler.start();
    this.managedDisposables.push(this.aggregationScheduler);

    this.productivityAnalytics = new ProductivityAnalyticsService(this.persistenceService);
    this.sessionAnalytics = new SessionAnalyticsService(this.persistenceService);
    this.languageAnalytics = new LanguageAnalyticsService(this.persistenceService);
    this.streakAnalytics = new StreakAnalyticsService(this.persistenceService);

    const commandDisposables = CommandRegistrar.register(
      this.configService,
      this.aggregationScheduler,
      this.productivityAnalytics,
      this.sessionAnalytics,
      this.languageAnalytics,
      this.streakAnalytics
    );
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
    const todayStats = await this.productivityAnalytics.getTodayStats();
    this.statusBarController.setLiveSummary(todayStats);
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
