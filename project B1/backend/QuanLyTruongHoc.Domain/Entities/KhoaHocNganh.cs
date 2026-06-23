namespace QuanLyTruongHoc.Domain.Entities;

public class KhoaHocNganh
{
    public int MaKhoaHocNganh { get; set; }
    public string TenKhoaHoc { get; set; } = string.Empty;
    public int MaNganhHoc { get; set; }

    public NganhHoc? NganhHoc { get; set; }
    public ICollection<NhomLopNganh> NhomLopNganhs { get; set; } = new List<NhomLopNganh>();
}
