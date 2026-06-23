namespace QuanLyTruongHoc.Domain.Entities;

public class NganhHoc
{
    public int MaNganh { get; set; }
    public string TenNganh { get; set; } = string.Empty;
    public int MaKhoaVien { get; set; }

    public KhoaVien? KhoaVien { get; set; }
    public ICollection<KhoaHocNganh> KhoaHocNganhs { get; set; } = new List<KhoaHocNganh>();
    public KhungChuongTrinh? KhungChuongTrinh { get; set; }
}
