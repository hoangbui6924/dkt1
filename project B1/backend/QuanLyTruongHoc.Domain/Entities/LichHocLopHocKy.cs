namespace QuanLyTruongHoc.Domain.Entities;

public class LichHocLopHocKy
{
    public int MaLich { get; set; }
    public int MaLopHocKy { get; set; }
    public int Thu { get; set; }
    public int TietBatDau { get; set; }
    public int TietKetThuc { get; set; }
    public string? PhongHoc { get; set; }

    public LopHocTrongKy? LopHocTrongKy { get; set; }
}
