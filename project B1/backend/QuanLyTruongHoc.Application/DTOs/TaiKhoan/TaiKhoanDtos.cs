namespace QuanLyTruongHoc.Application.DTOs.TaiKhoan;

public record TaiKhoanDto(
    int MaTaiKhoan,
    string TenDangNhap,
    int MaQuyen,
    string TenQuyen,
    bool TrangThai,
    DateTime NgayTao,
    string? HoTen,
    string? MaSoSV,
    string? Email);

public record UpdateTaiKhoanRequest(string TenDangNhap, bool TrangThai);

public record DatLaiMatKhauResponse(string MatKhauMoi);
