namespace QuanLyTruongHoc.Domain.Entities;

public class SinhVien
{
    public int MaSinhVien { get; set; }
    public string MaSoSV { get; set; } = string.Empty;
    public string HoTen { get; set; } = string.Empty;
    public DateOnly? NgaySinh { get; set; }
    public string? GioiTinh { get; set; }
    public int MaKhoaHocNganh { get; set; }
    public int? MaNhomLop { get; set; }
    public int? MaTaiKhoan { get; set; }
    public int TongTinChiTichLuy { get; set; }
    public decimal GPATichLuy { get; set; }

    public KhoaHocNganh? KhoaHocNganh { get; set; }
    public NhomLopNganh? NhomLopNganh { get; set; }
    public TaiKhoan? TaiKhoan { get; set; }
    public ICollection<DangKyLopHoc> DangKyLopHocs { get; set; } = new List<DangKyLopHoc>();
    public ICollection<KetQuaHocTapKy> KetQuaHocTapKys { get; set; } = new List<KetQuaHocTapKy>();
}
