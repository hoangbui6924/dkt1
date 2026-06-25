namespace QuanLyTruongHoc.Application.DTOs.DotDangKy;

public record DotDangKyDto(
    int MaDot,
    int MaHocKy,
    string TenHocKy,
    string TenNamHoc,
    string Ten,
    string LoaiDot,
    DateTime ThoiGianBatDau,
    DateTime ThoiGianKetThuc,
    bool ChoPhepDangKy,
    bool ChoPhepRut,
    int? NamNhapHoc,
    int? MaKhoaVien,
    string? TenKhoaVien,
    string PhamViMoTa,
    string TrangThai);

public record CreateDotDangKyRequest(
    int MaHocKy,
    string Ten,
    string LoaiDot,
    DateTime ThoiGianBatDau,
    DateTime ThoiGianKetThuc,
    bool ChoPhepDangKy,
    bool ChoPhepRut,
    int? NamNhapHoc,
    int? MaKhoaVien);

public record UpdateDotDangKyRequest(
    string Ten,
    string LoaiDot,
    DateTime ThoiGianBatDau,
    DateTime ThoiGianKetThuc,
    bool ChoPhepDangKy,
    bool ChoPhepRut,
    int? NamNhapHoc,
    int? MaKhoaVien);
