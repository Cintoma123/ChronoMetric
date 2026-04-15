import * as vscode from "vscode";
import { TrackedEventRecord } from "../storage/types";
import { GitWorkspaceResolver } from "../git/GitWorkspaceResolver";

interface BaseNormalizedEvent {
  eventType: string;
  filePath?: string;
  languageId?: string;
  lineDelta?: number;
  charDelta?: number;
  isFocus?: number;
  metadata?: Record<string, unknown>;
}

export class EventNormalizer {
  public constructor(private readonly workspaceResolver: GitWorkspaceResolver) {}

  public normalize(event: BaseNormalizedEvent): TrackedEventRecord {
    const workspaceFolder = event.filePath ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(event.filePath)) : undefined;
    const repoPath = this.workspaceResolver.resolveRepoForPath(event.filePath);

    return {
      ts: Date.now(),
      event_type: event.eventType,
      workspace_id: workspaceFolder?.uri.fsPath,
      repo_path: repoPath,
      file_path: event.filePath,
      language_id: event.languageId,
      line_delta: event.lineDelta ?? 0,
      char_delta: event.charDelta ?? 0,
      is_focus: event.isFocus ?? 1,
      metadata_json: JSON.stringify(event.metadata ?? {})
    };
  }
}
