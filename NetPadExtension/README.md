# NetPad

NetPad is a Visual Studio Code extension scaffold for a LINQPad-style workflow: write a C# query, run it quickly, and inspect rich results without leaving the editor.

Manual de uso: [docs/manual-de-uso.md](docs/manual-de-uso.md)

## Current Slice

This first slice proves the core loop:

- `NetPad: New Query` opens a scratch C# document.
- `NetPad: New Query File` creates a persistent `queries/Query*.npad.cs` file in the workspace.
- `NetPad: Run Query` captures the current selection or whole document.
- A `Run Query` play button appears in the status bar when the active editor can be executed as a query.
- `NetPad: Show Results` reveals a side results panel named `NetPad Results`.
- `NetPad: Show Text Results` reveals the text output tab named `NetPad Results`.
- `NetPad Queries` adds a dedicated Explorer view for persistent query files.
- The current execution pipeline uses a disposable .NET project to run the query and publish the result in both a side panel and a text output tab.
- Persistent `*.npad.cs` queries now get a generated sidecar project and compatibility file that can reference the sibling NetPad C# library so C# tooling resolves common LINQPad-style helpers such as `Dump(...)` from a real assembly.

## Why This Scaffold Exists

The goal is to establish the product shape while already proving a real .NET execution path. The next implementation can evolve from the current temporary-project runner toward either:

- a Roslyn/script-style runner, or
- a temporary-project runner.

## Development

```bash
npm install
npm run compile
```

Then run the extension in the VS Code Extension Development Host.

Persistent query files are created under `queries/` at the workspace root and use the `*.npad.cs` naming convention.
When the extension activates, it upgrades `*.npad.cs` documents to the C# language mode so they can participate in the normal query workflow.

For local extension development, use the `Run NetPad Extension` launch configuration in [.vscode/launch.json](.vscode/launch.json). The matching build tasks live in [.vscode/tasks.json](.vscode/tasks.json).

## Next Steps

1. Add a dedicated script/Roslyn runner so `script` mode stops falling back.
2. Add a richer dump model for objects, collections, exceptions, and tabular rendering.
3. Introduce persistent query files and query history.
4. Add data connections and reusable query context.