namespace QuanLyTruongHoc.Domain.Entities;

public class Quyen
{
    public int MaQuyen { get; set; }
    public string TenQuyen { get; set; } = string.Empty;

    public ICollection<TaiKhoan> TaiKhoans { get; set; } = new List<TaiKhoan>();
}
