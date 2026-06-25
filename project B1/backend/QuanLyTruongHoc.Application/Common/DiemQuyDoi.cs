namespace QuanLyTruongHoc.Application.Common;

public static class DiemQuyDoi
{
    public const decimal DiemDat = 4.0m;

    public static (string DiemChu, decimal ThangDiem4) TinhDiemChuVaThang4(decimal z)
    {
        if (z >= 9.0m) return ("A+", 4.0m);
        if (z >= 8.5m) return ("A", 4.0m);
        if (z >= 8.0m) return ("B+", 3.5m);
        if (z >= 7.0m) return ("B", 3.0m);
        if (z >= 6.5m) return ("C+", 2.5m);
        if (z >= 5.5m) return ("C", 2.0m);
        if (z >= 5.0m) return ("D+", 1.5m);
        if (z >= 4.0m) return ("D", 1.0m);
        return ("F", 0m);
    }
}
