using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Thử lại các lỗi TẠM THỜI khi gọi NVIDIA (429 rate-limit / 5xx / lỗi mạng) với exponential
// backoff + jitter, honor Retry-After nếu server gửi. NVIDIA free tier hay trả 429 khi bận.
// ponytail: tự viết thay vì AddStandardResilienceHandler — handler đó áp per-attempt timeout
// mặc định 10s sẽ giết call LLM ~20s. Giữ nguyên HttpClient.Timeout của từng service.
internal static class HttpRetry
{
    public static Task<HttpResponseMessage> PostJsonWithRetryAsync(
        HttpClient http, string url, object body, int maxAttempts, CancellationToken ct) =>
        SendWithRetryAsync(http,
            () => new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) },
            HttpCompletionOption.ResponseContentRead, maxAttempts, ct);

    // Phiên bản tổng quát: nhận factory tạo request MỚI mỗi lần thử (request đã gửi không tái dùng được).
    // completion = ResponseHeadersRead cho streaming (đọc header xong là trả, body đọc dần).
    public static async Task<HttpResponseMessage> SendWithRetryAsync(
        HttpClient http, Func<HttpRequestMessage> makeRequest,
        HttpCompletionOption completion, int maxAttempts, CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            HttpResponseMessage resp;
            try
            {
                resp = await http.SendAsync(makeRequest(), completion, ct);
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                // Lỗi mạng/DNS/kết nối tạm thời -> backoff rồi thử lại.
                await Task.Delay(Backoff(attempt, retryAfter: null), ct);
                continue;
            }

            if (IsTransient(resp.StatusCode) && attempt < maxAttempts)
            {
                var delay = Backoff(attempt, resp.Headers.RetryAfter);
                resp.Dispose();
                await Task.Delay(delay, ct);
                continue;
            }

            // ponytail: ceiling = tối đa maxAttempts lần; KHÔNG retry timeout (TaskCanceledException)
            // vì với LLM chậm, timeout thường là call thật đang chạy, không phải lỗi tạm thời.
            return resp;
        }
    }

    private static bool IsTransient(HttpStatusCode code) =>
        code == HttpStatusCode.TooManyRequests || (int)code >= 500;

    private static TimeSpan Backoff(int attempt, RetryConditionHeaderValue? retryAfter)
    {
        // 1) Tôn trọng Retry-After server gửi (cả dạng số giây lẫn dạng HTTP-date).
        if (retryAfter?.Delta is { } delta && delta > TimeSpan.Zero) return delta;
        if (retryAfter?.Date is { } date)
        {
            var wait = date - DateTimeOffset.UtcNow;
            if (wait > TimeSpan.Zero) return wait;
        }
        // 2) Mặc định: exponential backoff (~1s, 2s, 4s...) + jitter chống đồng loạt.
        var baseMs = 1000 * Math.Pow(2, attempt - 1);
        return TimeSpan.FromMilliseconds(baseMs + Random.Shared.Next(0, 250));
    }
}
