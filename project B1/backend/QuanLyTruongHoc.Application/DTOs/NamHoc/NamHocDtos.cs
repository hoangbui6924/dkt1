namespace QuanLyTruongHoc.Application.DTOs.NamHoc;

public record NamHocDto(int MaNamHoc, string TenNamHoc, DateOnly NgayBatDau, DateOnly NgayKetThuc, int SoHocKy);

public record CreateNamHocRequest(string TenNamHoc, DateOnly NgayBatDau, DateOnly NgayKetThuc);

public record UpdateNamHocRequest(string TenNamHoc, DateOnly NgayBatDau, DateOnly NgayKetThuc);
