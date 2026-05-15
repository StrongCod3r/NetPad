import { existsSync } from "node:fs";
import * as path from "node:path";

const netPadLibraryProjectPath = path.resolve(__dirname, "..", "..", "NetPad", "NetPad.csproj");

export function tryGetNetPadLibraryProjectPath(): string | undefined {
  const normalizedPath = path.normalize(netPadLibraryProjectPath);
  return existsSync(normalizedPath) ? normalizedPath : undefined;
}

export function getNetPadLibraryProjectPath(): string {
  const projectPath = tryGetNetPadLibraryProjectPath();

  if (projectPath) {
    return projectPath;
  }

  throw new Error(`NetPad could not find the C# support library project at ${netPadLibraryProjectPath}.`);
}