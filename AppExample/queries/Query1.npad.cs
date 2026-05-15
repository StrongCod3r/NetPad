using System;
using System.Linq;

var numbers = Enumerable.Range(1, 10)
    .Select(n => new { Number = n, Square = n * n })
    .ToArray();


Console.WriteLine($"Generated {numbers.Length} rows");

numbers.Dump("Squares");