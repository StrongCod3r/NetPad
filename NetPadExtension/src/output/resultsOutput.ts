import * as vscode from "vscode";
import type { QueryDump, QueryExecutionResult } from "../core/contracts";

export class ResultsOutput implements vscode.Disposable {
  private readonly channel = vscode.window.createOutputChannel("NetPad Results");

  public dispose(): void {
    this.channel.dispose();
  }

  public reveal(preserveFocus = false): void {
    this.channel.show(preserveFocus);
  }

  public showResult(result: QueryExecutionResult): void {
    this.channel.clear();
    this.channel.append(formatResult(result));
  }
}

function formatResult(result: QueryExecutionResult): string {
  if (result.outcome === "empty") {
    return "No output.\n";
  }

  const sections: string[] = [];
  const dumps = result.dumps.map((dump, index) => formatDump(dump, result.dumps.length > 1, index));
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  if (dumps.length > 0) {
    sections.push(dumps.join("\n\n"));
  }

  if (stdout.length > 0) {
    sections.push(stdout);
  }

  if (stderr.length > 0) {
    sections.push(stderr);
  }

  if (sections.length === 0) {
    return result.outcome === "error" ? "Execution failed.\n" : "No output.\n";
  }

  return `${sections.join("\n\n")}\n`;
}

function formatDump(dump: QueryDump, includeLabel: boolean, index: number): string {
  const content = (dump.json ?? dump.text).trim();
  if (!includeLabel) {
    return content;
  }

  const label = dump.label?.trim().length ? dump.label.trim() : `Result ${index + 1}`;
  return content.length > 0 ? `${label}\n${content}` : label;
}