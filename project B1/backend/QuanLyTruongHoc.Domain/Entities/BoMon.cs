namespace QuanLyTruongHoc.Domain.Entities;

public class BoMon
{
    public int MaBoMon { get; set; }
    public string TenBoMon { get; set; } = string.Empty;
    public int? MaKhoaVien { get; set; }

    public KhoaVien? KhoaVien { get; set; }
    public ICollection<MonHoc> MonHocs { get; set; } = new List<MonHoc>();
    public ICollection<GiangVien> GiangViens { get; set; } = new List<GiangVien>();
}
