import * as vscode from "vscode";
import { ConfigService } from "../core/config/ConfigService";
import { PersistenceService } from "../storage/PersistenceService";
import { ExclusionMatcher } from "./ExclusionMatcher";
import { EventNormalizer } from "./EventNormalizer";

export class EventTracker implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  public constructor(
    private readonly configService: ConfigService,
    private readonly persistenceService: PersistenceService,
    private readonly exclusionMatcher: ExclusionMatcher,
    private readonly normalizer: EventNormalizer
  ) {}

  public start(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
          return;
        }

        void this.captureEvent({
          eventType: "active_editor_change",
          filePath: editor.document.uri.fsPath,
          languageId: editor.document.languageId,
          metadata: {
            viewColumn: editor.viewColumn
          }
        });
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        const lineDelta = event.contentChanges.reduce((sum, change) => {
          return sum + (change.text.match(/\n/g)?.length ?? 0) - (change.range.end.line - change.range.start.line);
        }, 0);
        const charDelta = event.contentChanges.reduce((sum, change) => sum + change.text.length - change.rangeLength, 0);

        void this.captureEvent({
          eventType: "document_change",
          filePath: document.uri.fsPath,
          languageId: document.languageId,
          lineDelta,
          charDelta,
          metadata: {
            changeCount: event.contentChanges.length
          }
        });
      })
    );

    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        void this.captureEvent({
          eventType: "document_save",
          filePath: document.uri.fsPath,
          languageId: document.languageId,
          metadata: {
            version: document.version
          }
        });
      })
    );

    this.disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        void this.captureEvent({
          eventType: "window_focus_change",
          isFocus: state.focused ? 1 : 0,
          metadata: {
            focused: state.focused
          }
        });
      })
    );
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  private async captureEvent(input: {
    eventType: string;
    filePath?: string;
    languageId?: string;
    lineDelta?: number;
    charDelta?: number;
    isFocus?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const config = this.configService.getSnapshot();
    if (config.pauseTracking) {
      return;
    }

    const normalized = this.normalizer.normalize(input);
    if (this.exclusionMatcher.isExcluded(normalized.file_path, normalized.repo_path)) {
      return;
    }

    await this.persistenceService.events.insert(normalized);
  }
}
