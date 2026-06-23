namespace QuanLyTruongHoc.Domain.Entities;

public class DangKyLopHoc
{
    public int MaDangKy { get; set; }
    public int MaSinhVien { get; set; }
    public int MaLopHocKy { get; set; }
    public DateTime NgayDangKy { get; set; } = DateTime.UtcNow;
    public string TrangThai { get; set; } = "DaDangKy";

    public SinhVien? SinhVien { get; set; }
    public LopHocTrongKy? LopHocTrongKy { get; set; }
    public DiemHocPhan? DiemHocPhan { get; set; }
}
