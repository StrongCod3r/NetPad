import * as vscode from "vscode";
import type { QueryExecutionInput } from "./core/contracts";
import { ResultsOutput } from "./output/resultsOutput";
import { QueryRunner } from "./core/queryRunner";
import { ResultsPanel } from "./panels/resultsPanel";
import { createPersistentQueryFile, isNetPadQueryUri } from "./queries/queryFiles";
import { QueryExplorerProvider, QueryFileNode } from "./queries/queryExplorer";
import { ensureQueryLanguageServiceSupport, ensureWorkspaceQueryLanguageServiceSupport } from "./queries/querySupport";

export function activate(context: vscode.ExtensionContext): void {
  const runner = new QueryRunner();
  const resultsOutput = new ResultsOutput();
  const queryExplorerProvider = new QueryExplorerProvider();
  const queryExplorerView = vscode.window.createTreeView("netpadQueries", {
    treeDataProvider: queryExplorerProvider,
    showCollapseAll: true
  });
  const playButton = createRunStatusBarItem();

  context.subscriptions.push(resultsOutput, playButton, queryExplorerProvider, queryExplorerView);

  updateRunStatusBarItem(playButton, vscode.window.activeTextEditor);

  void ensureWorkspaceQueryLanguageServiceSupport();

  for (const document of vscode.workspace.textDocuments) {
    void ensureNetPadDocumentLanguage(document);
    void ensureQuerySupportForDocument(document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      void ensureNetPadDocumentLanguage(document);
      void ensureQuerySupportForDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateRunStatusBarItem(playButton, editor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(() => {
      updateRunStatusBarItem(playButton, vscode.window.activeTextEditor);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.newQuery", async () => {
      await openScratchQuery();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.newQueryFile", async () => {
      const fileUri = await createPersistentQueryFile(defaultQueryTemplate());

      if (!fileUri) {
        await openScratchQuery();
        void vscode.window.showInformationMessage(
          "No workspace folder is open, so NetPad created an untitled scratch query instead."
        );
        return;
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.One
      });

      void vscode.window.showInformationMessage(
        `NetPad created ${vscode.workspace.asRelativePath(fileUri)}.`
      );

      queryExplorerProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.refreshQueries", () => {
      queryExplorerProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.openQueryFile", async (target?: QueryFileNode | vscode.Uri) => {
      const queryUri = extractQueryUri(target);

      if (!queryUri) {
        void vscode.window.showInformationMessage("Select a NetPad query file before trying to open it.");
        return;
      }

      const document = await vscode.workspace.openTextDocument(queryUri);
      await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.One
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.runQueryFile", async (target?: QueryFileNode | vscode.Uri) => {
      const queryUri = extractQueryUri(target);

      if (!queryUri) {
        void vscode.window.showInformationMessage("Select a NetPad query file before trying to run it.");
        return;
      }

      await vscode.commands.executeCommand("netpad.openQueryFile", queryUri);

      await vscode.commands.executeCommand("netpad.runQuery");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.showResults", () => {
      ResultsPanel.createOrShow().reveal();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.showTextResults", () => {
      resultsOutput.reveal();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("netpad.runQuery", async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        void vscode.window.showInformationMessage("Open a C# query or snippet before running NetPad.");
        return;
      }

      const selection = editor.selection;
      const selectionUsed = !selection.isEmpty;
      const query = selectionUsed ? editor.document.getText(selection) : editor.document.getText();
      const executionInput: QueryExecutionInput = {
        title: editor.document.fileName ? vscode.workspace.asRelativePath(editor.document.uri) : "Scratch Query",
        query,
        languageId: editor.document.languageId,
        sourceUri: editor.document.uri.scheme === "untitled" ? undefined : editor.document.uri.toString()
      };

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "NetPad is executing the query",
          cancellable: false
        },
        async () => await runner.run(executionInput, selectionUsed)
      );

      resultsOutput.showResult(result);
      ResultsPanel.createOrShow().showResult(result);

      void vscode.window.showInformationMessage(
        result.outcome === "error"
          ? `NetPad finished with diagnostics for ${selectionUsed ? "the selection" : "the document"}.`
          : `NetPad executed ${selectionUsed ? "the current selection" : "the active document"}.`
      );
    })
  );
}

export function deactivate(): void {}

function createRunStatusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.name = "NetPad Run Query";
  item.command = "netpad.runQuery";
  item.text = "$(play) Run Query";
  item.tooltip = "Run the current NetPad query";
  return item;
}

function updateRunStatusBarItem(item: vscode.StatusBarItem, editor: vscode.TextEditor | undefined): void {
  if (canRunQueryFromEditor(editor)) {
    item.show();
    return;
  }

  item.hide();
}

function canRunQueryFromEditor(editor: vscode.TextEditor | undefined): boolean {
  if (!editor) {
    return false;
  }

  const { document } = editor;
  return isNetPadQueryUri(document.uri) || document.uri.scheme === "untitled" || document.languageId === "csharp";
}

async function ensureNetPadDocumentLanguage(document: vscode.TextDocument): Promise<void> {
  if (!isNetPadQueryUri(document.uri) || document.languageId === "csharp") {
    return;
  }

  await vscode.languages.setTextDocumentLanguage(document, "csharp");
}

async function ensureQuerySupportForDocument(document: vscode.TextDocument): Promise<void> {
  if (!isNetPadQueryUri(document.uri)) {
    return;
  }

  await ensureQueryLanguageServiceSupport(document.uri);
}

async function openScratchQuery(): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: "csharp",
    content: defaultQueryTemplate()
  });

  await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.One
  });
}

function defaultQueryTemplate(): string {
  return [
    "using System;",
    "using System.Linq;",
    "",
    "var numbers = Enumerable.Range(1, 8)",
    "    .Select(n => new { Number = n, Square = n * n })",
    "    .ToArray();",
    "",
    "Console.WriteLine($\"Generated {numbers.Length} rows\");",
    "",
    "numbers.Dump(\"Squares\");"
  ].join("\n");
}

function extractQueryUri(target?: QueryFileNode | vscode.Uri): vscode.Uri | undefined {
  if (!target) {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    return activeUri && isNetPadQueryUri(activeUri) ? activeUri : undefined;
  }

  if (target instanceof vscode.Uri) {
    return isNetPadQueryUri(target) ? target : undefined;
  }

  return target.uri;
}