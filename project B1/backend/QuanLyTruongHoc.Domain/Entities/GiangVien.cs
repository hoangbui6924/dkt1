namespace QuanLyTruongHoc.Domain.Entities;

public class GiangVien
{
    public int MaGiangVien { get; set; }
    public string HoTen { get; set; } = string.Empty;
    public int? MaBoMon { get; set; }
    public int? MaKhoaVien { get; set; }
    public int? MaTaiKhoan { get; set; }
    public string? Email { get; set; }
    public string? SoDienThoai { get; set; }

    public BoMon? BoMon { get; set; }
    public KhoaVien? KhoaVien { get; set; }
    public TaiKhoan? TaiKhoan { get; set; }
    public ICollection<LopHocKyGiangVien> LopHocKyGiangViens { get; set; } = new List<LopHocKyGiangVien>();
}
