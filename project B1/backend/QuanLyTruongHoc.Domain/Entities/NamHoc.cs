namespace QuanLyTruongHoc.Domain.Entities;

public class NamHoc
{
    public int MaNamHoc { get; set; }
    public string TenNamHoc { get; set; } = string.Empty;
    public DateOnly NgayBatDau { get; set; }
    public DateOnly NgayKetThuc { get; set; }

    public ICollection<HocKy> HocKys { get; set; } = new List<HocKy>();
}
