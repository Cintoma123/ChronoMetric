import * as path from "path";
import { ChronoMetricConfig } from "../core/types";

export class ExclusionMatcher {
  public constructor(private readonly getConfig: () => ChronoMetricConfig) {}

  public isExcluded(filePath: string | undefined, repoPath: string | undefined): boolean {
    const config = this.getConfig();

    if (this.isExcludedRepo(repoPath, config.excludedRepos)) {
      return true;
    }

    if (!filePath) {
      return false;
    }

    const normalizedFilePath = this.normalizePath(filePath);
    return config.excludedGlobs.some((glob) => this.matchesGlob(normalizedFilePath, glob));
  }

  private isExcludedRepo(repoPath: string | undefined, excludedRepos: string[]): boolean {
    if (!repoPath) {
      return false;
    }

    const normalizedRepo = this.normalizePath(repoPath);
    return excludedRepos.some((candidate) => {
      const normalizedCandidate = this.normalizePath(candidate);
      return (
        normalizedRepo === normalizedCandidate ||
        normalizedRepo.startsWith(`${normalizedCandidate}/`)
      );
    });
  }

  private matchesGlob(filePath: string, globPattern: string): boolean {
    const normalizedPattern = globPattern.replace(/\\/g, "/").toLowerCase();
    const escaped = normalizedPattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "@@DOUBLE_STAR@@")
      .replace(/\*/g, "[^/]*")
      .replace(/@@DOUBLE_STAR@@/g, ".*")
      .replace(/\?/g, "[^/]");

    const regex = new RegExp(`^${escaped}$`, "i");
    return regex.test(filePath);
  }

  private normalizePath(input: string): string {
    return path.resolve(input).replace(/\\/g, "/").toLowerCase();
  }
}
