import * as path from "node:path";
import * as vscode from "vscode";
import { listPersistentQueryFiles, queryFileExtension } from "./queryFiles";

export type QueryExplorerNode = QueryWorkspaceNode | QueryFileNode;

export class QueryExplorerProvider implements vscode.TreeDataProvider<QueryExplorerNode>, vscode.Disposable {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<QueryExplorerNode | undefined>();
  private readonly disposables: vscode.Disposable[];

  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher("**/queries/**/*.npad.cs");

    this.disposables = [
      watcher,
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidChange(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh())
    ];
  }

  public dispose(): void {
    vscode.Disposable.from(...this.disposables).dispose();
    this.onDidChangeTreeDataEmitter.dispose();
  }

  public refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  public async getChildren(element?: QueryExplorerNode): Promise<QueryExplorerNode[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

    if (!element) {
      if (workspaceFolders.length <= 1) {
        const folder = workspaceFolders[0];
        return folder ? await this.getQueryFileNodes(folder) : [];
      }

      return await Promise.all(workspaceFolders.map(async (workspaceFolder) => await this.getWorkspaceNode(workspaceFolder)));
    }

    if (element instanceof QueryWorkspaceNode) {
      return await this.getQueryFileNodes(element.workspaceFolder);
    }

    return [];
  }

  public getTreeItem(element: QueryExplorerNode): vscode.TreeItem {
    if (element instanceof QueryWorkspaceNode) {
      const item = new vscode.TreeItem(
        element.workspaceFolder.name,
        element.queryCount > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None
      );

      item.description = element.queryCount === 0 ? "No queries" : `${element.queryCount} query${element.queryCount === 1 ? "" : "ies"}`;
      item.contextValue = "workspaceFolder";
      item.iconPath = new vscode.ThemeIcon("folder-library");
      return item;
    }

    const item = new vscode.TreeItem(element.uri, vscode.TreeItemCollapsibleState.None);
    item.label = element.label;
    item.description = element.description;
    item.tooltip = vscode.workspace.asRelativePath(element.uri, false);
    item.contextValue = "queryFile";
    item.resourceUri = element.uri;
    item.command = {
      command: "netpad.openQueryFile",
      title: "Open NetPad Query",
      arguments: [element.uri]
    };
    item.iconPath = new vscode.ThemeIcon("symbol-file");
    return item;
  }

  private async getWorkspaceNode(workspaceFolder: vscode.WorkspaceFolder): Promise<QueryWorkspaceNode> {
    const files = await listPersistentQueryFiles(workspaceFolder);
    return new QueryWorkspaceNode(workspaceFolder, files.length);
  }

  private async getQueryFileNodes(workspaceFolder: vscode.WorkspaceFolder): Promise<QueryFileNode[]> {
    const files = await listPersistentQueryFiles(workspaceFolder);
    return files.map((uri) => new QueryFileNode(uri, workspaceFolder));
  }
}

export class QueryWorkspaceNode {
  public constructor(
    public readonly workspaceFolder: vscode.WorkspaceFolder,
    public readonly queryCount: number
  ) {}
}

export class QueryFileNode {
  public readonly label: string;
  public readonly description: string;

  public constructor(
    public readonly uri: vscode.Uri,
    workspaceFolder: vscode.WorkspaceFolder
  ) {
    this.label = path.basename(uri.fsPath, queryFileExtension);

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const workspacePrefix = `${workspaceFolder.name}/`;
    this.description = relativePath.startsWith(workspacePrefix)
      ? relativePath.slice(workspacePrefix.length)
      : relativePath;
  }
}