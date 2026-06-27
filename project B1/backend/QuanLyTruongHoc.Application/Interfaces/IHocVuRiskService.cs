namespace QuanLyTruongHoc.Application.Interfaces;

// Đánh giá rủi ro học vụ (nguy cơ trượt môn / sa sút kết quả) cho 1 sinh viên — dùng cho tool chatbot.
// Trả thẳng text đã tổng hợp (mức rủi ro, môn đáng lo, lý do, gợi ý khắc phục) để LLM diễn giải tiếp.
public interface IHocVuRiskService
{
    Task<string> TomTatRuiRoAsync(int maSinhVien);
}
