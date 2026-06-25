namespace QuanLyTruongHoc.Application.DTOs.KetQuaHocTap;

public record HocPhanKetQuaDto(
    int MaMonHoc,
    string TenMonHoc,
    int SoTinChi,
    decimal? DiemX,
    decimal? DiemY,
    decimal? DiemZ,
    string? DiemChu,
    string? GhiChu);

public record HocKyKetQuaDto(
    int MaHocKy,
    string TenHocKy,
    string TenNamHoc,
    List<HocPhanKetQuaDto> HocPhans);

public record KetQuaHocTapDto(
    string MaSoSV,
    string HoTen,
    DateOnly? NgaySinh,
    string? GioiTinh,
    string TenNhomLop,
    int TongTinChiTichLuy,
    decimal GPATichLuy,
    List<HocKyKetQuaDto> HocKys);
