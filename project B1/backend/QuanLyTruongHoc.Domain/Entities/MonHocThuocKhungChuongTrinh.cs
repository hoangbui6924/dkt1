namespace QuanLyTruongHoc.Domain.Entities;

public class MonHocThuocKhungChuongTrinh
{
    public int Ma { get; set; }
    public int MaKhungChuongTrinh { get; set; }
    public int MaMonHoc { get; set; }
    public int KyHoc { get; set; }

    public KhungChuongTrinh? KhungChuongTrinh { get; set; }
    public MonHoc? MonHoc { get; set; }
}
