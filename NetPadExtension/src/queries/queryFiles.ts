import * as vscode from "vscode";
import { ensureQueryLanguageServiceSupport } from "./querySupport";

export const queryFolderName = "queries";
export const queryFileExtension = ".npad.cs";

export async function createPersistentQueryFile(template: string): Promise<vscode.Uri | undefined> {
  const workspaceFolder = await resolveTargetWorkspaceFolder();

  if (!workspaceFolder) {
    return undefined;
  }

  const queriesDirectory = vscode.Uri.joinPath(workspaceFolder.uri, queryFolderName);
  await vscode.workspace.fs.createDirectory(queriesDirectory);

  const fileUri = await createUniqueQueryUri(queriesDirectory);
  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(template, "utf8"));
  await ensureQueryLanguageServiceSupport(fileUri);

  return fileUri;
}

export async function listPersistentQueryFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
  const queriesDirectory = vscode.Uri.joinPath(workspaceFolder.uri, queryFolderName);

  if (!(await fileExists(queriesDirectory))) {
    return [];
  }

  return await collectQueryFiles(queriesDirectory);
}

export function isNetPadQueryUri(uri: vscode.Uri): boolean {
  return uri.scheme === "file" && uri.fsPath.toLowerCase().endsWith(queryFileExtension);
}

async function resolveTargetWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  const activeEditorUri = vscode.window.activeTextEditor?.document.uri;

  if (activeEditorUri) {
    const activeWorkspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditorUri);

    if (activeWorkspaceFolder) {
      return activeWorkspaceFolder;
    }
  }

  if (workspaceFolders.length === 1) {
    return workspaceFolders[0];
  }

  const selectedFolder = await vscode.window.showWorkspaceFolderPick({
    placeHolder: "Select the workspace folder where NetPad should create the query file"
  });

  return selectedFolder;
}

async function createUniqueQueryUri(queriesDirectory: vscode.Uri): Promise<vscode.Uri> {
  for (let index = 1; index <= 999; index += 1) {
    const candidate = vscode.Uri.joinPath(queriesDirectory, `Query${index}${queryFileExtension}`);

    if (!(await fileExists(candidate))) {
      return candidate;
    }
  }

  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  return vscode.Uri.joinPath(queriesDirectory, `Query-${timestamp}${queryFileExtension}`);
}

async function collectQueryFiles(directory: vscode.Uri): Promise<vscode.Uri[]> {
  const entries = await vscode.workspace.fs.readDirectory(directory);
  const sortedEntries = [...entries].sort((left, right) => left[0].localeCompare(right[0]));
  const files: vscode.Uri[] = [];

  for (const [name, type] of sortedEntries) {
    const entryUri = vscode.Uri.joinPath(directory, name);

    if (type === vscode.FileType.Directory) {
      files.push(...(await collectQueryFiles(entryUri)));
      continue;
    }

    if (type === vscode.FileType.File && isNetPadQueryUri(entryUri)) {
      files.push(entryUri);
    }
  }

  return files;
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}