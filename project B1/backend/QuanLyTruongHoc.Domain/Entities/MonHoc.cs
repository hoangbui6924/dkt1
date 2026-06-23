namespace QuanLyTruongHoc.Domain.Entities;

public class MonHoc
{
    public int MaMonHoc { get; set; }
    public string TenMonHoc { get; set; } = string.Empty;
    public string LoaiMonHoc { get; set; } = string.Empty;
    public int SoTinChi { get; set; }
    public int? MaBoMon { get; set; }
    public int? MaKhoaVien { get; set; }
    public int? MaMonHocTienQuyet { get; set; }

    public BoMon? BoMon { get; set; }
    public KhoaVien? KhoaVien { get; set; }
    public MonHoc? MonHocTienQuyet { get; set; }
    public ICollection<MonHocThuocKhungChuongTrinh> MonHocThuocKhungChuongTrinhs { get; set; } = new List<MonHocThuocKhungChuongTrinh>();
    public ICollection<LopHocTrongKy> LopHocTrongKys { get; set; } = new List<LopHocTrongKy>();
}
