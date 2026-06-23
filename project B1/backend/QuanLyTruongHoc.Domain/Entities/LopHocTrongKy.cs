namespace QuanLyTruongHoc.Domain.Entities;

public class LopHocTrongKy
{
    public int MaLopHocKy { get; set; }
    public int MaMonHoc { get; set; }
    public int MaHocKy { get; set; }
    public string TenLop { get; set; } = string.Empty;
    public string LoaiHinh { get; set; } = "Lý thuyết";
    public int SiSoToiDa { get; set; } = 60;

    public MonHoc? MonHoc { get; set; }
    public HocKy? HocKy { get; set; }
    public ICollection<LichHocLopHocKy> LichHocs { get; set; } = new List<LichHocLopHocKy>();
    public ICollection<LopHocKyGiangVien> LopHocKyGiangViens { get; set; } = new List<LopHocKyGiangVien>();
    public ICollection<DangKyLopHoc> DangKyLopHocs { get; set; } = new List<DangKyLopHoc>();
}
