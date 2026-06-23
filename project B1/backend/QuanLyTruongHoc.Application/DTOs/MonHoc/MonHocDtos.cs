namespace QuanLyTruongHoc.Application.DTOs.MonHoc;

public record MonHocDto(
    int MaMonHoc,
    string TenMonHoc,
    string LoaiMonHoc,
    int SoTinChi,
    int? MaBoMon,
    string? TenBoMon,
    int? MaKhoaVien,
    string? TenKhoaVien,
    int? MaMonHocTienQuyet,
    string? TenMonHocTienQuyet,
    int SoLopHocKy);

public record CreateMonHocRequest(
    string TenMonHoc,
    string LoaiMonHoc,
    int SoTinChi,
    int? MaBoMon,
    int? MaKhoaVien,
    int? MaMonHocTienQuyet);

public record UpdateMonHocRequest(
    string TenMonHoc,
    string LoaiMonHoc,
    int SoTinChi,
    int? MaBoMon,
    int? MaKhoaVien,
    int? MaMonHocTienQuyet);
