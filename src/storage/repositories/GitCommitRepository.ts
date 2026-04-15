import { DatabaseManager } from "../DatabaseManager";
import { GitCommitRecord } from "../types";

export class GitCommitRepository {
  public constructor(private readonly database: DatabaseManager) {}

  public async upsertCommit(record: GitCommitRecord): Promise<number> {
    return this.database.upsert("git_commits", ["repo_path", "commit_hash"], {
      insertions: 0,
      deletions: 0,
      files_changed: 0,
      ...record
    });
  }

  public async listAll(): Promise<GitCommitRecord[]> {
    return this.database.list<GitCommitRecord>("git_commits");
  }
}
