namespace QuanLyTruongHoc.Domain.Entities;

public class DotDangKy
{
    public int MaDot { get; set; }
    public int MaHocKy { get; set; }
    public string Ten { get; set; } = string.Empty;
    public string LoaiDot { get; set; } = "Lan1"; // Lan1 | Lan2
    public DateTime ThoiGianBatDau { get; set; }
    public DateTime ThoiGianKetThuc { get; set; }
    public bool ChoPhepDangKy { get; set; } = true;
    public bool ChoPhepRut { get; set; }

    // Phạm vi: cả hai null = tất cả; NamNhapHoc set = chỉ khoá đó; MaKhoaVien set = chỉ khoa viện đó
    public int? NamNhapHoc { get; set; }
    public int? MaKhoaVien { get; set; }

    public HocKy? HocKy { get; set; }
    public KhoaVien? KhoaVien { get; set; }
}
