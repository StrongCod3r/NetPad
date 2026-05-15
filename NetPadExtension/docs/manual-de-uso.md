# Manual de Uso de NetPad

## Qué es NetPad

NetPad es una extensión para Visual Studio Code orientada a un flujo parecido a LINQPad: escribir consultas o fragmentos de C#, ejecutarlos rápido y revisar el resultado en un panel dedicado.

En el estado actual del proyecto, NetPad ya permite:

- crear consultas temporales;
- crear archivos de consulta persistentes dentro del workspace;
- ejecutar una consulta o una selección del editor;
- ver el resultado en un panel lateral dedicado;
- ver el mismo resultado en una pestaña de texto dentro del panel Output;
- abrir y ejecutar consultas desde una vista propia llamada `NetPad Queries`.

## Requisitos

- Visual Studio Code.
- SDK de .NET instalado en el sistema.
- La extensión NetPad cargada en el Extension Development Host o empaquetada como extensión.

## Primer uso

### Opción 1: consulta temporal

1. Abre la paleta de comandos.
2. Ejecuta `NetPad: New Query`.
3. Se abrirá un documento temporal con una plantilla C#.
4. Ejecuta `NetPad: Run Query` para correr la consulta completa.

### Opción 2: archivo persistente

1. Abre un workspace en VS Code.
2. Ejecuta `NetPad: New Query File`.
3. NetPad creará un archivo dentro de `queries/` con nombre `Query*.npad.cs`.
4. Ese archivo aparecerá también en la vista `NetPad Queries` del Explorador.

## Estructura de archivos de consulta

Las consultas persistentes se guardan con esta convención:

```text
queries/Query1.npad.cs
queries/Query2.npad.cs
```

Cuando la extensión se activa, los archivos `*.npad.cs` se cambian automáticamente al modo de lenguaje C# para que puedan editarse y ejecutarse como consultas normales.
Además, NetPad genera archivos auxiliares por query para que el análisis de C# reconozca helpers de compatibilidad estilo LINQPad, como `Dump(...)`, `DumpText(...)`, `DumpHtml(...)` y `DumpTrace(...)`.

## Comandos disponibles

### `NetPad: New Query`

Crea una consulta temporal en un documento sin guardar.

### `NetPad: New Query File`

Crea una consulta persistente dentro de `queries/` en el workspace actual.

Si no hay workspace abierto, NetPad cae automáticamente a una consulta temporal.

### `NetPad: Run Query`

Ejecuta:

- la selección actual, si existe una selección activa;
- o el documento completo, si no hay selección.

Además, cuando el editor activo corresponde a una query ejecutable, NetPad muestra un botón `Play` en la barra de estado para lanzar la ejecución más rápido.

### `NetPad: Show Results`

Abre o enfoca el panel lateral `NetPad Results`.

### `NetPad: Show Text Results`

Abre o enfoca la salida textual `NetPad Results` dentro del panel Output de VS Code.

### `NetPad: Run Query File`

Disponible desde la vista `NetPad Queries`. Abre el archivo seleccionado y ejecuta la consulta.

### `NetPad: Open Query File`

Disponible desde la vista `NetPad Queries`. Abre el archivo seleccionado en el editor.

### `NetPad: Refresh Queries`

Actualiza manualmente la vista `NetPad Queries`.

## Vista `NetPad Queries`

La vista `NetPad Queries` aparece en el Explorador cuando hay un workspace abierto.

Desde esa vista puedes:

- ver las consultas persistentes detectadas bajo `queries/`;
- abrir una consulta con clic;
- ejecutar una consulta desde el menú contextual;
- crear nuevas consultas desde la barra del propio panel;
- refrescar la lista manualmente.

## Cómo escribir una consulta

El flujo actual funciona mejor con fragmentos tipo script y sentencias de nivel superior.

Ejemplo:

```csharp
using System;
using System.Linq;

var numbers = Enumerable.Range(1, 8)
    .Select(n => new { Number = n, Square = n * n })
    .ToArray();

Console.WriteLine($"Generated {numbers.Length} rows");
numbers.Dump("Squares");
```

## Cómo se ejecuta una consulta hoy

Actualmente NetPad usa un backend basado en un proyecto .NET temporal:

1. toma el código de la consulta;
2. genera un proyecto temporal desechable;
3. compila y ejecuta la consulta con `dotnet`;
4. captura `stdout`, `stderr` y resultados emitidos mediante `Dump(...)`;
5. renderiza el resultado en el panel lateral `NetPad Results` y también lo deja disponible en la salida textual del panel Output.

La opción de configuración `script` todavía no tiene un backend dedicado y usa este mismo flujo como fallback.

## Uso de `Dump(...)`

NetPad ya intercepta llamadas tipo `Dump(...)` y las convierte en resultados estructurados dentro del panel.

Ejemplo:

```csharp
var values = new[] { 1, 2, 3, 4 };
values.Dump("Valores");
```

También intenta capturar automáticamente la última expresión simple si la consulta termina con una sola expresión sin `;`.

Ejemplo:

```csharp
Enumerable.Range(1, 5).Select(n => n * n)
```

## Compatibilidad de helpers estilo LINQPad

NetPad añade compatibilidad de diseño y ejecución para un conjunto inicial de helpers frecuentes de LINQPad:

- `Dump(...)`
- `Dump(..., DumpOptions)`
- `DumpInline(...)`
- `DumpText(...)`
- `DumpHtml(...)`
- `DumpTrace(...)`
- `DumpOptions`
- `DumpContainer`
- `DumpContainer.DumpOptions`
- `DumpContainer.AppendContent(...)`
- `DumpContainer.ClearContent()`
- `DumpContainer.Refresh()`
- `Util.RawHtml(...)`
- `Util.Markdown(...)`
- `Util.WithStyle(...)`
- `Util.HorizontalRun(...)`
- `Util.VerticalRun(...)`
- `Util.Image(...)`
- `Util.OnDemand(...)`

Esto resuelve el problema habitual del analizador de C# que antes marcaba `Dump` como método inexistente en archivos `*.npad.cs` persistentes.

Limitación actual: las consultas temporales `untitled` siguen sin disponer del mismo soporte de proyecto para IntelliSense, porque no pertenecen a un archivo físico del workspace.

## Panel de resultados

El panel `NetPad Results` puede mostrar:

- dumps estructurados;
- salida estándar (`stdout`);
- diagnósticos o errores (`stderr`);

Si la ejecución falla, el panel mostrará los diagnósticos relevantes.

## Salida textual

Además del panel gráfico, NetPad mantiene una salida textual en el canal `NetPad Results` del panel Output.

Esto sirve para:

- revisar el resultado como texto plano;
- copiar la salida rápidamente;
- comparar el render gráfico con la representación textual.

## Configuración disponible

### `netpad.executionMode`

Valores disponibles:

- `temporaryProject`
- `script`

Valor actual recomendado: `temporaryProject`.

Nota: `script` todavía usa fallback al backend temporal.

## Flujo recomendado de trabajo

1. Crea una consulta con `NetPad: New Query File`.
2. Escribe el código en `queries/*.npad.cs`.
3. Usa `Dump(...)` para inspeccionar resultados complejos.
4. Ejecuta la consulta desde el editor o desde la vista `NetPad Queries`.
5. Ajusta el código según el resultado mostrado en el panel.

## Limitaciones actuales

- No existe todavía un backend Roslyn/script nativo.
- La ejecución depende de crear un proyecto temporal en cada corrida.
- El renderizado de resultados aún no tiene tablas avanzadas, drill-down ni exploración profunda de objetos.
- No hay historial de ejecuciones.
- No hay soporte de conexiones de datos ni consultas SQL estilo LINQPad.

## Solución de problemas

### La consulta no ejecuta

Verifica:

- que el SDK de .NET esté instalado;
- que el código sea C# válido;
- que el archivo abierto sea una consulta válida o un documento temporal en C#.

### No aparece la vista `NetPad Queries`

Verifica que haya un workspace abierto. La vista no aparece si estás trabajando sin carpeta abierta.

### No veo resultados estructurados

Prueba a usar `Dump(...)` explícitamente. Aunque NetPad puede capturar la última expresión en algunos casos, `Dump(...)` sigue siendo el camino más fiable en el estado actual.

### Cambié archivos y la vista no se actualizó

Ejecuta `NetPad: Refresh Queries`.

## Desarrollo local de la extensión

Para trabajar sobre la propia extensión:

1. instala dependencias con `npm install`;
2. compila con `npm run compile`;
3. ejecuta la configuración `Run NetPad Extension` desde VS Code.

La configuración de desarrollo está en [.vscode/launch.json](.vscode/launch.json) y [.vscode/tasks.json](.vscode/tasks.json).