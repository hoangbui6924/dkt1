using QuanLyTruongHoc.Domain.Entities;

namespace QuanLyTruongHoc.Application.Common;

// Tiện ích kiểm tra trùng giờ học (logic thuần) — dùng chung cho các controller đăng ký/lớp học phần
// và service xếp lịch, thay vì gọi chéo static giữa các controller (tầng Api).
public static class LichHoc
{
    // Hai buổi học trùng nhau khi: cùng thứ trong tuần, dải tiết giao nhau VÀ khoảng ngày giao nhau.
    public static bool BuoiTrungNhau(
        int thuA, int tietBdA, int tietKtA, DateOnly ngayBdA, DateOnly ngayKtA,
        int thuB, int tietBdB, int tietKtB, DateOnly ngayBdB, DateOnly ngayKtB)
    {
        if (thuA != thuB) return false;
        var trungTiet = tietBdA <= tietKtB && tietBdB <= tietKtA;
        var trungNgay = ngayBdA <= ngayKtB && ngayBdB <= ngayKtA;
        return trungTiet && trungNgay;
    }

    // Hai danh sách buổi học có giao giờ với nhau không.
    public static bool TrungNhau(IEnumerable<LichHocLopHocKy> a, IEnumerable<LichHocLopHocKy> b)
    {
        foreach (var x in a)
            foreach (var y in b)
                if (BuoiTrungNhau(
                    x.Thu, x.TietBatDau, x.TietKetThuc, x.NgayBatDau, x.NgayKetThuc,
                    y.Thu, y.TietBatDau, y.TietKetThuc, y.NgayBatDau, y.NgayKetThuc))
                    return true;
        return false;
    }
}
