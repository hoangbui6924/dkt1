using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using QuanLyTruongHoc.Application.Interfaces;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Nhúng văn bản dùng API embeddings tương thích OpenAI của NVIDIA NIM (nv-embedqa-e5-v5, 1024 chiều)
public class NvidiaEmbeddingService : IEmbeddingService
{
    private const int BatchSize = 32; // số đoạn tối đa nhúng trong 1 lần gọi API

    private readonly HttpClient _http;
    private readonly NvidiaAiSettings _settings;

    public NvidiaEmbeddingService(HttpClient http, IOptions<NvidiaAiSettings> options)
    {
        _settings = options.Value;
        _http = http;
        _http.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        _http.Timeout = TimeSpan.FromSeconds(120);
    }

    public async Task<List<float[]>> EmbedPassagesAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        var result = new List<float[]>(texts.Count);
        for (var i = 0; i < texts.Count; i += BatchSize)
        {
            var batch = texts.Skip(i).Take(BatchSize).ToList();
            result.AddRange(await EmbedBatchAsync(batch, "passage", ct));
        }
        return result;
    }

    public async Task<float[]> EmbedQueryAsync(string text, CancellationToken ct = default)
    {
        var res = await EmbedBatchAsync(new[] { text }, "query", ct);
        return res[0];
    }

    private async Task<List<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, string inputType, CancellationToken ct)
    {
        var body = new
        {
            input = texts,
            model = _settings.EmbeddingModel,
            input_type = inputType,
            encoding_format = "float",
            truncate = "END",
        };

        using var response = await HttpRetry.PostJsonWithRetryAsync(_http, "embeddings", body, maxAttempts: 3, ct);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);

        var list = new List<float[]>(texts.Count);
        foreach (var item in json.GetProperty("data").EnumerateArray())
        {
            var arr = item.GetProperty("embedding");
            var vec = new float[arr.GetArrayLength()];
            var idx = 0;
            foreach (var v in arr.EnumerateArray()) vec[idx++] = v.GetSingle();
            list.Add(vec);
        }
        return list;
    }
}
