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
}
