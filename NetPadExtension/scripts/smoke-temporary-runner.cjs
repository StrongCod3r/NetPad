const { runTemporaryProjectQuery } = require("../out/core/temporaryProjectRunner.js");

async function main() {
  const query = [
    "using System;",
    "using System.Linq;",
    "using NetPad;",
    "var numbers = Enumerable.Range(1, 4).Select(n => new { Number = n, Square = n * n }).ToArray();",
    "Dump(numbers, \"Squares\");",
    "numbers.Select(item => new { item.Number, Cube = item.Number * item.Number * item.Number }).ToArray().Dump(\"Cubes\");",
    "numbers.DumpInline(\"Inline\", new DumpOptions { MaxDepth = 1, ShowItemCount = true });",
    "var container = new DumpContainer(numbers, options => options.MaxDepth = 2);",
    "container.AppendContent(\"tail\").Dump(\"Container\");"
  ].join("\n");

  const result = await runTemporaryProjectQuery(query);

  console.log(
    JSON.stringify(
      {
        exitCode: result.exitCode,
        dumpCount: result.dumps.length,
        firstDumpType: result.dumps[0]?.type,
        secondDumpType: result.dumps[1]?.type,
        thirdDumpLabel: result.dumps[2]?.label,
        fourthDumpLabel: result.dumps[3]?.label,
        stderr: result.stderr,
        stdout: result.stdout
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});