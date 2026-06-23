namespace QuanLyTruongHoc.Domain.Entities;

public class LopHocKyGiangVien
{
    public int MaLopHocKy { get; set; }
    public int MaGiangVien { get; set; }
    public string? VaiTro { get; set; }

    public LopHocTrongKy? LopHocTrongKy { get; set; }
    public GiangVien? GiangVien { get; set; }
}
