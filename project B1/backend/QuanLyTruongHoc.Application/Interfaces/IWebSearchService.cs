namespace QuanLyTruongHoc.Application.Interfaces;

public interface IWebSearchService
{
    // Tìm kiếm web, trả về vài kết quả (tiêu đề + trích đoạn + link) dạng văn bản gọn cho mô hình đọc.
    // Trả chuỗi rỗng nếu không có kết quả / lỗi.
    Task<string> SearchAsync(string query, CancellationToken ct = default);
}
