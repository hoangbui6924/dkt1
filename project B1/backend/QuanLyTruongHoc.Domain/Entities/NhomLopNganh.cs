namespace QuanLyTruongHoc.Domain.Entities;

public class NhomLopNganh
{
    public int MaNhomLop { get; set; }
    public string TenNhomLop { get; set; } = string.Empty;
    public int MaKhoaHocNganh { get; set; }
    public int? MaCoVanHocTap { get; set; }

    public KhoaHocNganh? KhoaHocNganh { get; set; }
    public GiangVien? CoVanHocTap { get; set; }
    public ICollection<SinhVien> SinhViens { get; set; } = new List<SinhVien>();
}
