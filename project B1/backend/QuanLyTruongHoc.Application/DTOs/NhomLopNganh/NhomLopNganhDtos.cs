namespace QuanLyTruongHoc.Application.DTOs.NhomLopNganh;

public record NhomLopNganhDto(
    int MaNhomLop,
    string TenNhomLop,
    int MaKhoaHocNganh,
    string TenKhoaHoc,
    string TenNganh,
    int SoSinhVien,
    int? MaCoVanHocTap,
    string? TenCoVanHocTap);

public record CreateNhomLopNganhRequest(string TenNhomLop, int MaKhoaHocNganh);

public record UpdateNhomLopNganhRequest(string TenNhomLop, int MaKhoaHocNganh);

public record SinhVienTrongNhomDto(int MaSinhVien, string MaSoSV, string HoTen, string? GioiTinh);

public record AddSinhVienVaoNhomRequest(int MaSinhVien);

public record SetCoVanHocTapRequest(int? MaGiangVien);

public record ImportSinhVienVaoNhomRow(string MaSoSV, string? HoTen);

public record ImportSinhVienVaoNhomRequest(List<ImportSinhVienVaoNhomRow> SinhViens);

public record ImportSinhVienVaoNhomErrorDto(int Dong, string MaSoSV, string Message);

public record ImportSinhVienVaoNhomResultDto(int ThanhCong, int ThatBai, List<ImportSinhVienVaoNhomErrorDto> Loi);
