namespace QuanLyTruongHoc.Domain.Entities;

public class KhoaVien
{
    public int MaKhoaVien { get; set; }
    public string TenKhoaVien { get; set; } = string.Empty;

    public ICollection<NganhHoc> NganhHocs { get; set; } = new List<NganhHoc>();
    public ICollection<BoMon> BoMons { get; set; } = new List<BoMon>();
}
