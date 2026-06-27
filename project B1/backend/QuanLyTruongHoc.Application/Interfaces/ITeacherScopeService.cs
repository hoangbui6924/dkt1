using System.Security.Claims;

namespace QuanLyTruongHoc.Application.Interfaces;

// Phạm vi của giảng viên đang đăng nhập: mã GV + khoa viện (để lọc/chặn dữ liệu theo khoa viện).
public record TeacherScope(int MaGiangVien, int? MaKhoaVien);

public interface ITeacherScopeService
{
    // True nếu token hiện tại có vai trò GiangVien (claim role).
    bool IsGiangVien(ClaimsPrincipal user);

    // Phân giải mã GV + khoa viện từ JWT (sub = MaTaiKhoan). Trả null nếu không phải GV hoặc không tìm thấy.
    Task<TeacherScope?> ResolveAsync(ClaimsPrincipal user);
}
