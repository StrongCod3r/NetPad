import { createHash } from "node:crypto";
import * as path from "node:path";
import * as vscode from "vscode";
import { tryGetNetPadLibraryProjectPath } from "../netPadLibraryProject";
import { isNetPadQueryUri, listPersistentQueryFiles } from "./queryFiles";

const supportFileSuffix = ".support.g.cs";
const projectFileExtension = ".csproj";
const supportRootFolderName = ".netpad";
const supportQueriesFolderName = "query-support";

export async function ensureQueryLanguageServiceSupport(queryUri: vscode.Uri): Promise<void> {
  if (!isNetPadQueryUri(queryUri) || queryUri.scheme !== "file") {
    return;
  }

  await cleanupLegacyAdjacentSupport(queryUri);

  const supportDirectoryUri = getSupportDirectoryUri(queryUri);
  await vscode.workspace.fs.createDirectory(supportDirectoryUri);

  const supportUri = getSupportFileUri(queryUri);
  const projectUri = getProjectFileUri(queryUri);
  const libraryProjectPath = tryGetNetPadLibraryProjectPath();
  const supportContent = buildSupportFileContent(Boolean(libraryProjectPath));
  const projectContent = buildProjectFileContent(queryUri, supportUri, supportDirectoryUri, libraryProjectPath);

  await writeFileIfChanged(supportUri, supportContent);
  await writeFileIfChanged(projectUri, projectContent);
}

export async function ensureWorkspaceQueryLanguageServiceSupport(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];

  for (const workspaceFolder of workspaceFolders) {
    const queryFiles = await listPersistentQueryFiles(workspaceFolder);

    for (const queryFile of queryFiles) {
      await ensureQueryLanguageServiceSupport(queryFile);
    }
  }
}

function getProjectFileUri(queryUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(getSupportDirectoryUri(queryUri), `${getSupportProjectBaseName(queryUri)}${projectFileExtension}`);
}

function getSupportFileUri(queryUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(getSupportDirectoryUri(queryUri), `${getSupportProjectBaseName(queryUri)}${supportFileSuffix}`);
}

function getSupportDirectoryUri(queryUri: vscode.Uri): vscode.Uri {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(queryUri);
  if (!workspaceFolder) {
    throw new Error(`NetPad could not determine the workspace folder for ${queryUri.fsPath}.`);
  }

  const relativePath = vscode.workspace.asRelativePath(queryUri, false).replaceAll("\\", "/");
  const digest = createHash("sha1").update(relativePath).digest("hex").slice(0, 10);
  const baseName = path.basename(queryUri.fsPath, ".cs").replace(/[^a-zA-Z0-9._-]/g, "-");
  return vscode.Uri.joinPath(workspaceFolder.uri, supportRootFolderName, supportQueriesFolderName, `${baseName}-${digest}`);
}

function getSupportProjectBaseName(queryUri: vscode.Uri): string {
  return path.basename(queryUri.fsPath, ".cs");
}

function buildProjectFileContent(
  queryUri: vscode.Uri,
  supportUri: vscode.Uri,
  supportDirectoryUri: vscode.Uri,
  libraryProjectPath?: string
): string {
  const relativeQueryPath = normalizeProjectPath(path.relative(supportDirectoryUri.fsPath, queryUri.fsPath));
  const relativeSupportPath = normalizeProjectPath(path.relative(supportDirectoryUri.fsPath, supportUri.fsPath));
  const relativeLibraryProjectPath = libraryProjectPath
    ? normalizeProjectPath(path.relative(supportDirectoryUri.fsPath, libraryProjectPath))
    : undefined;

  return [
    '<Project Sdk="Microsoft.NET.Sdk">',
    "  <PropertyGroup>",
    "    <OutputType>Exe</OutputType>",
    "    <TargetFramework>net10.0</TargetFramework>",
    "    <ImplicitUsings>enable</ImplicitUsings>",
    "    <Nullable>enable</Nullable>",
    "    <LangVersion>latest</LangVersion>",
    "    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>",
    "  </PropertyGroup>",
    "  <ItemGroup>",
    `    <Compile Include="${relativeQueryPath}" />`,
    `    <Compile Include="${relativeSupportPath}" />`,
    "  </ItemGroup>",
    ...(relativeLibraryProjectPath
      ? ["  <ItemGroup>", `    <ProjectReference Include="${relativeLibraryProjectPath}" />`, "  </ItemGroup>"]
      : []),
    "</Project>"
  ].join("\n");
}

function buildSupportFileContent(useLibraryReference: boolean): string {
  if (useLibraryReference) {
    return ["global using NetPad;", "global using static NetPad.QueryPrimitives;"].join("\n");
  }

  return [
    "global using NetPad.QuerySupport;",
    "global using static NetPad.QuerySupport.QueryPrimitives;",
    "",
    "namespace NetPad.QuerySupport;",
    "",
    "public static class QueryPrimitives",
    "{",
    "    public static T Dump<T>(T value, string? title = null) => value;",
    "    public static T Dump<T>(T value, DumpOptions? options) => value;",
    "    public static T Dump<T>(T value, string? title, DumpOptions? options) => value;",
    "    public static T Dump<T>(T value, string? title, Action<DumpOptions>? configureOptions) => value;",
    "    public static T DumpInline<T>(T value, string? title = null) => value;",
    "    public static T DumpInline<T>(T value, DumpOptions? options) => value;",
    "    public static T DumpInline<T>(T value, string? title, DumpOptions? options) => value;",
    "    public static T DumpTrace<T>(T value, string? title = null) => value;",
    "    public static T DumpText<T>(T value, string? title = null) => value;",
    "    public static T DumpTell<T>(T value, string? title = null) => value;",
    "    public static T DumpHtml<T>(T value, string? title = null) => value;",
    "    public static DumpContainer DumpContainer(object? content = null) => new(content);",
    "    public static void Clear() { }",
    "}",
    "",
    "public static class QueryExtensions",
    "{",
    "    public static T Dump<T>(this T value, string? title = null) => value;",
    "    public static T Dump<T>(this T value, DumpOptions? options) => value;",
    "    public static T Dump<T>(this T value, string? title, DumpOptions? options) => value;",
    "    public static T Dump<T>(this T value, string? title, Action<DumpOptions>? configureOptions) => value;",
    "    public static T DumpInline<T>(this T value, string? title = null) => value;",
    "    public static T DumpInline<T>(this T value, DumpOptions? options) => value;",
    "    public static T DumpInline<T>(this T value, string? title, DumpOptions? options) => value;",
    "    public static T DumpTrace<T>(this T value, string? title = null) => value;",
    "    public static T DumpText<T>(this T value, string? title = null) => value;",
    "    public static T DumpTell<T>(this T value, string? title = null) => value;",
    "    public static T DumpHtml<T>(this T value, string? title = null) => value;",
    "}",
    "",
    "public sealed class DumpOptions",
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
    "public sealed class DumpContainer",
    "{",
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
    "    public DumpOptions DumpOptions { get; set; }",
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
    "    public DumpContainer Dump(string? title = null) => this;",
    "    public DumpContainer Dump(DumpOptions? options) => this;",
    "    public DumpContainer Dump(string? title, DumpOptions? options) => this;",
    "    public DumpContainer Dump(string? title, Action<DumpOptions>? configureOptions) => this;",
    "    public DumpContainer DumpInline(string? title = null) => this;",
    "    public DumpContainer DumpTrace(string? title = null) => this;",
    "    public DumpContainer DumpText(string? title = null) => this;",
    "    public DumpContainer DumpTell(string? title = null) => this;",
    "    public DumpContainer DumpHtml(string? title = null) => this;",
    "    public DumpContainer AppendContent(object? content) => this;",
    "    public DumpContainer ClearContent() => this;",
    "    public DumpContainer Refresh() => this;",
    "}",
    "",
    "public static class Util",
    "{",
    "    public static string RawHtml(string html) => html;",
    "    public static string RawHtml(object? html) => html?.ToString() ?? string.Empty;",
    "    public static T WithStyle<T>(T value, string style) => value;",
    "    public static object?[] HorizontalRun(params object?[] values) => values;",
    "    public static object?[] VerticalRun(params object?[] values) => values;",
    "    public static string Image(string uri) => uri;",
    "    public static string Markdown(string markdown) => markdown;",
    "    public static object? OnDemand<T>(Func<T> factory, string? text = null) => factory();",
    "}"
  ].join("\n");
}

async function writeFileIfChanged(uri: vscode.Uri, content: string): Promise<void> {
  const encoded = Buffer.from(content, "utf8");

  try {
    const existing = await vscode.workspace.fs.readFile(uri);
    if (Buffer.compare(Buffer.from(existing), encoded) === 0) {
      return;
    }
  } catch {
    // File does not exist yet.
  }

  await vscode.workspace.fs.writeFile(uri, encoded);
}

async function cleanupLegacyAdjacentSupport(queryUri: vscode.Uri): Promise<void> {
  const legacyUris = [
    vscode.Uri.file(`${queryUri.fsPath}${projectFileExtension}`),
    vscode.Uri.file(path.join(path.dirname(queryUri.fsPath), `${path.basename(queryUri.fsPath, ".cs")}${supportFileSuffix}`))
  ];

  for (const legacyUri of legacyUris) {
    try {
      await vscode.workspace.fs.delete(legacyUri, { useTrash: false });
    } catch {
      // Ignore missing legacy artifacts.
    }
  }
}

function normalizeProjectPath(value: string): string {
  return value.replaceAll("\\", "/");
}