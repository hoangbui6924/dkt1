namespace QuanLyTruongHoc.Application.DTOs.KhoaHocNganh;

public record KhoaHocNganhDto(
    int MaKhoaHocNganh,
    string TenKhoaHoc,
    int MaNganhHoc,
    string TenNganh,
    string TenKhoaVien,
    int NamNhapHoc,
    int SoNhomLop);

public record CreateKhoaHocNganhRequest(string TenKhoaHoc, int MaNganhHoc, int NamNhapHoc);

public record UpdateKhoaHocNganhRequest(string TenKhoaHoc, int MaNganhHoc, int NamNhapHoc);
