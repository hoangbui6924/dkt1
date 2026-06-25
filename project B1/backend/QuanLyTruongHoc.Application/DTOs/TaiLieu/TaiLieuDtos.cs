namespace QuanLyTruongHoc.Application.DTOs.TaiLieu;

public record TaiLieuDto(
    int MaTaiLieu,
    string TenFile,
    string LoaiTaiLieu,
    int? MaMonHoc,
    string? TenMonHoc,
    long KichThuocBytes,
    int SoTrang,
    int SoChunk,
    string TrangThai,
    string? GhiChuXuLy,
    DateTime NgayTaiLen,
    string TenNguoiTaiLen);

// Tài liệu hiển thị cho sinh viên tải về (gộp theo môn học / loại)
public record TaiLieuSinhVienDto(
    int MaTaiLieu,
    string TenFile,
    string LoaiTaiLieu,
    int? MaMonHoc,
    string? TenMonHoc,
    long KichThuocBytes,
    int SoTrang,
    DateTime NgayTaiLen);

// ===== Chatbot =====
public record ChatLichSuItem(string VaiTro, string NoiDung); // VaiTro: "user" | "bot"

public record ChatbotRequest(string CauHoi, int? MaMonHoc, List<ChatLichSuItem>? LichSu = null);

public record NguonTraLoiDto(int MaTaiLieu, string TenFile, int Trang);

public record ChatbotResponse(string TraLoi, List<NguonTraLoiDto> Nguon);
