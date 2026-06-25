namespace QuanLyTruongHoc.Application.DTOs.DiemHocPhan;

public record SinhVienTrongLopDiemDto(
    int MaDangKy,
    int MaSinhVien,
    string MaSoSV,
    string HoTen,
    decimal? DiemX,
    decimal? DiemY,
    decimal? DiemZ,
    string? DiemChu,
    decimal? ThangDiem4,
    string TrangThaiDiem); // ChuaNhap | DaNhap

public record LopDiemInfoDto(
    int MaLopHocKy,
    string TenLop,
    int MaMonHoc,
    string TenMonHoc,
    int SoTinChi,
    int MaHocKy,
    string TenHocKy,
    List<SinhVienTrongLopDiemDto> SinhViens);

public record NhapDiemRequest(decimal? DiemX, decimal? DiemY);
