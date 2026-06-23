namespace QuanLyTruongHoc.Application.DTOs.NganhHoc;

public record NganhHocDto(int MaNganh, string TenNganh, int MaKhoaVien, string TenKhoaVien, int SoNhomLop);

public record CreateNganhHocRequest(string TenNganh, int MaKhoaVien);

public record UpdateNganhHocRequest(string TenNganh, int MaKhoaVien);
