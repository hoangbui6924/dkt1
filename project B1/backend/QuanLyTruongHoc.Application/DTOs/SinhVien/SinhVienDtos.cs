namespace QuanLyTruongHoc.Application.DTOs.SinhVien;

public record SinhVienDto(
    int MaSinhVien,
    string MaSoSV,
    string HoTen,
    DateOnly? NgaySinh,
    string? GioiTinh,
    int MaKhoaHocNganh,
    string TenKhoaHoc,
    int MaNganhHoc,
    string TenNganh,
    string TenKhoaVien,
    int? MaNhomLop,
    string? TenNhomLop,
    int? MaTaiKhoan,
    string? TenDangNhapTaiKhoan,
    int TongTinChiTichLuy,
    decimal GPATichLuy);

public record CreateSinhVienRequest(
    string MaSoSV,
    string HoTen,
    DateOnly? NgaySinh,
    string? GioiTinh,
    int MaKhoaHocNganh,
    int? MaNhomLop);

public record UpdateSinhVienRequest(
    string HoTen,
    DateOnly? NgaySinh,
    string? GioiTinh,
    int MaKhoaHocNganh,
    int? MaNhomLop);

public record ImportSinhVienRow(string MaSoSV, string HoTen, string? GioiTinh);

public record ImportSinhVienRequest(int MaKhoaHocNganh, List<ImportSinhVienRow> SinhViens);

public record ImportSinhVienErrorDto(int Dong, string MaSoSV, string Message);

public record ImportSinhVienResultDto(int ThanhCong, int ThatBai, List<ImportSinhVienErrorDto> Loi);
