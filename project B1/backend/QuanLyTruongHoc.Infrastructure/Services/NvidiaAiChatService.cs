using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using QuanLyTruongHoc.Application.Interfaces;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Gọi API tương thích OpenAI của NVIDIA NIM (https://integrate.api.nvidia.com/v1/chat/completions)
public class NvidiaAiChatService : IAiChatService
{
    private readonly HttpClient _http;
    private readonly NvidiaAiSettings _settings;

    public NvidiaAiChatService(HttpClient http, IOptions<NvidiaAiSettings> options)
    {
        _settings = options.Value;
        _http = http;
        _http.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        _http.Timeout = TimeSpan.FromSeconds(60);
    }

    public Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct = default) =>
        ChatAsync(systemPrompt, new[] { new ChatTurn("user", userMessage) }, ct);

    public async Task<string> ChatAsync(string systemPrompt, IReadOnlyList<ChatTurn> messages, CancellationToken ct = default)
    {
        var msgs = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var m in messages)
            msgs.Add(new { role = m.Role, content = m.Content });

        var body = new
        {
            model = _settings.Model,
            messages = msgs,
            temperature = 0,
            top_p = 1,
            max_tokens = 1024,
            reasoning_effort = _settings.ReasoningEffort,
            stream = false,
        };

        using var response = await HttpRetry.PostJsonWithRetryAsync(_http, "chat/completions", body, maxAttempts: 3, ct);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        return json.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }

    public async IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt, IReadOnlyList<ChatTurn> messages,
        IReadOnlyList<ChatTool> tools, Func<string, string, Task<string>> executeTool,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var convo = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var m in messages)
            convo.Add(new { role = m.Role, content = m.Content });

        var toolDefs = tools.Count == 0 ? null : tools.Select(t => (object)new
        {
            type = "function",
            function = new { name = t.Name, description = t.MoTa, parameters = t.ThamSo },
        }).ToList();

        // Tối đa 1 vòng gọi tool: vòng 0 (kèm tool) -> nếu model gọi tool thì chạy rồi vòng 1 tổng hợp.
        for (var round = 0; round < 2; round++)
        {
            var body = BuildStreamBody(convo, round == 0 ? toolDefs : null);

            using var response = await HttpRetry.SendWithRetryAsync(_http,
                () => new HttpRequestMessage(HttpMethod.Post, "chat/completions") { Content = JsonContent.Create(body) },
                HttpCompletionOption.ResponseHeadersRead, maxAttempts: 3, ct);
            response.EnsureSuccessStatusCode();

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var reader = new StreamReader(stream);

            var toolAcc = new SortedDictionary<int, ToolCallAcc>();
            while (await reader.ReadLineAsync(ct) is { } line)
            {
                if (!line.StartsWith("data:")) continue;
                var data = line["data:".Length..].Trim();
                if (data.Length == 0) continue;
                if (data == "[DONE]") break;

                string? token = null;
                try
                {
                    using var doc = JsonDocument.Parse(data);
                    if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
                        continue; // chunk "usage" cuối với choices rỗng
                    if (choices[0].TryGetProperty("delta", out var delta))
                    {
                        if (delta.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String)
                            token = c.GetString();
                        if (delta.TryGetProperty("tool_calls", out var tcs) && tcs.ValueKind == JsonValueKind.Array)
                            GomToolCalls(tcs, toolAcc);
                    }
                }
                catch (JsonException) { continue; }

                if (!string.IsNullOrEmpty(token)) yield return token;
            }

            if (toolAcc.Count == 0) yield break; // model trả lời thẳng (không gọi tool) -> xong

            // Model yêu cầu gọi tool: ghi lượt assistant(tool_calls) + chạy tool + ghi kết quả, rồi vòng sau tổng hợp.
            convo.Add(new
            {
                role = "assistant",
                content = (string?)null,
                tool_calls = toolAcc.Values.Select(t => new
                {
                    id = t.Id,
                    type = "function",
                    function = new { name = t.Name, arguments = t.Args.ToString() },
                }).ToList(),
            });
            foreach (var t in toolAcc.Values)
            {
                string ketQua;
                try { ketQua = await executeTool(t.Name, t.Args.ToString()); }
                catch (Exception ex) { ketQua = "Lỗi khi chạy công cụ: " + ex.Message; }
                convo.Add(new { role = "tool", tool_call_id = t.Id, content = ketQua });
            }
        }
    }

    private object BuildStreamBody(List<object> convo, object? toolDefs)
    {
        var d = new Dictionary<string, object?>
        {
            ["model"] = _settings.Model,
            ["messages"] = convo,
            ["temperature"] = 0,
            ["top_p"] = 1,
            ["max_tokens"] = 1024,
            ["reasoning_effort"] = _settings.ReasoningEffort,
            ["stream"] = true,
        };
        if (toolDefs != null)
        {
            d["tools"] = toolDefs;
            d["tool_choice"] = "auto";
        }
        return d;
    }

    private sealed class ToolCallAcc
    {
        public string Id = "";
        public string Name = "";
        public StringBuilder Args = new();
    }

    // Gom các mảnh tool_call stream về (name 1 lần, arguments nối dần) theo index.
    private static void GomToolCalls(JsonElement tcs, SortedDictionary<int, ToolCallAcc> acc)
    {
        foreach (var tc in tcs.EnumerateArray())
        {
            var idx = tc.TryGetProperty("index", out var iel) && iel.ValueKind == JsonValueKind.Number ? iel.GetInt32() : 0;
            if (!acc.TryGetValue(idx, out var e)) { e = new ToolCallAcc(); acc[idx] = e; }
            if (tc.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String && id.GetString() is { Length: > 0 } sid)
                e.Id = sid;
            if (tc.TryGetProperty("function", out var fn))
            {
                if (fn.TryGetProperty("name", out var nm) && nm.ValueKind == JsonValueKind.String && nm.GetString() is { Length: > 0 } snm)
                    e.Name = snm;
                if (fn.TryGetProperty("arguments", out var ar) && ar.ValueKind == JsonValueKind.String)
                    e.Args.Append(ar.GetString());
            }
        }
    }
}
