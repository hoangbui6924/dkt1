namespace QuanLyTruongHoc.Application.DTOs.LopHocTrongKy;

public record LichHocDto(int MaLich, int Thu, int TietBatDau, int TietKetThuc, DateOnly NgayBatDau, DateOnly NgayKetThuc, string? PhongHoc);

public record LichHocInput(int Thu, int TietBatDau, int TietKetThuc, DateOnly NgayBatDau, DateOnly NgayKetThuc, string? PhongHoc);

public record LopHocTrongKyDto(
    int MaLopHocKy,
    string TenLop,
    string LoaiHinh,
    int SiSoToiDa,
    int SoLuongDaDangKy,
    int MaMonHoc,
    string TenMonHoc,
    int SoTinChi,
    int MaHocKy,
    string TenHocKy,
    int? MaGiangVien,
    string? TenGiangVien,
    List<LichHocDto> LichHocs);

public record CreateLopHocTrongKyRequest(
    int MaMonHoc,
    int MaHocKy,
    string TenLop,
    string LoaiHinh,
    int SiSoToiDa,
    int? MaGiangVien,
    List<LichHocInput> LichHocs);

public record UpdateLopHocTrongKyRequest(
    string TenLop,
    string LoaiHinh,
    int SiSoToiDa,
    int? MaGiangVien,
    List<LichHocInput> LichHocs);
