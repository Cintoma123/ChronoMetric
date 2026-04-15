import * as vscode from "vscode";
import { ConfigService } from "../core/config/ConfigService";
import { PersistenceService } from "../storage/PersistenceService";
import { GitProcessRunner } from "./GitProcessRunner";
import { GitWorkspaceResolver } from "./GitWorkspaceResolver";

interface PendingCommit {
  commit_hash: string;
  authored_ts: number;
  author_name?: string;
  author_email?: string;
  message?: string;
  insertions: number;
  deletions: number;
  files_changed: number;
}

export class GitTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly lastPolledEpochSeconds = new Map<string, number>();
  private pollHandle?: NodeJS.Timeout;

  public constructor(
    private readonly configService: ConfigService,
    private readonly persistenceService: PersistenceService,
    private readonly workspaceResolver: GitWorkspaceResolver,
    private readonly processRunner: GitProcessRunner
  ) {}

  public async start(): Promise<void> {
    await this.workspaceResolver.refresh();
    await this.pollNow();
    this.schedulePolling();

    this.disposables.push(
      this.configService.onDidChange(() => {
        this.schedulePolling();
      })
    );
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;

    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
    }
  }

  private schedulePolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = undefined;
    }

    const config = this.configService.getSnapshot();
    const intervalMs = Math.max(1, config.gitPollingMinutes) * 60 * 1000;

    this.pollHandle = setInterval(() => {
      void this.pollNow();
    }, intervalMs);
  }

  private async pollNow(): Promise<void> {
    const config = this.configService.getSnapshot();
    if (config.pauseTracking) {
      return;
    }

    await this.workspaceResolver.refresh();
    const repoRoots = this.workspaceResolver.getRepoRoots();

    for (const repoPath of repoRoots) {
      try {
        await this.pollRepo(repoPath);
      } catch (error) {
        console.warn(`ChronoMetric git polling failed for ${repoPath}`, error);
      }
    }
  }

  private async pollRepo(repoPath: string): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sinceSeconds = this.lastPolledEpochSeconds.get(repoPath) ?? nowSeconds - 6 * 60 * 60;
    const sinceIso = new Date(sinceSeconds * 1000).toISOString();

    const result = await this.processRunner.run(
      repoPath,
      ["log", `--since=${sinceIso}`, "--pretty=format:%H|%at|%an|%ae|%s", "--numstat"],
      30000
    );

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `git exited with code ${result.exitCode}`);
    }

    const commits = this.parseGitLog(result.stdout);

    for (const commit of commits) {
      await this.persistenceService.gitCommits.upsertCommit({
        repo_path: repoPath,
        ...commit
      });
    }

    this.lastPolledEpochSeconds.set(repoPath, nowSeconds);
  }

  private parseGitLog(stdout: string): PendingCommit[] {
    const lines = stdout.split(/\r?\n/);
    const commits: PendingCommit[] = [];
    let current: PendingCommit | undefined;

    for (const line of lines) {
      if (!line) {
        continue;
      }

      const headerMatch = line.match(/^([0-9a-f]{7,40})\|(\d+)\|([^|]*)\|([^|]*)\|(.*)$/);
      if (headerMatch) {
        const commitHash = headerMatch[1];
        const authoredTs = headerMatch[2];
        if (!commitHash || !authoredTs) {
          continue;
        }

        if (current) {
          commits.push(current);
        }

        current = {
          commit_hash: commitHash,
          authored_ts: Number(authoredTs) * 1000,
          author_name: headerMatch[3] || undefined,
          author_email: headerMatch[4] || undefined,
          message: headerMatch[5] || undefined,
          insertions: 0,
          deletions: 0,
          files_changed: 0
        };
        continue;
      }

      if (!current) {
        continue;
      }

      const numStatMatch = line.match(/^([0-9-]+)\s+([0-9-]+)\s+/);
      if (!numStatMatch) {
        continue;
      }

      current.files_changed += 1;
      if (numStatMatch[1] !== "-") {
        current.insertions += Number(numStatMatch[1]);
      }
      if (numStatMatch[2] !== "-") {
        current.deletions += Number(numStatMatch[2]);
      }
    }

    if (current) {
      commits.push(current);
    }

    return commits;
  }
}
