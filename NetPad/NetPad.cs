namespace NetPad;

public interface INetPadDumpSink
{
	void AddDump(object? value, string? label = null);

	void Clear();
}

public static class QueryRuntime
{
	private static INetPadDumpSink? _dumpSink;

	public static void SetDumpSink(INetPadDumpSink? dumpSink)
	{
		_dumpSink = dumpSink;
	}

	public static void AddDump(object? value, string? label = null)
	{
		_dumpSink?.AddDump(value, label);
	}

	public static void Clear()
	{
		_dumpSink?.Clear();
	}
}

public static class QueryPrimitives
{
	public static T Dump<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T Dump<T>(T value, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, null);
		return value;
	}

	public static T Dump<T>(T value, string? title, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T Dump<T>(T value, string? title, Action<DumpOptions>? configureOptions)
	{
		var options = new DumpOptions();
		configureOptions?.Invoke(options);
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpInline<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpInline<T>(T value, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, null);
		return value;
	}

	public static T DumpInline<T>(T value, string? title, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpTrace<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpText<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpTell<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpHtml<T>(T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static DumpContainer DumpContainer(object? content = null) => new(content);

	public static void Clear() => QueryRuntime.Clear();
}

public static class QueryExtensions
{
	public static T Dump<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T Dump<T>(this T value, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, null);
		return value;
	}

	public static T Dump<T>(this T value, string? title, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T Dump<T>(this T value, string? title, Action<DumpOptions>? configureOptions)
	{
		var options = new DumpOptions();
		configureOptions?.Invoke(options);
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpInline<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpInline<T>(this T value, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, null);
		return value;
	}

	public static T DumpInline<T>(this T value, string? title, DumpOptions? options)
	{
		QueryRuntime.AddDump(value, title);
		return value;
	}

	public static T DumpTrace<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpText<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpTell<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}

	public static T DumpHtml<T>(this T value, string? title = null)
	{
		QueryRuntime.AddDump(value?.ToString(), title);
		return value;
	}
}


public sealed class DumpOptions
{
	public static DumpOptions Default { get; } = new();

	public int? MaxDepth { get; set; }

	public int? MaxRows { get; set; }

	public int? MaxEnumerableCount { get; set; }

	public int? MaxStringLength { get; set; }

	public bool? ShowHeader { get; set; }

	public bool? ShowItemCount { get; set; }

	public bool? ShowTypes { get; set; }

	public bool? ToDataGrid { get; set; }

	public bool? RichText { get; set; }

	public string? CssClass { get; set; }

	public string? Style { get; set; }
}

public sealed class DumpContainer
{
	private readonly List<object?> _appendedContent = [];

	public DumpContainer(object? content = null)
	{
		Content = content;
		DumpOptions = new DumpOptions();
	}

	public DumpContainer(object? content, Action<DumpOptions>? configureOptions)
		: this(content)
	{
		configureOptions?.Invoke(DumpOptions);
	}

	public object? Content { get; set; }

	public DumpOptions DumpOptions { get; set; }

	public string? Style { get; set; }

	public DumpContainer Update(object? content)
	{
		Content = content;
		return this;
	}

	public DumpContainer Clear()
	{
		Content = null;
		return this;
	}

	public DumpContainer Dump(string? title = null)
	{
		QueryRuntime.AddDump(Content, title);
		return this;
	}

	public DumpContainer Dump(DumpOptions? options)
	{
		if (options is not null)
		{
			DumpOptions = options;
		}

		QueryRuntime.AddDump(Content, null);
		return this;
	}

	public DumpContainer Dump(string? title, DumpOptions? options)
	{
		if (options is not null)
		{
			DumpOptions = options;
		}

		QueryRuntime.AddDump(Content, title);
		return this;
	}

	public DumpContainer Dump(string? title, Action<DumpOptions>? configureOptions)
	{
		configureOptions?.Invoke(DumpOptions);
		QueryRuntime.AddDump(Content, title);
		return this;
	}

	public DumpContainer DumpInline(string? title = null)
	{
		QueryRuntime.AddDump(Content, title);
		return this;
	}

	public DumpContainer DumpTrace(string? title = null)
	{
		QueryRuntime.AddDump(Content?.ToString(), title);
		return this;
	}

	public DumpContainer DumpText(string? title = null)
	{
		QueryRuntime.AddDump(Content?.ToString(), title);
		return this;
	}

	public DumpContainer DumpTell(string? title = null)
	{
		QueryRuntime.AddDump(Content?.ToString(), title);
		return this;
	}

	public DumpContainer DumpHtml(string? title = null)
	{
		QueryRuntime.AddDump(Content?.ToString(), title);
		return this;
	}

	public DumpContainer AppendContent(object? content)
	{
		_appendedContent.Add(content);
		Content = _appendedContent.ToArray();
		return this;
	}

	public DumpContainer ClearContent()
	{
		_appendedContent.Clear();
		Content = null;
		return this;
	}

	public DumpContainer Refresh()
	{
		return this;
	}
}

public static class Util
{
	public static string RawHtml(string html) => html;

	public static string RawHtml(object? html) => html?.ToString() ?? string.Empty;

	public static T WithStyle<T>(T value, string style) => value;

	public static object?[] HorizontalRun(params object?[] values) => values;

	public static object?[] VerticalRun(params object?[] values) => values;

	public static string Image(string uri) => uri;

	public static string Markdown(string markdown) => markdown;

	public static object? OnDemand<T>(Func<T> factory, string? text = null) => factory();
}
