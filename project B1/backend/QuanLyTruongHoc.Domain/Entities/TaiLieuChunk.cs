namespace QuanLyTruongHoc.Domain.Entities;

// Một đoạn văn bản tách từ tài liệu PDF, kèm vector nhúng để tra cứu ngữ nghĩa (RAG)
public class TaiLieuChunk
{
    public int MaChunk { get; set; }
    public int MaTaiLieu { get; set; }
    public int ChiSo { get; set; }            // thứ tự đoạn trong tài liệu
    public int Trang { get; set; }            // số trang gần đúng đoạn này thuộc về
    public string NoiDung { get; set; } = string.Empty;
    public string Embedding { get; set; } = string.Empty; // vector 1024 chiều, lưu dạng "f1,f2,..."

    public TaiLieu? TaiLieu { get; set; }
}
