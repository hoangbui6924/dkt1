namespace QuanLyTruongHoc.Domain.Entities;

// Tài liệu PDF do admin tải lên: nội quy trường, sổ tay sinh viên, giáo trình môn học...
public class TaiLieu
{
    public int MaTaiLieu { get; set; }
    public string TenFile { get; set; } = string.Empty;
    public string LoaiTaiLieu { get; set; } = string.Empty; // NoiQuy | SoTay | GiaoTrinh
    public int? MaMonHoc { get; set; }                       // chỉ áp dụng cho GiaoTrinh
    public long KichThuocBytes { get; set; }
    public int SoTrang { get; set; }
    public byte[] NoiDungFile { get; set; } = Array.Empty<byte>();
    public string TrangThai { get; set; } = "DangXuLy";      // DangXuLy | DaXuLy | Loi
    public string? GhiChuXuLy { get; set; }
    public DateTime NgayTaiLen { get; set; }
    public int MaNguoiTaiLen { get; set; }
    public string TenNguoiTaiLen { get; set; } = string.Empty;

    public MonHoc? MonHoc { get; set; }
    public ICollection<TaiLieuChunk> Chunks { get; set; } = new List<TaiLieuChunk>();
}
