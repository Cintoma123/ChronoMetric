import * as vscode from "vscode";
import { ChronoMetricStoragePaths } from "../core/types";
import { DatabaseManager } from "./DatabaseManager";
import { PersistenceMode } from "./types";
import { BreakRepository } from "./repositories/BreakRepository";
import { EventRepository } from "./repositories/EventRepository";
import { GitCommitRepository } from "./repositories/GitCommitRepository";
import { GoalRepository } from "./repositories/GoalRepository";
import { SessionRepository } from "./repositories/SessionRepository";
import { StatsRepository } from "./repositories/StatsRepository";

export class PersistenceService implements vscode.Disposable {
  private readonly databaseManager: DatabaseManager;

  public readonly events: EventRepository;
  public readonly sessions: SessionRepository;
  public readonly stats: StatsRepository;
  public readonly goals: GoalRepository;
  public readonly breaks: BreakRepository;
  public readonly gitCommits: GitCommitRepository;

  public constructor(storagePaths: ChronoMetricStoragePaths) {
    this.databaseManager = new DatabaseManager(storagePaths);
    this.events = new EventRepository(this.databaseManager);
    this.sessions = new SessionRepository(this.databaseManager);
    this.stats = new StatsRepository(this.databaseManager);
    this.goals = new GoalRepository(this.databaseManager);
    this.breaks = new BreakRepository(this.databaseManager);
    this.gitCommits = new GitCommitRepository(this.databaseManager);
  }

  public async start(): Promise<void> {
    await this.databaseManager.initialize();
  }

  public getMode(): PersistenceMode {
    return this.databaseManager.getMode();
  }

  public dispose(): void {
    this.databaseManager.dispose();
  }
}
