using System.Net.Http.Headers;
using System.Net.Http.Json;
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
            stream = false,
        };

        using var response = await _http.PostAsJsonAsync("chat/completions", body, ct);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        return json.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "";
    }

    private const int SoVongToolToiDa = 4; // tối đa số vòng gọi mô hình (gồm cả vòng gọi công cụ)

    public async Task<string> ChatWithToolsAsync(
        string systemPrompt,
        IReadOnlyList<ChatTurn> turns,
        IReadOnlyList<ChatToolDef> toolDefs,
        ChatToolHandler handler,
        CancellationToken ct = default)
    {
        var messages = new List<object> { new { role = "system", content = systemPrompt } };
        foreach (var t in turns) messages.Add(new { role = t.Role, content = t.Content });

        var tools = toolDefs.Select(t => new
        {
            type = "function",
            function = new { name = t.Name, description = t.Description, parameters = t.Parameters },
        }).ToArray();

        for (var round = 0; round < SoVongToolToiDa; round++)
        {
            var choPhepTool = round < SoVongToolToiDa - 1; // vòng cuối ép trả lời, không cho gọi thêm công cụ
            object body = choPhepTool
                ? new { model = _settings.Model, messages, tools, tool_choice = "auto", temperature = 0, top_p = 1, max_tokens = 1024, stream = false }
                : new { model = _settings.Model, messages, temperature = 0, top_p = 1, max_tokens = 1024, stream = false };

            using var response = await _http.PostAsJsonAsync("chat/completions", body, ct);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            var msg = json.GetProperty("choices")[0].GetProperty("message");

            var coToolCalls = msg.TryGetProperty("tool_calls", out var tcs)
                              && tcs.ValueKind == JsonValueKind.Array && tcs.GetArrayLength() > 0;

            if (!coToolCalls || !choPhepTool)
                return msg.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String ? c.GetString() ?? "" : "";

            // Ghi lại lượt assistant kèm tool_calls (bắt buộc để API chấp nhận các message role=tool kế tiếp)
            var calls = new List<(string id, string name, string args)>();
            var tcForMsg = new List<object>();
            foreach (var tc in tcs.EnumerateArray())
            {
                var id = tc.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                var fn = tc.GetProperty("function");
                var name = fn.GetProperty("name").GetString() ?? "";
                var args = fn.TryGetProperty("arguments", out var a)
                    ? (a.ValueKind == JsonValueKind.String ? a.GetString() ?? "" : a.GetRawText())
                    : "";
                calls.Add((id, name, args));
                tcForMsg.Add(new { id, type = "function", function = new { name, arguments = args } });
            }
            messages.Add(new { role = "assistant", content = (string?)null, tool_calls = tcForMsg });

            // Thực thi từng công cụ và đưa kết quả trở lại
            foreach (var (id, name, args) in calls)
            {
                string ketQua;
                try { ketQua = await handler(name, args, ct); }
                catch (Exception ex) { ketQua = "Lỗi khi chạy công cụ: " + ex.Message; }
                messages.Add(new { role = "tool", tool_call_id = id, content = string.IsNullOrWhiteSpace(ketQua) ? "(không có kết quả)" : ketQua });
            }
        }

        return "";
    }
}
