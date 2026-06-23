namespace QuanLyTruongHoc.Domain.Entities;

public class KetQuaHocTapKy
{
    public int MaSinhVien { get; set; }
    public int MaHocKy { get; set; }
    public int TinChiDangKyKy { get; set; }
    public int TinChiDatKy { get; set; }
    public decimal? GPAKy { get; set; }
    public int TinChiTichLuyDenKy { get; set; }
    public decimal? GPATichLuyDenKy { get; set; }

    public SinhVien? SinhVien { get; set; }
    public HocKy? HocKy { get; set; }
}
