namespace QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;

public record BuoiHocDto(int Thu, int TietBatDau, int TietKetThuc, DateOnly NgayBatDau, DateOnly NgayKetThuc, string? PhongHoc);

// Học kỳ áp dụng cho đăng ký + trạng thái hạn
public record HocKyDangKyDto(
    int MaHocKy,
    string TenHocKy,
    string LoaiHocKy,
    int MaNamHoc,
    string TenNamHoc,
    DateOnly NgayBatDau,
    DateOnly NgayKetThuc,
    DateTime? HanDangKyTu,
    DateTime? HanDangKyDen,
    DateTime? HanRutDangKyTu,
    DateTime? HanRutDangKyDen,
    bool DangMoDangKy,
    bool DangMoRut,
    string? TenDotHienTai);

// Một lớp sinh viên đã đăng ký trong học kỳ
public record LopDaDangKyDto(
    int MaDangKy,
    int MaLopHocKy,
    string TenLop,
    int MaMonHoc,
    string TenMonHoc,
    int SoTinChi,
    string LoaiHinh,
    int? MaGiangVien,
    string? TenGiangVien,
    int SoLuongDaDangKy,
    int SiSoToiDa,
    List<BuoiHocDto> BuoiHocs);

// Một môn trong khung chương trình của sinh viên (hiển thị toàn bộ)
public record MonHocChuongTrinhDto(
    int MaMonHoc,
    string TenMonHoc,
    string LoaiMonHoc,
    int SoTinChi,
    int KyHoc,
    string TrangThai,           // DaDat | KhongDat | ChuaHoc | DangHoc
    decimal? DiemZCaoNhat,
    bool CoLop,
    bool CaiThien,
    bool DaDangKyKyNay,
    bool KhongDuDieuKien,
    bool ChuaToiKy,
    bool CoTheDangKy,
    string? LyDoKhongDangKy);

public record ChuongTrinhDangKyDto(int NamThu, int KyDat, List<MonHocChuongTrinhDto> MonHocs);

// Một lớp của một môn (hiển thị trong modal chọn lớp)
public record LopCuaMonDto(
    int MaLopHocKy,
    string TenLop,
    string LoaiHinh,
    int? MaGiangVien,
    string? TenGiangVien,
    int SoLuongDaDangKy,
    int SiSoToiDa,
    bool DaDay,
    bool TrungLich,
    bool LaLopHienTai,
    List<BuoiHocDto> BuoiHocs);

// Đổi sang lớp khác của môn đã đăng ký
public record DoiLopRequest(int MaLopHocKyMoi);

// Yêu cầu gợi ý thời khoá biểu bằng AI (sinh viên nhập tự do)
public record GoiYThoiKhoaBieuRequest(string YeuCau);

// Một môn đã được AI xếp vào thời khoá biểu gợi ý
public record MonHocGoiYDto(
    int MaMonHoc,
    string TenMonHoc,
    int MaLopHocKy,
    string TenLop,
    string LoaiHinh,
    int SoTinChi,
    string? TenGiangVien,
    List<BuoiHocDto> BuoiHocs);

// Một môn không thể xếp được vào thời khoá biểu gợi ý, kèm lý do
public record MonKhongXepDuocDto(string TenMonHoc, string LyDo);

public record GoiYThoiKhoaBieuResultDto(
    List<MonHocGoiYDto> MonHocs,
    List<MonKhongXepDuocDto> MonKhongXepDuoc,
    List<string> GhiChu);
