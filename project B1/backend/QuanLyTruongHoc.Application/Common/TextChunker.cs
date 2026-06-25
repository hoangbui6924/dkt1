using System.Text;

namespace QuanLyTruongHoc.Application.Common;

public record ChunkResult(int Trang, string NoiDung);

public static class TextChunker
{
    // Tách văn bản từng trang thành các đoạn ~ChunkSize ký tự, có phần chồng lấp để giữ ngữ cảnh giữa các đoạn.
    public static List<ChunkResult> Chunk(IReadOnlyList<string> pages, int chunkSize = 900, int overlap = 150)
    {
        var result = new List<ChunkResult>();
        for (var p = 0; p < pages.Count; p++)
        {
            var text = ChuanHoaKhoangTrang(pages[p]);
            if (text.Length == 0) continue;

            var start = 0;
            while (start < text.Length)
            {
                var len = Math.Min(chunkSize, text.Length - start);
                // Cố gắng cắt tại ranh giới câu/khoảng trắng gần nhất để đoạn không bị đứt giữa chừng
                if (start + len < text.Length)
                {
                    var lastBreak = text.LastIndexOfAny(new[] { '.', '\n', '!', '?', ';' }, start + len - 1, Math.Min(len, 200));
                    if (lastBreak > start + chunkSize / 2) len = lastBreak - start + 1;
                }

                var noiDung = text.Substring(start, len).Trim();
                if (noiDung.Length > 20)
                    result.Add(new ChunkResult(p + 1, noiDung));

                if (start + len >= text.Length) break;
                start += Math.Max(1, len - overlap);
            }
        }
        return result;
    }

    private static string ChuanHoaKhoangTrang(string s)
    {
        var sb = new StringBuilder(s.Length);
        var lastWasSpace = false;
        foreach (var c in s)
        {
            if (char.IsWhiteSpace(c))
            {
                if (c == '\n')
                {
                    sb.Append('\n');
                    lastWasSpace = true;
                }
                else if (!lastWasSpace)
                {
                    sb.Append(' ');
                    lastWasSpace = true;
                }
            }
            else
            {
                sb.Append(c);
                lastWasSpace = false;
            }
        }
        return sb.ToString().Trim();
    }
}
