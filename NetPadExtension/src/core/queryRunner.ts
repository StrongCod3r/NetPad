import { createHash } from "node:crypto";
import * as vscode from "vscode";
import type { ExecutionMode, QueryExecutionInput, QueryExecutionResult } from "./contracts";
import { runTemporaryProjectQuery } from "./temporaryProjectRunner";

export class QueryRunner {
  public async run(input: QueryExecutionInput, selectionUsed: boolean): Promise<QueryExecutionResult> {
    const startedAt = new Date();
    const mode = this.getExecutionMode();
    const normalizedQuery = input.query.trim();

    const lines = normalizedQuery.length === 0 ? 0 : normalizedQuery.split(/\r?\n/).length;
    const characters = normalizedQuery.length;
    const hash = createHash("sha1").update(input.query).digest("hex").slice(0, 10);

    if (characters === 0) {
      return {
        id: hash,
        title: input.title,
        query: input.query,
        languageId: input.languageId,
        mode,
        engine: "temporaryProject",
        outcome: "empty",
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        selectionUsed,
        sourceUri: input.sourceUri,
        exitCode: 0,
        summary: "The query is empty. Add C# code or select a snippet before running NetPad.",
        nextStep: "Write a C# statement block, call Dump(value), or end with a single-line expression that NetPad can capture automatically.",
        metrics: [
          { label: "Mode", value: mode },
          { label: "Engine", value: "temporaryProject" },
          { label: "Lines", value: String(lines) },
          { label: "Characters", value: String(characters) },
          { label: "Fingerprint", value: hash }
        ],
        notes: [
          mode === "script"
            ? "Script mode is selected, but the first real backend is the temporary-project runner."
            : "Temporary project mode is selected."
        ],
        dumps: [],
        stdout: "",
        stderr: ""
      };
    }

    const execution = await runTemporaryProjectQuery(input.query);
    const durationMs = Date.now() - startedAt.getTime();
    const outcome = execution.exitCode === 0 ? "success" : "error";
    const notes = this.buildNotes(input.query, mode, execution.autoCapturedLastExpression, execution.stdout, execution.stderr);

    return {
      id: hash,
      title: input.title,
      query: input.query,
      languageId: input.languageId,
      mode,
      engine: execution.engine,
      outcome,
      startedAt: startedAt.toISOString(),
      durationMs,
      selectionUsed,
      sourceUri: input.sourceUri,
      exitCode: execution.exitCode,
      summary: this.buildSummary(mode, outcome, execution.dumps.length),
      nextStep: this.buildNextStep(mode, outcome, execution.dumps.length),
      metrics: [
        { label: "Mode", value: mode },
        { label: "Engine", value: execution.engine },
        { label: "Lines", value: String(lines) },
        { label: "Characters", value: String(characters) },
        { label: "Exit code", value: String(execution.exitCode) },
        { label: "Fingerprint", value: hash }
      ],
      notes,
      dumps: execution.dumps,
      stdout: execution.stdout,
      stderr: execution.stderr
    };
  }

  private getExecutionMode(): ExecutionMode {
    return vscode.workspace.getConfiguration("netpad").get<ExecutionMode>("executionMode", "temporaryProject");
  }

  private buildSummary(mode: ExecutionMode, outcome: QueryExecutionResult["outcome"], dumpCount: number): string {
    if (outcome === "error") {
      return mode === "script"
        ? "Script mode currently falls back to the temporary-project engine, and that execution failed."
        : "The temporary-project execution failed. Review the compiler or runtime output below.";
    }

    if (mode === "script") {
      return dumpCount > 0
        ? `Script mode currently falls back to the temporary-project engine and captured ${dumpCount} structured result${dumpCount === 1 ? "" : "s"}.`
        : "Script mode currently falls back to the temporary-project engine and completed without a structured dump.";
    }

    return dumpCount > 0
      ? `The temporary-project engine completed and captured ${dumpCount} structured result${dumpCount === 1 ? "" : "s"}.`
      : "The temporary-project engine completed, but no structured dump payload was emitted.";
  }

  private buildNextStep(
    mode: ExecutionMode,
    outcome: QueryExecutionResult["outcome"],
    dumpCount: number
  ): string {
    if (outcome === "error") {
      return mode === "script"
        ? "Fix the query error or switch to temporary-project mode explicitly while the script backend is still pending."
        : "Fix the compile/runtime error, then rerun the query to confirm the temporary-project pipeline end to end.";
    }

    if (dumpCount === 0) {
      return "Call Dump(value) or end the query with a single-line expression so NetPad can capture a structured result automatically.";
    }

    return mode === "script"
      ? "Implement a real Roslyn/script backend so script mode stops relying on the temporary-project fallback."
      : "Extend the dump renderer to show tables, exceptions, nested objects, and richer interactive inspection.";
  }

  private buildNotes(
    query: string,
    mode: ExecutionMode,
    autoCapturedLastExpression: boolean,
    stdout: string,
    stderr: string
  ): string[] {
    const notes: string[] = [];

    if (/\.Dump\s*\(/.test(query)) {
      notes.push("Detected a Dump-style call. The temporary-project host now captures it as a structured result payload.");
    }

    if (/using\s+System\.Linq\s*;/.test(query)) {
      notes.push("The query already references System.Linq, which matches the LINQPad-style exploration flow.");
    }

    if (autoCapturedLastExpression) {
      notes.push("NetPad auto-captured the last single-line expression by rewriting it into Dump(..., \"Result\").");
    }

    notes.push(
      mode === "script"
        ? "Script mode is selected, but this slice still executes through the temporary-project backend as a fallback."
        : "Temporary project mode is selected, so the next implementation should optimize project generation, caching, and cleanup."
    );

    if (stdout.length > 0) {
      notes.push("The query emitted standard output in addition to any structured dumps.");
    }

    if (stderr.length > 0) {
      notes.push("The query emitted compiler or runtime diagnostics. Review the stderr section below.");
    }

    return notes;
  }
}