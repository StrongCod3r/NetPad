import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import type { QueryDump } from "./contracts";
import { tryGetNetPadLibraryProjectPath } from "../netPadLibraryProject";

const resultStartMarker = "__NETPAD_RESULT_START__";
const resultEndMarker = "__NETPAD_RESULT_END__";
const executionTimeoutMs = 30_000;

export interface TemporaryProjectExecution {
  engine: "temporaryProject";
  exitCode: number;
  stdout: string;
  stderr: string;
  dumps: QueryDump[];
  autoCapturedLastExpression: boolean;
}

interface PreparedQuery {
  usings: string[];
  body: string;
  autoCapturedLastExpression: boolean;
}

interface RawDump {
  label?: string;
  type?: string;
  text?: string;
  json?: string;
  Label?: string;
  Type?: string;
  Text?: string;
  Json?: string;
}

interface RawEnvelope {
  dumps?: RawDump[];
  Dumps?: RawDump[];
}

export async function runTemporaryProjectQuery(query: string): Promise<TemporaryProjectExecution> {
  const tempRoot = await mkdtemp(join(tmpdir(), "netpad-"));
  const projectPath = join(tempRoot, "NetPadQuery.csproj");
  const programPath = join(tempRoot, "Program.cs");
  const libraryProjectPath = tryGetNetPadLibraryProjectPath();
  const prepared = prepareQuery(query, Boolean(libraryProjectPath));

  try {
    await writeFile(projectPath, buildProjectFile(projectPath, libraryProjectPath), "utf8");
    await writeFile(programPath, buildProgramSource(prepared, Boolean(libraryProjectPath)), "utf8");

    const execution = await runDotnet(projectPath);
    const parsed = parseExecutionOutput(execution.stdout);

    return {
      engine: "temporaryProject",
      exitCode: execution.exitCode,
      stdout: parsed.stdout,
      stderr: execution.stderr,
      dumps: parsed.dumps,
      autoCapturedLastExpression: prepared.autoCapturedLastExpression
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function buildProjectFile(projectPath: string, libraryProjectPath?: string): string {
  const relativeLibraryProjectPath = libraryProjectPath
    ? normalizeProjectReferencePath(projectPath, libraryProjectPath)
    : undefined;

  return [
    "<Project Sdk=\"Microsoft.NET.Sdk\">",
    "  <PropertyGroup>",
    "    <OutputType>Exe</OutputType>",
    "    <TargetFramework>net10.0</TargetFramework>",
    "    <ImplicitUsings>enable</ImplicitUsings>",
    "    <Nullable>enable</Nullable>",
    "    <LangVersion>latest</LangVersion>",
    "  </PropertyGroup>",
    ...(relativeLibraryProjectPath
      ? [
          "  <ItemGroup>",
          `    <ProjectReference Include=\"${relativeLibraryProjectPath}\" />`,
          "  </ItemGroup>"
        ]
      : []),
    "</Project>"
  ].join("\n");
}

function buildProgramSource(prepared: PreparedQuery, useLibrarySupport: boolean): string {
  const distinctUsings = Array.from(
    new Set([
      "using System;",
      "using System.Collections.Generic;",
      "using System.Text.Json;",
      "using System.Text.Json.Serialization;",
      ...(useLibrarySupport ? ["using NetPad;", "using static NetPad.QueryPrimitives;"] : []),
      ...prepared.usings
    ])
  );

  return [
    ...distinctUsings,
    "",
    ...(useLibrarySupport ? ["var __netPadHost = new __NetPadHost();", "QueryRuntime.SetDumpSink(__netPadHost);", "QueryRuntime.Clear();"] : ["__NetPadHost.Reset();"]),
    "",
    prepared.body || "// The query body was empty.",
    "",
    "__NetPadHost.Flush();",
    ...(useLibrarySupport ? ["QueryRuntime.SetDumpSink(null);"] : []),
    "",
    useLibrarySupport ? "sealed class __NetPadHost : INetPadDumpSink" : "static class __NetPadHost",
    "{",
    "    private static readonly JsonSerializerOptions SerializerOptions = new()",
    "    {",
    "        WriteIndented = true,",
    "        ReferenceHandler = ReferenceHandler.IgnoreCycles",
    "    };",
    "",
    "    private static readonly List<__NetPadDumpRecord> Dumps = [];",
    "",
    ...(useLibrarySupport ? [] : ["    public static void Reset() => Dumps.Clear();", ""]),
    "",
    ...(useLibrarySupport
      ? [
          "    public void AddDump(object? value, string? label = null)",
          "    {",
          "        Dumps.Add(CreateDumpRecord(value, label));",
          "    }",
          "",
          "    public void Clear() => Dumps.Clear();"
        ]
      : [
          "    public static void AddDump(object? value, string? label = null)",
          "    {",
          "        Dumps.Add(CreateDumpRecord(value, label));",
          "    }",
          "",
          "    public static void Dump(object? value, string? label = null)",
          "    {",
          "        AddDump(value, label);",
          "    }",
          "",
          "    public static object? Dump(object? value, DumpOptions? options)",
          "    {",
          "        AddDump(value, null);",
          "        return value;",
          "    }",
          "",
          "    public static object? Dump(object? value, string? label, DumpOptions? options)",
          "    {",
          "        AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpInline(object? value, string? label = null)",
          "    {",
          "        AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpInline(object? value, DumpOptions? options)",
          "    {",
          "        AddDump(value, null);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpInline(object? value, string? label, DumpOptions? options)",
          "    {",
          "        AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpText(object? value, string? label = null)",
          "    {",
          "        AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpTell(object? value, string? label = null)",
          "    {",
          "        AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpHtml(object? value, string? label = null)",
          "    {",
          "        AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static object? DumpTrace(object? value, string? label = null)",
          "    {",
          "        AddDump(value?.ToString(), label);",
          "        return value;",
          "    }"
        ]),
    "",
    "    public static void Flush()",
    "    {",
    `        Console.WriteLine(\"${resultStartMarker}\");`,
    "        Console.WriteLine(JsonSerializer.Serialize(new __NetPadExecutionEnvelope { Dumps = Dumps }, SerializerOptions));",
    `        Console.WriteLine(\"${resultEndMarker}\");`,
    "    }",
    "",
    "    private static __NetPadDumpRecord CreateDumpRecord(object? value, string? label)",
    "    {",
    "        if (value is null)",
    "        {",
    "            return new __NetPadDumpRecord",
    "            {",
    "                Label = label,",
    "                Type = \"null\",",
    "                Text = \"null\",",
    "                Json = \"null\"",
    "            };",
    "        }",
    "",
    "        var type = value.GetType();",
    "        string? json = null;",
    "",
    "        try",
    "        {",
    "            json = JsonSerializer.Serialize(value, type, SerializerOptions);",
    "        }",
    "        catch",
    "        {",
    "            json = null;",
    "        }",
    "",
    "        return new __NetPadDumpRecord",
    "        {",
    "            Label = label,",
    "            Type = type.FullName ?? type.Name,",
    "            Text = value.ToString() ?? type.Name,",
    "            Json = json",
    "        };",
    "    }",
    "}",
    "",
    ...(useLibrarySupport
      ? []
      : [
          "static class __NetPadDumpExtensions",
          "{",
          "    public static T Dump<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static T Dump<T>(this T value, DumpOptions? options)",
          "    {",
          "        __NetPadHost.AddDump(value, null);",
          "        return value;",
          "    }",
          "",
          "    public static T Dump<T>(this T value, string? label, DumpOptions? options)",
          "    {",
          "        __NetPadHost.AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpInline<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpInline<T>(this T value, DumpOptions? options)",
          "    {",
          "        __NetPadHost.AddDump(value, null);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpInline<T>(this T value, string? label, DumpOptions? options)",
          "    {",
          "        __NetPadHost.AddDump(value, label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpText<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpTell<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpHtml<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "",
          "    public static T DumpTrace<T>(this T value, string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(value?.ToString(), label);",
          "        return value;",
          "    }",
          "}",
          "",
          "sealed class DumpOptions",
          "{",
          "    public static DumpOptions Default { get; } = new();",
          "    public int? MaxDepth { get; set; }",
          "    public int? MaxRows { get; set; }",
          "    public int? MaxEnumerableCount { get; set; }",
          "    public int? MaxStringLength { get; set; }",
          "    public bool? ShowHeader { get; set; }",
          "    public bool? ShowItemCount { get; set; }",
          "    public bool? ShowTypes { get; set; }",
          "    public bool? ToDataGrid { get; set; }",
          "    public bool? RichText { get; set; }",
          "    public string? CssClass { get; set; }",
          "    public string? Style { get; set; }",
          "}",
          "",
          "sealed class DumpContainer",
          "{",
          "    private readonly List<object?> _appendedContent = [];",
          "",
          "    public DumpContainer(object? content = null)",
          "    {",
          "        Content = content;",
          "        DumpOptions = new DumpOptions();",
          "    }",
          "",
          "    public DumpContainer(object? content, Action<DumpOptions>? configureOptions) : this(content)",
          "    {",
          "        configureOptions?.Invoke(DumpOptions);",
          "    }",
          "",
          "    public object? Content { get; set; }",
          "",
          "    public DumpOptions DumpOptions { get; set; }",
          "",
          "    public string? Style { get; set; }",
          "",
          "    public DumpContainer Update(object? content)",
          "    {",
          "        Content = content;",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer Clear()",
          "    {",
          "        Content = null;",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer Dump(string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(Content, label);",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer Dump(DumpOptions? options)",
          "    {",
          "        if (options is not null)",
          "        {",
          "            DumpOptions = options;",
          "        }",
          "",
          "        __NetPadHost.AddDump(Content, null);",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer Dump(string? label, DumpOptions? options)",
          "    {",
          "        if (options is not null)",
          "        {",
          "            DumpOptions = options;",
          "        }",
          "",
          "        __NetPadHost.AddDump(Content, label);",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer DumpInline(string? label = null)",
          "    {",
          "        __NetPadHost.AddDump(Content, label);",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer DumpTell(string? title = null)",
          "    {",
          "        __NetPadHost.AddDump(Content?.ToString(), title);",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer AppendContent(object? content)",
          "    {",
          "        _appendedContent.Add(content);",
          "        Content = _appendedContent.ToArray();",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer ClearContent()",
          "    {",
          "        _appendedContent.Clear();",
          "        Content = null;",
          "        return this;",
          "    }",
          "",
          "    public DumpContainer Refresh() => this;",
          "}",
          "",
          "static class Util",
          "{",
          "    public static string RawHtml(string html) => html;",
          "    public static string RawHtml(object? html) => html?.ToString() ?? string.Empty;",
          "    public static T WithStyle<T>(T value, string style) => value;",
          "    public static object?[] HorizontalRun(params object?[] values) => values;",
          "    public static object?[] VerticalRun(params object?[] values) => values;",
          "    public static string Image(string uri) => uri;",
          "    public static string Markdown(string markdown) => markdown;",
          "    public static object? OnDemand<T>(Func<T> factory, string? text = null) => factory();",
          "}",
          ""
        ]),
    "sealed class __NetPadExecutionEnvelope",
    "{",
    "    public List<__NetPadDumpRecord> Dumps { get; init; } = [];",
    "}",
    "",
    "sealed class __NetPadDumpRecord",
    "{",
    "    public string? Label { get; init; }",
    "    public string Type { get; init; } = string.Empty;",
    "    public string Text { get; init; } = string.Empty;",
    "    public string? Json { get; init; }",
    "}"
  ].join("\n");
}

function prepareQuery(query: string, useLibrarySupport: boolean): PreparedQuery {
  const normalized = query.replaceAll("\r\n", "\n");
  const lines = normalized.split("\n");
  const usings: string[] = [];
  let bodyStartIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (isUsingDirective(trimmed)) {
      usings.push(trimmed);
      bodyStartIndex = index + 1;
      continue;
    }

    bodyStartIndex = index;
    break;
  }

  const bodyLines = lines.slice(bodyStartIndex);

  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim().length === 0) {
    bodyLines.pop();
  }

  const autoCapturedLastExpression = tryAutoCaptureLastExpression(bodyLines);
  const body = bodyLines.join("\n");
  const effectiveUsings = useLibrarySupport ? usings : usings.filter((entry) => !isNetPadUsingDirective(entry));

  return {
    usings: effectiveUsings,
    body: useLibrarySupport ? body : rewriteDirectLinqPadCalls(body),
    autoCapturedLastExpression
  };
}

function normalizeProjectReferencePath(projectPath: string, libraryProjectPath: string): string {
  return relative(dirname(projectPath), libraryProjectPath).replaceAll("\\", "/");
}

function isUsingDirective(line: string): boolean {
  return /^global\s+using\s+.+;$/.test(line) || /^using\s+.+;$/.test(line);
}

function isNetPadUsingDirective(line: string): boolean {
  return /^global\s+using\s+(static\s+)?NetPad(\.|\s*;)/.test(line) || /^using\s+(static\s+)?NetPad(\.|\s*;)/.test(line);
}

function tryAutoCaptureLastExpression(lines: string[]): boolean {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const trimmed = lines[index].trim();

    if (trimmed.length === 0) {
      continue;
    }

    if (!shouldAutoCapture(trimmed)) {
      return false;
    }

    const indentation = lines[index].match(/^\s*/)?.[0] ?? "";
    lines[index] = `${indentation}Dump(${trimmed}, \"Result\");`;
    return true;
  }

  return false;
}

function shouldAutoCapture(line: string): boolean {
  if (line.endsWith(";")) {
    return false;
  }

  if (line.startsWith("//") || line.startsWith("#")) {
    return false;
  }

  if (/^(if|else|for|foreach|while|switch|using|return|throw|try|catch|finally|namespace|class|record|struct|enum|interface)\b/.test(line)) {
    return false;
  }

  if (/[:{}]$/.test(line)) {
    return false;
  }

  return true;
}

function rewriteDirectLinqPadCalls(body: string): string {
  return body
    .replace(/(?<![\w.])Dump\s*\(/g, "__NetPadHost.Dump(")
    .replace(/(?<![\w.])DumpInline\s*\(/g, "__NetPadHost.DumpInline(")
    .replace(/(?<![\w.])DumpText\s*\(/g, "__NetPadHost.DumpText(")
    .replace(/(?<![\w.])DumpTell\s*\(/g, "__NetPadHost.DumpTell(")
    .replace(/(?<![\w.])DumpHtml\s*\(/g, "__NetPadHost.DumpHtml(")
    .replace(/(?<![\w.])DumpTrace\s*\(/g, "__NetPadHost.DumpTrace(");
}

async function runDotnet(projectPath: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(
      "dotnet",
      ["run", "--project", projectPath, "--configuration", "Release", "--nologo", "-v", "quiet"],
      {
        env: {
          ...process.env,
          DOTNET_CLI_UI_LANGUAGE: "en",
          DOTNET_NOLOGO: "1"
        },
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      resolve({
        exitCode: -1,
        stdout,
        stderr: `${stderr}\nNetPad stopped the temporary project because it exceeded ${executionTimeoutMs / 1000} seconds.`.trim()
      });
    }, executionTimeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}

function parseExecutionOutput(stdout: string): { stdout: string; dumps: QueryDump[] } {
  const startIndex = stdout.indexOf(resultStartMarker);
  const endIndex = stdout.indexOf(resultEndMarker);

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return {
      stdout: stdout.trim(),
      dumps: []
    };
  }

  const jsonStart = startIndex + resultStartMarker.length;
  const jsonPayload = stdout.slice(jsonStart, endIndex).trim();
  const prelude = stdout.slice(0, startIndex).trim();
  const epilogue = stdout.slice(endIndex + resultEndMarker.length).trim();

  return {
    stdout: [prelude, epilogue].filter((part) => part.length > 0).join("\n"),
    dumps: parseDumpPayload(jsonPayload)
  };
}

function parseDumpPayload(jsonPayload: string): QueryDump[] {
  try {
    const envelope = JSON.parse(jsonPayload) as RawEnvelope;
    const rawDumps = envelope.dumps ?? envelope.Dumps ?? [];

    return rawDumps.map((dump, index) => {
      const type = (dump.type ?? dump.Type)?.trim() || "unknown";
      const explicitLabel = (dump.label ?? dump.Label)?.trim();

      return {
        label: explicitLabel || inferDefaultDumpLabel(type, index),
        type,
        text: (dump.text ?? dump.Text)?.trim() || "",
        json: (dump.json ?? dump.Json)?.trim() || undefined
      };
    });
  } catch {
    return [
      {
        label: "NetPad envelope",
        type: "parse-error",
        text: "NetPad could not parse the structured result envelope emitted by the temporary project.",
        json: jsonPayload
      }
    ];
  }
}

function inferDefaultDumpLabel(type: string, index: number): string {
  const trimmedType = type.trim();

  if (trimmedType.length === 0 || trimmedType === "unknown") {
    return `Result ${index + 1}`;
  }

  if (trimmedType.endsWith("[]")) {
    return simplifyTypeName(trimmedType.slice(0, -2));
  }

  return simplifyTypeName(trimmedType);
}

function simplifyTypeName(type: string): string {
  const normalized = type.trim();

  const aliases: Record<string, string> = {
    "System.String": "String",
    "String": "String",
    "System.Int32": "int",
    "Int32": "int",
    "System.Int64": "long",
    "Int64": "long",
    "System.Int16": "short",
    "Int16": "short",
    "System.Boolean": "bool",
    "Boolean": "bool",
    "System.Object": "object",
    "Object": "object",
    "System.Decimal": "decimal",
    "Decimal": "decimal",
    "System.Double": "double",
    "Double": "double",
    "System.Single": "float",
    "Single": "float",
    "System.Byte": "byte",
    "Byte": "byte",
    "System.Char": "char",
    "Char": "char"
  };

  if (aliases[normalized]) {
    return aliases[normalized];
  }

  const genericMarker = normalized.indexOf("`");
  const withoutArity = genericMarker >= 0 ? normalized.slice(0, genericMarker) : normalized;
  const segments = withoutArity.split(/[.+]/);
  const candidate = segments[segments.length - 1];

  if (candidate.startsWith("<>") || candidate.includes("AnonymousType")) {
    return "item";
  }

  return aliases[candidate] || candidate;
}