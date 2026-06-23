namespace QuanLyTruongHoc.Domain.Entities;

public class TaiKhoan
{
    public int MaTaiKhoan { get; set; }
    public string TenDangNhap { get; set; } = string.Empty;
    public string MatKhauHash { get; set; } = string.Empty;
    public int MaQuyen { get; set; }
    public bool TrangThai { get; set; } = true;
    public DateTime NgayTao { get; set; } = DateTime.UtcNow;

    public Quyen? Quyen { get; set; }
}
