using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using QuanLyTruongHoc.Application.Interfaces;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Tìm kiếm web miễn phí (không cần API key): ưu tiên DuckDuckGo HTML, fallback Wikipedia tiếng Việt.
public class WebSearchService : IWebSearchService
{
    private const int SoKetQua = 4;
    private readonly HttpClient _http;

    public WebSearchService(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(15);
        if (!_http.DefaultRequestHeaders.Contains("User-Agent"))
            _http.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
    }

    public async Task<string> SearchAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return "";
        try
        {
            var ddg = await SearchDuckDuckGoAsync(query, ct);
            if (!string.IsNullOrWhiteSpace(ddg)) return ddg;
        }
        catch { /* rơi xuống fallback */ }

        try
        {
            return await SearchWikipediaViAsync(query, ct);
        }
        catch
        {
            return "";
        }
    }

    private async Task<string> SearchDuckDuckGoAsync(string query, CancellationToken ct)
    {
        var url = "https://html.duckduckgo.com/html/?q=" + Uri.EscapeDataString(query);
        var html = await _http.GetStringAsync(url, ct);

        var titles = Regex.Matches(html, "class=\"result__a\"[^>]*>(.*?)</a>", RegexOptions.Singleline);
        var snippets = Regex.Matches(html, "class=\"result__snippet\"[^>]*>(.*?)</a>", RegexOptions.Singleline);
        var hrefs = Regex.Matches(html, "<a[^>]*class=\"result__a\"[^>]*href=\"([^\"]+)\"", RegexOptions.Singleline);

        var n = Math.Min(SoKetQua, titles.Count);
        if (n == 0) return "";

        var sb = new StringBuilder();
        for (var i = 0; i < n; i++)
        {
            var tieuDe = LamSach(titles[i].Groups[1].Value);
            var trichDoan = i < snippets.Count ? LamSach(snippets[i].Groups[1].Value) : "";
            var link = i < hrefs.Count ? GiaiMaLinkDuckDuckGo(hrefs[i].Groups[1].Value) : "";
            if (tieuDe.Length == 0 && trichDoan.Length == 0) continue;
            sb.AppendLine($"- {tieuDe}: {trichDoan}{(link.Length > 0 ? $" (Nguồn: {link})" : "")}");
        }
        return sb.ToString().Trim();
    }

    private async Task<string> SearchWikipediaViAsync(string query, CancellationToken ct)
    {
        var url = "https://vi.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=" + SoKetQua +
                  "&srsearch=" + Uri.EscapeDataString(query);
        var json = await _http.GetFromJsonAsync<JsonElement>(url, ct);
        if (!json.TryGetProperty("query", out var q) || !q.TryGetProperty("search", out var search)) return "";

        var sb = new StringBuilder();
        foreach (var item in search.EnumerateArray())
        {
            var tieuDe = item.TryGetProperty("title", out var t) ? t.GetString() ?? "" : "";
            var trichDoan = item.TryGetProperty("snippet", out var s) ? LamSach(s.GetString() ?? "") : "";
            if (tieuDe.Length == 0) continue;
            sb.AppendLine($"- {tieuDe}: {trichDoan} (Nguồn: Wikipedia tiếng Việt)");
        }
        return sb.ToString().Trim();
    }

    // Bỏ thẻ HTML + giải mã ký tự đặc biệt
    private static string LamSach(string s)
    {
        var noTags = Regex.Replace(s, "<[^>]+>", "");
        return WebUtility.HtmlDecode(noTags).Trim();
    }

    // DuckDuckGo bọc link thật trong tham số uddg=... -> giải mã ra link gốc
    private static string GiaiMaLinkDuckDuckGo(string href)
    {
        var m = Regex.Match(href, "uddg=([^&]+)");
        if (m.Success) return WebUtility.UrlDecode(m.Groups[1].Value);
        return href.StartsWith("//") ? "https:" + href : href;
    }
}
