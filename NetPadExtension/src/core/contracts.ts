export type ExecutionMode = "script" | "temporaryProject";

export type ExecutionEngine = "temporaryProject";

export type QueryOutcome = "success" | "error" | "empty";

export interface QueryExecutionInput {
  title: string;
  query: string;
  languageId: string;
  sourceUri?: string;
}

export interface QueryMetric {
  label: string;
  value: string;
}

export interface QueryDump {
  label?: string;
  type: string;
  text: string;
  json?: string;
}

export interface QueryExecutionResult {
  id: string;
  title: string;
  query: string;
  languageId: string;
  mode: ExecutionMode;
  engine: ExecutionEngine;
  outcome: QueryOutcome;
  startedAt: string;
  durationMs: number;
  selectionUsed: boolean;
  sourceUri?: string;
  exitCode: number;
  summary: string;
  nextStep: string;
  metrics: QueryMetric[];
  notes: string[];
  dumps: QueryDump[];
  stdout: string;
  stderr: string;
}