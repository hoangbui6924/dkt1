namespace QuanLyTruongHoc.Domain.Entities;

public class DiemHocPhan
{
    public int MaDangKy { get; set; }
    public decimal? DiemX { get; set; }
    public decimal? DiemY { get; set; }
    public decimal? DiemZ { get; set; }
    public DateTime? NgayNhapDiem { get; set; }

    public DangKyLopHoc? DangKyLopHoc { get; set; }
}
