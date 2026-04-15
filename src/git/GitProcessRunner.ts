import { spawn } from "child_process";

export interface GitProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class GitProcessRunner {
  public async run(repoPath: string, args: string[], timeoutMs: number = 20000): Promise<GitProcessResult> {
    return new Promise<GitProcessResult>((resolve, reject) => {
      const child = spawn("git", args, {
        cwd: repoPath,
        windowsHide: true
      });

      let stdout = "";
      let stderr = "";
      let completed = false;

      const timeout = setTimeout(() => {
        if (completed) {
          return;
        }

        completed = true;
        child.kill();
        reject(new Error(`Git command timed out after ${timeoutMs}ms: git ${args.join(" ")}`));
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        if (completed) {
          return;
        }

        completed = true;
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code) => {
        if (completed) {
          return;
        }

        completed = true;
        clearTimeout(timeout);
        resolve({ stdout, stderr, exitCode: code ?? -1 });
      });
    });
  }
}
