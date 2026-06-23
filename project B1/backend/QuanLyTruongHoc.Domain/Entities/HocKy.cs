namespace QuanLyTruongHoc.Domain.Entities;

public class HocKy
{
    public int MaHocKy { get; set; }
    public string TenHocKy { get; set; } = string.Empty;
    public int MaNamHoc { get; set; }
    public DateOnly NgayBatDau { get; set; }
    public DateOnly NgayKetThuc { get; set; }

    public NamHoc? NamHoc { get; set; }
    public ICollection<LopHocTrongKy> LopHocTrongKys { get; set; } = new List<LopHocTrongKy>();
}
