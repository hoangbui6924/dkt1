namespace QuanLyTruongHoc.Application.DTOs.BoMon;

public record BoMonDto(int MaBoMon, string TenBoMon, int? MaKhoaVien, string? TenKhoaVien, int SoMonHoc, int SoGiangVien);

public record CreateBoMonRequest(string TenBoMon, int? MaKhoaVien);

public record UpdateBoMonRequest(string TenBoMon, int? MaKhoaVien);
