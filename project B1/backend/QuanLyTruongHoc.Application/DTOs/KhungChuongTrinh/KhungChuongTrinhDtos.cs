namespace QuanLyTruongHoc.Application.DTOs.KhungChuongTrinh;

public record KhungChuongTrinhDto(
    int MaKhungChuongTrinh,
    int MaNganhHoc,
    string TenNganh,
    string TenKhoaVien,
    int TongTinChi,
    int SoTinChiBatBuoc,
    int SoTinChiTuChonToiThieu,
    int SoTinChiBatBuocThucTe,
    int SoTinChiTuChonThucTe,
    int SoMonHoc);

public record CreateKhungChuongTrinhRequest(int MaNganhHoc, int TongTinChi, int SoTinChiBatBuoc, int SoTinChiTuChonToiThieu);

public record UpdateKhungChuongTrinhRequest(int TongTinChi, int SoTinChiBatBuoc, int SoTinChiTuChonToiThieu);

public record MonHocTrongKhungDto(
    int Ma,
    int MaMonHoc,
    string TenMonHoc,
    string LoaiMonHoc,
    int SoTinChi,
    int? MaBoMon,
    string? TenBoMon,
    int? MaKhoaVien,
    string? TenKhoaVien,
    int KyHoc,
    int? MaMonHocTienQuyet,
    string? TenMonHocTienQuyet);

public record AddMonHocVaoKhungRequest(int MaMonHoc, int KyHoc);

public record UpdateKyHocRequest(int KyHoc);
