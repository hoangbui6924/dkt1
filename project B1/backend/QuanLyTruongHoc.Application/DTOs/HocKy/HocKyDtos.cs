namespace QuanLyTruongHoc.Application.DTOs.HocKy;

public record HocKyDto(
    int MaHocKy,
    string TenHocKy,
    int MaNamHoc,
    string TenNamHoc,
    DateOnly NgayBatDau,
    DateOnly NgayKetThuc,
    int SoLopHoc);

public record CreateHocKyRequest(string TenHocKy, int MaNamHoc, DateOnly NgayBatDau, DateOnly NgayKetThuc);

public record UpdateHocKyRequest(string TenHocKy, DateOnly NgayBatDau, DateOnly NgayKetThuc);
