namespace QuanLyTruongHoc.Application.DTOs.GiangVien;

public record GiangVienDto(
    int MaGiangVien,
    string HoTen,
    int? MaBoMon,
    string? TenBoMon,
    int? MaKhoaVien,
    string? TenKhoaVien,
    string? Email,
    string? SoDienThoai,
    int? MaTaiKhoan,
    string? TenDangNhapTaiKhoan,
    int SoLopDangDay);

public record CreateGiangVienRequest(string HoTen, int? MaBoMon, int? MaKhoaVien, string? Email, string? SoDienThoai);

public record UpdateGiangVienRequest(string HoTen, int? MaBoMon, int? MaKhoaVien, string? Email, string? SoDienThoai);
