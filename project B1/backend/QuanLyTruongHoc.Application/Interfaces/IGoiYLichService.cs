using QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;
using QuanLyTruongHoc.Domain.Entities;

namespace QuanLyTruongHoc.Application.Interfaces;

// Gợi ý thời khoá biểu bằng AI + giải các dữ liệu liên quan (học kỳ hiện tại, chương trình đào tạo của sinh viên).
// Tách khỏi controller để dùng chung cho cả trang đăng ký và chatbot (agentic tool-calling).
public interface IGoiYLichService
{
    // Gợi ý tối đa vài phương án thời khoá biểu không trùng giờ cho sinh viên, theo yêu cầu tự do. Chỉ gợi ý, không đăng ký.
    Task<List<GoiYThoiKhoaBieuResultDto>> GoiYAsync(SinhVien sv, string yeuCau, CancellationToken ct = default);

    // Học kỳ áp dụng hiện tại cho sinh viên (ưu tiên đợt đang mở, rồi đợt gần nhất, rồi học kỳ mới nhất có lớp).
    Task<HocKy?> ResolveHocKyHienTaiAsync(SinhVien sv);

    // Khung chương trình + trạng thái từng môn của sinh viên trong 1 học kỳ.
    Task<ChuongTrinhDangKyDto> BuildChuongTrinhAsync(SinhVien sv, HocKy hocKy);
}
