using QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;
using QuanLyTruongHoc.Domain.Entities;

namespace QuanLyTruongHoc.Application.Common;

// Quy tắc nghiệp vụ đăng ký học phần (logic thuần, không phụ thuộc DbContext) — dùng chung cho
// DangKyHocPhanController (các endpoint đăng ký) và GoiYLichService (xếp lịch), tránh trùng lặp 2 nguồn sự thật.
public static class DangKyRules
{
    // Ngưỡng điểm: đạt khi Z >= 4.0; đã đạt nhưng vẫn được học cải thiện khi Z < 7.0
    public const decimal DiemDat = 4.0m;
    public const decimal DiemHetCaiThien = 7.0m;

    // Giờ Việt Nam (hạn đăng ký lưu dạng wall-clock VN, không timezone)
    public static DateTime VnNow() => DateTime.UtcNow.AddHours(7);

    // Một đợt đăng ký có áp dụng cho sinh viên này không (theo khoá nhập học / khoa viện).
    public static bool DotApDungCho(DotDangKy d, SinhVien sv)
    {
        var khoaNamNhap = sv.KhoaHocNganh?.NamNhapHoc;
        var maKhoaVien = sv.KhoaHocNganh?.NganhHoc?.MaKhoaVien;
        if (d.NamNhapHoc.HasValue) return d.NamNhapHoc == khoaNamNhap;
        if (d.MaKhoaVien.HasValue) return d.MaKhoaVien == maKhoaVien;
        return true; // tất cả
    }

    // Năm thứ + kỳ "đạt tới" của sinh viên trong 1 học kỳ (để biết môn nào tới kỳ học).
    public static (int namThu, int kyDat) TinhKyDat(HocKy hocKy, int namNhapHoc)
    {
        var namBatDauNamHoc = hocKy.NamHoc?.NgayBatDau.Year ?? hocKy.NgayBatDau.Year;
        var namThu = Math.Max(1, namBatDauNamHoc - namNhapHoc + 1);
        int kyDat;
        if (hocKy.LoaiHocKy == "Phụ")
            kyDat = namThu * 2;
        else
        {
            var laHK2 = hocKy.TenHocKy.Contains("2");
            kyDat = (namThu - 1) * 2 + (laHK2 ? 2 : 1);
        }
        return (namThu, kyDat);
    }

    // Quy đổi các buổi lịch của một lớp sang DTO hiển thị (sắp theo ngày/thứ/tiết).
    public static List<BuoiHocDto> ToBuoiHocs(IEnumerable<LichHocLopHocKy> lichs) =>
        lichs.OrderBy(x => x.NgayBatDau).ThenBy(x => x.Thu).ThenBy(x => x.TietBatDau)
            .Select(x => new BuoiHocDto(x.Thu, x.TietBatDau, x.TietKetThuc, x.NgayBatDau, x.NgayKetThuc, x.PhongHoc))
            .ToList();
}
