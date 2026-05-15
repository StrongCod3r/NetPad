using System;
using System.Linq;
using System.Collections;
using NetPad;

var text = @"     El desarrollo  désarrollo         de software moderno es un arte que requiere paciencia    y precisión. Al iniciar un proyecto, el primer código que escribimos suele ser el más simple, casi como un boceto inicial. Sin embargo, a medida que los requerimientos aumentan, ese código base comienza a crecer y a volverse más complejo. Es en ese momento cuando un buen programador demuestra su habilidad, asegurándose de que cada línea de código sea lo más limpia y legible posible.\n\nNo basta con que la aplicación funcione; si el código no es mantenible, el proyecto se volverá insostenible a largo plazo. Por esta razón, las revisiones entre compañeros son cruciales, ya que un segundo par de ojos puede detectar fallas en el código que el autor original pasó por alto. Además, escribir pruebas automatizadas ayuda a garantizar que el código nuevo no rompa las funcionalidades que ya estaban estables.\n\nA veces, la frustración aparece cuando pasas horas buscando un error, solo para descubrir que el código fallaba por un simple punto y coma. Pero la satisfacción de ver que tu código compila sin errores y resuelve el problema del usuario final hace que todo el esfuerzo valga la pena. Al final del día, la arquitectura de sistemas no se trata solo de tecnología, sino de dejar un código robusto del cual sentirse orgulloso. Así, optimizar cada sección de código se convierte en el verdadero hábito de un ingeniero profesional.";

string.Join("", text.Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)))
.Split(' ')
.Where(c => c.Trim().Length > 0)
.GroupBy(c => c.ToLower())
.Dump();
// .ForEach(x => Console.WriteLine($"{x.Key} : {x.Count()}"));