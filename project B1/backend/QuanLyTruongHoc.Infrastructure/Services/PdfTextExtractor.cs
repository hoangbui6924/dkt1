using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace QuanLyTruongHoc.Infrastructure.Services;

public static class PdfTextExtractor
{
    // Trích xuất văn bản từng trang của file PDF. Trả về (số trang, danh sách văn bản mỗi trang).
    public static (int SoTrang, List<string> Pages) Extract(byte[] pdfBytes)
    {
        var pages = new List<string>();
        using var doc = PdfDocument.Open(pdfBytes);
        foreach (Page page in doc.GetPages())
            pages.Add(page.Text ?? string.Empty);
        return (pages.Count, pages);
    }
}
