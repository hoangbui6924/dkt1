namespace QuanLyTruongHoc.Application.DTOs.KhoaVien;

public record KhoaVienDto(int MaKhoaVien, string TenKhoaVien, int SoNganh, int SoBoMon);

public record CreateKhoaVienRequest(string TenKhoaVien);

public record UpdateKhoaVienRequest(string TenKhoaVien);
