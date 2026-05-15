# NetPad

NetPad es un experimento de flujo tipo LINQPad para Visual Studio Code: permite escribir consultas C#, ejecutarlas rapido desde el editor y ver resultados enriquecidos sin salir del workspace.

El repositorio contiene tres piezas:

- `NetPad/`: libreria .NET con helpers de compatibilidad para queries, como `Dump(...)`, `DumpText(...)`, `DumpHtml(...)`, `DumpContainer` y `Util`.
- `NetPadExtension/`: extension de VS Code escrita en TypeScript. Crea queries, las ejecuta y muestra resultados.
- `AppExample/`: proyecto .NET de ejemplo con archivos `queries/*.npad.cs`.

## Como funciona

La extension registra comandos de VS Code para crear y ejecutar consultas C#:

- `NetPad: New Query` abre una query temporal sin guardar.
- `NetPad: New Query File` crea un archivo persistente `queries/Query*.npad.cs`.
- `NetPad: Run Query` ejecuta la seleccion actual o, si no hay seleccion, todo el documento.
- `NetPad: Show Results` abre el panel visual de resultados.
- `NetPad: Show Text Results` abre la salida textual en el panel Output.
- `NetPad Queries` agrega una vista en el Explorador para listar, abrir y ejecutar queries persistentes.

Hoy la ejecucion se hace con un backend de proyecto temporal:

1. La extension toma el codigo de la query.
2. Genera un proyecto .NET desechable.
3. Compila y ejecuta ese proyecto con `dotnet`.
4. Captura `stdout`, `stderr` y llamadas a `Dump(...)`.
5. Renderiza el resultado en el panel `NetPad Results` y en el canal de salida textual.

La libreria `NetPad` aporta los helpers que hacen que una query pueda escribir codigo estilo LINQPad:

```csharp
using System;
using System.Linq;

var numbers = Enumerable.Range(1, 10)
    .Select(n => new { Number = n, Square = n * n })
    .ToArray();

Console.WriteLine($"Generated {numbers.Length} rows");
numbers.Dump("Squares");
```

## Requisitos

- Visual Studio Code.
- SDK de .NET compatible con `net10.0`.
- Node.js y npm para desarrollar la extension.

## Desarrollo local

Instala y compila la extension:

```bash
cd NetPadExtension
npm install
npm run compile
```

Compila la libreria .NET:

```bash
cd ../NetPad
dotnet build
```

Para probar la extension, abre el repositorio en VS Code y lanza el Extension Development Host con la configuracion de depuracion del proyecto, si esta disponible. Despues ejecuta desde la paleta:

```text
NetPad: New Query File
NetPad: Run Query
```

## Proyecto de ejemplo

`AppExample/` contiene una aplicacion .NET y varias queries en `AppExample/queries/`.

El archivo `AppExample/app.csproj` referencia el paquete `NetPad` y excluye los archivos `*.npad.cs` de la compilacion normal, porque esas queries se tratan como scripts:

```xml
<Compile Remove="queries\**\*.npad.cs" />
<None Include="queries\**\*.npad.cs" />
```

## Estructura

```text
NetPad/
  NetPad.cs                  # Helpers/runtime basico de queries
  NetPad.csproj              # Paquete NuGet NetPad

NetPadExtension/
  package.json               # Manifest de la extension VS Code
  src/extension.ts           # Activacion y comandos principales
  src/core/                  # Runner y contratos de ejecucion
  src/output/                # Salida textual
  src/panels/                # Panel visual de resultados
  src/queries/               # Soporte para archivos *.npad.cs
  docs/manual-de-uso.md      # Manual de uso

AppExample/
  app.csproj
  Program.cs
  queries/*.npad.cs
```

## Configuracion

La extension expone `netpad.executionMode` con estos valores:

- `temporaryProject`: modo recomendado actual.
- `script`: existe como opcion, pero por ahora usa el mismo backend temporal como fallback.

## Limitaciones actuales

- No hay backend Roslyn/script dedicado todavia.
- La ejecucion depende de crear y ejecutar un proyecto .NET temporal.
- El render de resultados aun es inicial: no hay exploracion profunda de objetos ni tablas avanzadas.
- No hay historial de ejecuciones ni conexiones de datos.

## Licencia

Este proyecto esta licenciado bajo MIT. Consulta `LICENSE`.
