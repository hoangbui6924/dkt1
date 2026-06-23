namespace QuanLyTruongHoc.Domain.Entities;

public class KhungChuongTrinh
{
    public int MaKhungChuongTrinh { get; set; }
    public int MaNganhHoc { get; set; }
    public int TongTinChi { get; set; }
    public int SoTinChiBatBuoc { get; set; }
    public int SoTinChiTuChonToiThieu { get; set; }

    public NganhHoc? NganhHoc { get; set; }
    public ICollection<MonHocThuocKhungChuongTrinh> MonHocThuocKhungChuongTrinhs { get; set; } = new List<MonHocThuocKhungChuongTrinh>();
}
