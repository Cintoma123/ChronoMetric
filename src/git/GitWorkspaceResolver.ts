import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

export class GitWorkspaceResolver implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly repoRoots = new Set<string>();

  public constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        void this.refresh();
      })
    );
  }

  public async refresh(): Promise<void> {
    this.repoRoots.clear();
    const folders = vscode.workspace.workspaceFolders ?? [];

    for (const folder of folders) {
      const root = await this.findGitRoot(folder.uri.fsPath);
      if (root) {
        this.repoRoots.add(this.normalizePath(root));
      }
    }
  }

  public getRepoRoots(): string[] {
    return Array.from(this.repoRoots.values());
  }

  public resolveRepoForPath(fsPath: string | undefined): string | undefined {
    if (!fsPath) {
      return undefined;
    }

    const normalizedPath = this.normalizePath(fsPath);
    let bestMatch: string | undefined;

    for (const repoRoot of this.repoRoots.values()) {
      if (!normalizedPath.startsWith(repoRoot)) {
        continue;
      }

      if (!bestMatch || repoRoot.length > bestMatch.length) {
        bestMatch = repoRoot;
      }
    }

    return bestMatch;
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.repoRoots.clear();
  }

  private async findGitRoot(startPath: string): Promise<string | undefined> {
    let current = path.resolve(startPath);

    while (true) {
      const gitPath = path.join(current, ".git");
      if (await this.exists(gitPath)) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }

    return undefined;
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private normalizePath(input: string): string {
    const normalized = path.resolve(input).replace(/\\/g, "/");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }
}
