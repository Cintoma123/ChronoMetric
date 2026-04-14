import * as vscode from "vscode";
import { ServiceContainer } from "./core/ServiceContainer";

let container: ServiceContainer | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  container = new ServiceContainer(context);

  try {
    await container.start();
    context.subscriptions.push(container);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showErrorMessage(`ChronoMetric failed to start: ${message}`);
    container.dispose();
    container = undefined;
  }
}

export function deactivate(): void {
  container?.dispose();
  container = undefined;
}
