import * as vscode from "vscode";
import type { QueryDump, QueryExecutionResult } from "../core/contracts";

export class ResultsPanel {
  private static currentPanel: ResultsPanel | undefined;
  private static readonly panelTitle = "NetPad Results";

  public static createOrShow(): ResultsPanel {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Beside;

    if (ResultsPanel.currentPanel) {
      ResultsPanel.currentPanel.panel.reveal(undefined, true);
      return ResultsPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel("netpadResults", ResultsPanel.panelTitle, column, {
      enableScripts: false,
      retainContextWhenHidden: true
    });

    ResultsPanel.currentPanel = new ResultsPanel(panel);
    return ResultsPanel.currentPanel;
  }

  private constructor(private readonly panel: vscode.WebviewPanel) {
    this.panel.onDidDispose(() => {
      ResultsPanel.currentPanel = undefined;
    });

    this.panel.webview.html = renderEmptyState();
  }

  public reveal(): void {
    this.panel.reveal(undefined, true);
  }

  public showResult(result: QueryExecutionResult): void {
    this.panel.title = ResultsPanel.panelTitle;
    this.panel.webview.html = renderResult(result);
  }
}

function renderEmptyState(): string {
  return wrapHtml(`
    <main class="shell empty-state">
      <p class="muted">Run a query to inspect the result.</p>
    </main>
  `);
}

function renderResult(result: QueryExecutionResult): string {
  const blocks: string[] = [];

  if (result.dumps.length > 0) {
    for (const dump of result.dumps) {
      blocks.push(renderDumpSection(dump));
    }
  }

  const stdout = result.stdout.trim();
  if (stdout.length > 0) {
    blocks.push(renderTextSection("Output", stdout));
  }

  const stderr = result.stderr.trim();
  if (stderr.length > 0) {
    blocks.push(renderTextSection("Diagnostics", stderr, true));
  }

  if (blocks.length === 0) {
    blocks.push(`<section class="card"><p class="muted">No output.</p></section>`);
  }

  return wrapHtml(`
    <main class="shell">
      <section class="stack">
        ${blocks.join("\n")}
      </section>
    </main>
  `);
}

function renderDumpSection(dump: QueryDump): string {
  const heading = escapeHtml(dump.label?.trim() || "Result");
  const parsed = tryParseJson(dump.json);

  if (parsed !== undefined) {
    const countBadge = Array.isArray(parsed) ? `<span class="count-badge">${parsed.length}</span>` : "";
    return `
      <section class="card dump-card">
        <div class="section-header compact-header">
          <h2>${heading}</h2>
          ${countBadge}
        </div>
        ${renderStructuredValue(parsed)}
      </section>
    `;
  }

  const text = escapeHtml((dump.text || dump.json || "").trim());
  return `
    <section class="card dump-card">
      <div class="section-header">
        <h2>${heading}</h2>
      </div>
      <pre class="code-block">${text}</pre>
    </section>
  `;
}

function renderStructuredValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `<p class="muted">Empty collection.</p>`;
    }

    if (value.every(isPlainRecord)) {
      return renderObjectTable(value as Array<Record<string, unknown>>);
    }

    return renderPrimitiveTable(value);
  }

  if (isPlainRecord(value)) {
    return renderKeyValueTable(value);
  }

  return `<div class="value-pill">${escapeHtml(stringifyValue(value))}</div>`;
}

function renderObjectTable(rows: Array<Record<string, unknown>>): string {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const totals = computeNumericTotals(rows, columns);
  const body = rows
    .map(
      (row) => `<tr>${columns
        .map((column) => `<td class="${isNumericValue(row[column]) ? "numeric-cell" : ""}">${escapeHtml(stringifyValue(row[column]))}</td>`)
        .join("")}</tr>`
    )
    .join("");

  const footer = totals.some((total) => total !== undefined)
    ? `<tfoot><tr>${totals
        .map((total) => `<td class="numeric-cell total-cell">${total === undefined ? "" : escapeHtml(formatNumber(total))}</td>`)
        .join("")}</tr></tfoot>`
    : "";

  return `<div class="table-wrap"><table class="result-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody>${footer}</table></div>`;
}

function renderKeyValueTable(record: Record<string, unknown>): string {
  const body = Object.entries(record)
    .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(stringifyValue(value))}</td></tr>`)
    .join("");

  return `<div class="table-wrap"><table class="kv-table"><tbody>${body}</tbody></table></div>`;
}

function renderPrimitiveTable(values: unknown[]): string {
  const body = values.map((value) => `<tr><td>${escapeHtml(stringifyValue(value))}</td></tr>`).join("");
  return `<div class="table-wrap"><table><tbody>${body}</tbody></table></div>`;
}

function renderTextSection(title: string, content: string, warning = false): string {
  return `
    <section class="card${warning ? " warning" : ""}">
      <div class="section-header">
        <h2>${escapeHtml(title)}</h2>
      </div>
      <pre class="code-block">${escapeHtml(content)}</pre>
    </section>
  `;
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      :root {
        color-scheme: light dark;
        --bg: var(--vscode-editor-background);
        --fg: var(--vscode-editor-foreground);
        --muted: var(--vscode-descriptionForeground);
        --accent: color-mix(in srgb, var(--vscode-textLink-foreground) 76%, #3f76c7 24%);
        --border: color-mix(in srgb, var(--vscode-panel-border) 90%, var(--accent) 10%);
        --surface: color-mix(in srgb, var(--bg) 98%, white 2%);
        --header: color-mix(in srgb, var(--accent) 78%, white 22%);
        --header-fg: white;
        --grid: color-mix(in srgb, var(--border) 75%, transparent 25%);
        --footer: color-mix(in srgb, var(--surface) 84%, var(--accent) 16%);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: "Segoe UI", "Aptos", system-ui, sans-serif;
      }

      .shell {
        max-width: 100%;
        margin: 0;
        padding: 10px;
      }

      .empty-state {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      h1, h2 {
        margin: 0;
        font-weight: 700;
      }

      h1 { font-size: 28px; }
      h2 { font-size: 14px; }

      .stack {
        display: grid;
        gap: 10px;
      }

      .card {
        border: 1px solid var(--border);
        border-radius: 0;
        background: var(--surface);
        overflow: hidden;
      }

      .dump-card {
        justify-self: start;
        width: fit-content;
        max-width: 100%;
      }

      .warning {
        border-color: color-mix(in srgb, #c96d00 55%, var(--border) 45%);
      }

      .section-header {
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
        background: color-mix(in srgb, var(--surface) 96%, var(--accent) 4%);
      }

      .compact-header {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-start;
        background: var(--header);
        color: var(--header-fg);
        border-bottom-color: color-mix(in srgb, black 15%, var(--header) 85%);
      }

      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 18px;
        padding: 0 6px;
        border: 1px solid color-mix(in srgb, white 55%, transparent 45%);
        border-radius: 2px;
        background: color-mix(in srgb, black 18%, transparent 82%);
        color: var(--header-fg);
        font-size: 11px;
        font-weight: 600;
      }

      .table-wrap {
        overflow: auto;
        display: inline-block;
        max-width: 100%;
      }

      table {
        width: max-content;
        min-width: 0;
        border-collapse: collapse;
      }

      th, td {
        padding: 3px 8px;
        border-bottom: 1px solid var(--grid);
        border-right: 1px solid var(--grid);
        text-align: left;
        vertical-align: top;
        font-size: 13px;
      }

      th {
        font-weight: 600;
        white-space: nowrap;
        background: color-mix(in srgb, var(--surface) 92%, var(--accent) 8%);
      }

      thead th:last-child,
      tbody td:last-child,
      tfoot td:last-child {
        border-right: 0;
      }

      .result-table tfoot td {
        background: var(--footer);
        color: color-mix(in srgb, var(--fg) 85%, var(--accent) 15%);
        border-bottom: 0;
      }

      .numeric-cell {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .total-cell {
        color: color-mix(in srgb, var(--fg) 78%, var(--accent) 22%);
      }

      .kv-table th {
        width: 1%;
      }

      .code-block {
        margin: 0;
        padding: 10px;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: "Cascadia Code", "Consolas", monospace;
        line-height: 1.45;
        font-size: 12px;
        background: color-mix(in srgb, var(--surface) 96%, black 4%);
      }

      .value-pill {
        padding: 12px 10px;
        font-size: 20px;
        font-weight: 500;
      }

      .muted {
        margin: 0;
        padding: 10px;
        color: var(--muted);
        font-size: 12px;
      }

      @media (max-width: 720px) {
        .shell { padding: 6px; }
        th, td { padding: 4px 6px; }
      }
    </style>
  </head>
  <body>${body}</body>
  </html>`;
}

function computeNumericTotals(rows: Array<Record<string, unknown>>, columns: string[]): Array<number | undefined> {
  return columns.map((column) => {
    const values = rows.map((row) => row[column]);
    if (values.length === 0 || !values.every(isNumericValue)) {
      return undefined;
    }

    return values.reduce((sum, value) => sum + Number(value), 0);
  });
}

function tryParseJson(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isNumericValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}