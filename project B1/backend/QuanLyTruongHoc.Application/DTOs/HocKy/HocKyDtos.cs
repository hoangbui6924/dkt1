namespace QuanLyTruongHoc.Application.DTOs.HocKy;

public record HocKyDto(
    int MaHocKy,
    string TenHocKy,
    int MaNamHoc,
    string TenNamHoc,
    string LoaiHocKy,
    DateOnly NgayBatDau,
    DateOnly NgayKetThuc,
    DateTime? HanDangKyTu,
    DateTime? HanDangKyDen,
    DateTime? HanRutDangKyTu,
    DateTime? HanRutDangKyDen,
    int SoLopHoc);

public record CreateHocKyRequest(
    string TenHocKy,
    int MaNamHoc,
    string LoaiHocKy,
    DateOnly NgayBatDau,
    DateOnly NgayKetThuc,
    DateTime? HanDangKyTu,
    DateTime? HanDangKyDen,
    DateTime? HanRutDangKyTu,
    DateTime? HanRutDangKyDen);

public record UpdateHocKyRequest(
    string TenHocKy,
    string LoaiHocKy,
    DateOnly NgayBatDau,
    DateOnly NgayKetThuc,
    DateTime? HanDangKyTu,
    DateTime? HanDangKyDen,
    DateTime? HanRutDangKyTu,
    DateTime? HanRutDangKyDen);
