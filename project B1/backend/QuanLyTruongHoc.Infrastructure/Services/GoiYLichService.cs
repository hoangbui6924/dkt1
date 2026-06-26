using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using static QuanLyTruongHoc.Application.Common.DangKyRules;
using QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Logic gợi ý thời khoá biểu bằng AI — tách khỏi DangKyHocPhanController theo quy ước "controller mỏng, logic ở service".
// Dùng chung cho trang đăng ký (endpoint) và chatbot (tool agentic gọi in-process).
public class GoiYLichService : IGoiYLichService
{
    // Giới hạn số nhánh xét trong thuật toán xếp lịch để tránh bùng nổ tổ hợp ở trường hợp xấu
    private const int GioiHanNutXepLich = 200_000;

    // Số lượng phương án thời khoá biểu tối đa gợi ý cho sinh viên chọn
    private const int SoLuongGoiYToiDa = 5;

    private readonly AppDbContext _db;
    private readonly IAiChatService _aiChat;
    private int _soNutDaXet;

    public GoiYLichService(AppDbContext db, IAiChatService aiChat)
    {
        _db = db;
        _aiChat = aiChat;
    }

    // Học kỳ áp dụng hiện tại cho 1 sinh viên (ưu tiên đợt đang mở, sau đó đợt gần nhất, cuối cùng là học kỳ mới nhất có lớp)
    public async Task<HocKy?> ResolveHocKyHienTaiAsync(SinhVien sv)
    {
        var now = VnNow();
        var dots = await _db.DotDangKys.Include(d => d.HocKy).ThenInclude(h => h!.NamHoc).ToListAsync();
        var dotsCuaSv = dots.Where(d => DotApDungCho(d, sv)).ToList();

        var dotMo = dotsCuaSv
            .Where(d => now >= d.ThoiGianBatDau && now <= d.ThoiGianKetThuc)
            .OrderByDescending(d => d.ThoiGianBatDau).ToList();

        if (dotMo.Count > 0) return dotMo[0].HocKy;
        if (dotsCuaSv.Count > 0) return dotsCuaSv.OrderByDescending(d => d.ThoiGianBatDau).First().HocKy;

        return await _db.HocKys.Include(h => h.NamHoc).Where(h => h.LopHocTrongKys.Any())
                    .OrderByDescending(h => h.NgayBatDau).FirstOrDefaultAsync()
                ?? await _db.HocKys.Include(h => h.NamHoc).OrderByDescending(h => h.NgayBatDau).FirstOrDefaultAsync();
    }

    public async Task<ChuongTrinhDangKyDto> BuildChuongTrinhAsync(SinhVien sv, HocKy hocKy)
    {
        var maNganh = sv.KhoaHocNganh?.NganhHoc?.MaNganh ?? sv.KhoaHocNganh?.MaNganhHoc ?? 0;
        var khung = await _db.KhungChuongTrinhs.FirstOrDefaultAsync(k => k.MaNganhHoc == maNganh);

        var (namThu, kyDat) = TinhKyDat(hocKy, sv.KhoaHocNganh?.NamNhapHoc ?? 0);

        if (khung is null)
            return new ChuongTrinhDangKyDto(namThu, kyDat, new List<MonHocChuongTrinhDto>());

        var monKhung = await _db.MonHocThuocKhungChuongTrinhs
            .Where(m => m.MaKhungChuongTrinh == khung.MaKhungChuongTrinh)
            .Include(m => m.MonHoc)
            .ToListAsync();

        var setCoLop = (await _db.LopHocTrongKys.Where(l => l.MaHocKy == hocKy.MaHocKy).Select(l => l.MaMonHoc).Distinct().ToListAsync())
            .ToHashSet();

        var history = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien)
            .Include(d => d.LopHocTrongKy)
            .Include(d => d.DiemHocPhan)
            .ToListAsync();

        var maxZ = history.Where(h => h.DiemHocPhan?.DiemZ != null)
            .GroupBy(h => h.LopHocTrongKy!.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.Max(x => x.DiemHocPhan!.DiemZ!.Value));

        var dangKyKyNay = history.Where(h => h.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy)
            .Select(h => h.LopHocTrongKy!.MaMonHoc).ToHashSet();

        var monHocs = monKhung.Select(mk =>
        {
            var mh = mk.MonHoc!;
            var coZ = maxZ.TryGetValue(mh.MaMonHoc, out var z);
            var daDangKyKyNay = dangKyKyNay.Contains(mh.MaMonHoc);
            var coLop = setCoLop.Contains(mh.MaMonHoc);

            string trangThai;
            if (daDangKyKyNay) trangThai = "DangHoc";
            else if (coZ) trangThai = z >= DiemDat ? "DaDat" : "KhongDat";
            else trangThai = "ChuaHoc";

            var caiThien = coZ && z >= DiemDat && z < DiemHetCaiThien;

            var khongDuDieuKien = false;
            if (mh.MaMonHocTienQuyet.HasValue)
                khongDuDieuKien = !(maxZ.TryGetValue(mh.MaMonHocTienQuyet.Value, out var zt) && zt >= DiemDat);

            var batBuoc = mh.LoaiMonHoc == "Bắt buộc";
            var chuaToiKy = batBuoc && mk.KyHoc > kyDat && trangThai != "DaDat" && !daDangKyKyNay && !caiThien;

            bool coTheDangKy;
            string? lyDo;
            if (daDangKyKyNay) { coTheDangKy = false; lyDo = "Đã đăng ký trong kỳ này"; }
            else if (!coLop) { coTheDangKy = false; lyDo = "Chưa có lớp mở trong kỳ này"; }
            else if (coZ && z >= DiemHetCaiThien) { coTheDangKy = false; lyDo = "Đã đạt, không cần đăng ký lại"; }
            else if (khongDuDieuKien) { coTheDangKy = false; lyDo = "Chưa đạt môn tiên quyết"; }
            else if (chuaToiKy) { coTheDangKy = false; lyDo = "Chưa tới kỳ học của môn này"; }
            else { coTheDangKy = true; lyDo = null; }

            return new MonHocChuongTrinhDto(
                mh.MaMonHoc, mh.TenMonHoc, mh.LoaiMonHoc, mh.SoTinChi, mk.KyHoc,
                trangThai, coZ ? z : null, coLop, caiThien, daDangKyKyNay, khongDuDieuKien, chuaToiKy, coTheDangKy, lyDo);
        })
        .OrderBy(m => m.KyHoc).ThenBy(m => m.TenMonHoc)
        .ToList();

        return new ChuongTrinhDangKyDto(namThu, kyDat, monHocs);
    }

    // =====================================================================
    // Gợi ý thời khoá biểu bằng AI (đọc yêu cầu tự do của sinh viên)
    // =====================================================================

    private record MonGoiYContext(string TenMonHoc, List<string> GiangViens);

    private class AiMonUuTienDto
    {
        public string TenMonHoc { get; set; } = "";
        public string? GiangVien { get; set; }
        public string? TenLop { get; set; }
    }

    private class AiTranhGiangVienDto
    {
        public string TenMonHoc { get; set; } = "";
        public string GiangVien { get; set; } = "";
    }

    private class AiConstraints
    {
        public List<AiMonUuTienDto> ThuTuUuTien { get; set; } = new();
        public string? BuoiUuTien { get; set; } // "Sang" | "Chieu" | "KhongRo"
        public List<int> TranhThu { get; set; } = new();
        public List<int> TranhTiet { get; set; } = new();
        public List<string> MonTuChonMuonHoc { get; set; } = new();
        public List<string> MonCanHocLai { get; set; } = new();
        public List<string> MonKhongMuonHoc { get; set; } = new();
        public bool ChiKyHienTai { get; set; }
        public List<AiTranhGiangVienDto> GiangVienKhongMuonHoc { get; set; } = new();
        public int SoMonTuChonBatKy { get; set; }
    }

    private class XepLichResult
    {
        public Dictionary<int, LopHocTrongKy> Chon { get; set; } = new();
        public List<MonKhongXepDuocDto> KhongXepDuoc { get; set; } = new();
        public double TongDiem { get; set; }
    }

    private static string ChuanHoa(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var normalized = s.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        return sb.ToString().Replace('đ', 'd').Trim();
    }

    private static bool Khop(string? a, string? b)
    {
        var ca = ChuanHoa(a);
        var cb = ChuanHoa(b);
        if (ca.Length == 0 || cb.Length == 0) return false;
        return ca.Contains(cb) || cb.Contains(ca);
    }

    // Văn bản yêu cầu có nhắc nguyên văn tên môn học hay không (dùng làm lưới an toàn, không phụ thuộc AI)
    private static bool VanBanCoNhacTen(string vanBan, string tenMon)
    {
        var vb = ChuanHoa(vanBan);
        var tm = ChuanHoa(tenMon);
        return tm.Length > 0 && vb.Contains(tm);
    }

    private static string TenThu(int thu) => thu switch
    {
        2 => "Thứ 2", 3 => "Thứ 3", 4 => "Thứ 4", 5 => "Thứ 5", 6 => "Thứ 6", 7 => "Thứ 7", 8 => "Chủ nhật",
        _ => $"Thứ {thu}",
    };

    private static string BuildSystemPrompt(List<MonGoiYContext> monBatBuoc, List<string> tenTatCaMonCoLop)
    {
        var dsMon = string.Join("\n", monBatBuoc.Select(m =>
            $"- {m.TenMonHoc} (giảng viên: {(m.GiangViens.Count > 0 ? string.Join(", ", m.GiangViens) : "chưa rõ")})"));
        var dsMonKhac = string.Join(", ", tenTatCaMonCoLop);

        return $@"Bạn là trợ lý xếp thời khoá biểu cho sinh viên đại học. Nhiệm vụ DUY NHẤT của bạn là đọc yêu cầu tự do
của sinh viên và trả về CHÍNH XÁC 1 đối tượng JSON theo schema sau, không thêm chữ nào khác, không dùng markdown:

{{
  ""thuTuUuTien"": [ {{ ""tenMonHoc"": ""..."", ""giangVien"": ""..."" hoặc null, ""tenLop"": ""..."" hoặc null }} ],
  ""buoiUuTien"": ""Sang"" hoặc ""Chieu"" hoặc ""KhongRo"",
  ""tranhThu"": [ số thứ trong tuần cần tránh học, 2=Thứ 2, 3=Thứ 3, 4=Thứ 4, 5=Thứ 5, 6=Thứ 6, 7=Thứ 7, 8=Chủ nhật ],
  ""tranhTiet"": [ số tiết cụ thể (1 đến 10) sinh viên không muốn học, tiết 1-5 là buổi sáng, tiết 6-10 là buổi chiều ],
  ""monTuChonMuonHoc"": [ ""tên môn tự chọn sinh viên muốn học thêm"" ],
  ""monCanHocLai"": [ ""tên môn sinh viên nói cần học lại hoặc học cải thiện"" ],
  ""monKhongMuonHoc"": [ ""tên môn sinh viên nói rõ KHÔNG muốn đăng ký/học trong kỳ này, dù đó là môn bắt buộc"" ],
  ""chiKyHienTai"": true hoặc false,
  ""giangVienKhongMuonHoc"": [ {{ ""tenMonHoc"": ""..."", ""giangVien"": ""..."" }} ],
  ""soMonTuChonBatKy"": số môn tự chọn KHÔNG chỉ định tên cụ thể mà sinh viên muốn học thêm (mặc định 0)
}}

Danh sách môn bắt buộc còn có thể đăng ký trong kỳ này, gồm cả môn bắt buộc của kỳ hiện tại và môn tồn đọng từ các kỳ trước
sinh viên chưa học (chỉ ghi vào ""thuTuUuTien"" khi sinh viên có nhắc tới tên môn/giảng viên/lớp cụ thể):
{dsMon}

Các môn khác đang có lớp mở trong kỳ này (dùng để nhận diện nếu sinh viên muốn học thêm môn tự chọn hoặc học lại):
{dsMonKhac}

Quy tắc:
- Chỉ điền ""thuTuUuTien"" cho môn sinh viên nêu rõ, theo đúng thứ tự sinh viên đề cập (môn được nhắc trước = ưu tiên xếp trước).
- Nếu sinh viên nói rõ KHÔNG muốn đăng ký/không muốn học một môn cụ thể trong kỳ này (ví dụ ""tôi sẽ không đăng ký môn X"", ""tôi không muốn học môn X kỳ này"" — KHÔNG nhắc tới giảng viên cụ thể nào), ghi tên môn đó vào ""monKhongMuonHoc"" — kể cả khi môn đó là môn bắt buộc của kỳ. Không tự suy diễn, chỉ ghi môn được nêu rõ.
- Nếu sinh viên nói KHÔNG muốn học với một GIẢNG VIÊN cụ thể (ví dụ ""tôi không muốn học lớp thầy X"", ""tránh giảng viên Y môn Z""), ghi vào ""giangVienKhongMuonHoc"" với tên môn tương ứng (nếu sinh viên không nói rõ tên môn, áp dụng cho tất cả môn giảng viên đó dạy trong danh sách trên). TUYỆT ĐỐI KHÔNG ghi tên môn đó vào ""monKhongMuonHoc"" trong trường hợp này — sinh viên vẫn cần học môn đó, chỉ là muốn tránh giảng viên này, lớp của giảng viên khác (nếu có) vẫn nên được chọn.
- Nếu sinh viên muốn học thêm một số môn tự chọn KHÔNG chỉ định tên cụ thể (ví dụ ""thêm 1 môn tự chọn bất kỳ"", ""tôi muốn học thêm 2 môn tự chọn"", ""thêm vài môn tự chọn nữa cũng được""), ghi số lượng đó vào ""soMonTuChonBatKy"". Các môn tự chọn được chỉ định TÊN CỤ THỂ (ví dụ ""tôi muốn học môn tự chọn Tin học văn phòng"") vẫn ghi vào ""monTuChonMuonHoc"" như cũ, KHÔNG tính vào ""soMonTuChonBatKy"". Ví dụ ""tôi muốn học môn A và thêm 1 môn tự chọn bất kỳ"" nghĩa là monTuChonMuonHoc=[""A""] và soMonTuChonBatKy=1 (hai việc khác nhau, không trùng nhau).
- Nếu sinh viên nói rõ chỉ muốn đăng ký các môn của kỳ hiện tại, không muốn đăng ký các môn tồn đọng/môn của kỳ trước (ví dụ ""chỉ đăng ký các môn của kỳ hiện tại"", ""không muốn học môn tồn đọng""), đặt ""chiKyHienTai"": true. Mặc định là false nếu sinh viên không nói gì về việc này.
- Nếu sinh viên nói rõ một TIẾT cụ thể muốn tránh (ví dụ ""không muốn học tiết 1"", ""tránh tiết 9, 10""), ghi đúng số tiết đó vào ""tranhTiet"". KHÔNG quy đổi thành ""buoiUuTien"" (Sang/Chieu) — tránh 1 tiết cụ thể khác với việc ưu tiên cả buổi sáng/chiều, hai trường này độc lập với nhau. Chỉ dùng ""buoiUuTien"" khi sinh viên nói chung về cả buổi (ví dụ ""tôi muốn học chủ yếu buổi sáng"").
- Nếu sinh viên không nêu yêu cầu gì đặc biệt cho một trường, để mảng rỗng hoặc giá trị null/KhongRo. Luôn trả lời bằng đúng 1 JSON hợp lệ.";
    }

    private static AiConstraints ParseAiConstraints(string raw)
    {
        try
        {
            var cleaned = raw.Trim();
            var start = cleaned.IndexOf('{');
            var end = cleaned.LastIndexOf('}');
            if (start >= 0 && end > start) cleaned = cleaned.Substring(start, end - start + 1);

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<AiConstraints>(cleaned, options) ?? new AiConstraints();
        }
        catch
        {
            return new AiConstraints();
        }
    }

    private static double ScoreLop(LopHocTrongKy lop, string tenMonHoc, AiConstraints constraints)
    {
        double score = 0;
        var gv = lop.LopHocKyGiangViens.FirstOrDefault()?.GiangVien?.HoTen;

        var monUuTien = constraints.ThuTuUuTien.FirstOrDefault(x => Khop(tenMonHoc, x.TenMonHoc));
        if (monUuTien != null)
        {
            if (!string.IsNullOrWhiteSpace(monUuTien.GiangVien) && Khop(gv, monUuTien.GiangVien)) score += 100;
            if (!string.IsNullOrWhiteSpace(monUuTien.TenLop) && Khop(lop.TenLop, monUuTien.TenLop)) score += 50;
        }

        var tranhGv = constraints.GiangVienKhongMuonHoc.Any(x =>
            Khop(gv, x.GiangVien) && (string.IsNullOrWhiteSpace(x.TenMonHoc) || Khop(tenMonHoc, x.TenMonHoc)));
        if (tranhGv) score -= 200;

        foreach (var buoi in lop.LichHocs)
        {
            var laSang = buoi.TietBatDau <= 5;
            if (constraints.BuoiUuTien == "Sang" && laSang) score += 3;
            else if (constraints.BuoiUuTien == "Chieu" && !laSang) score += 3;

            if (constraints.TranhThu.Contains(buoi.Thu)) score -= 30;

            var soTietTrung = constraints.TranhTiet.Count(t => t >= buoi.TietBatDau && t <= buoi.TietKetThuc);
            score -= soTietTrung * 30;
        }

        return score;
    }

    // Backtracking có giới hạn nhánh: với mỗi môn (theo thứ tự ưu tiên), thử các lớp theo điểm số giảm dần,
    // chọn nhánh không trùng lịch sao cho càng về sau xếp được càng nhiều môn càng tốt.
    private XepLichResult GiaiXepLich(
        List<MonHocChuongTrinhDto> thuTu, int index,
        Dictionary<int, List<LopHocTrongKy>> lopTheoMon,
        AiConstraints constraints,
        Dictionary<int, LopHocTrongKy> daChon)
    {
        if (index >= thuTu.Count)
            return new XepLichResult { Chon = new Dictionary<int, LopHocTrongKy>(daChon) };

        if (_soNutDaXet > GioiHanNutXepLich)
        {
            // Vượt giới hạn tính toán: KHÔNG được coi là xếp thành công — đánh dấu rõ các môn chưa kịp xét
            // để các nhánh khác (ít môn bị bỏ sót hơn) luôn được ưu tiên chọn thay vào kết quả cuối.
            var ketQuaCatNgang = new XepLichResult { Chon = new Dictionary<int, LopHocTrongKy>(daChon) };
            for (var i = index; i < thuTu.Count; i++)
                ketQuaCatNgang.KhongXepDuoc.Add(new MonKhongXepDuocDto(thuTu[i].TenMonHoc, "Vượt quá giới hạn tính toán, vui lòng thử lại với yêu cầu đơn giản hơn"));
            return ketQuaCatNgang;
        }

        var mon = thuTu[index];
        _soNutDaXet++;

        if (!lopTheoMon.TryGetValue(mon.MaMonHoc, out var candidates) || candidates.Count == 0)
        {
            var skip = GiaiXepLich(thuTu, index + 1, lopTheoMon, constraints, daChon);
            skip.KhongXepDuoc.Insert(0, new MonKhongXepDuocDto(mon.TenMonHoc, "Không có lớp còn chỗ trống cho môn này"));
            return skip;
        }

        var scored = candidates
            .Select(l => (lop: l, score: ScoreLop(l, mon.TenMonHoc, constraints)))
            .OrderByDescending(x => x.score)
            .ToList();

        XepLichResult? best = null;

        foreach (var (lop, score) in scored)
        {
            if (_soNutDaXet > GioiHanNutXepLich) break;
            if (daChon.Values.Any(chosen => LichHoc.TrungNhau(lop.LichHocs, chosen.LichHocs))) continue;

            daChon[mon.MaMonHoc] = lop;
            var sub = GiaiXepLich(thuTu, index + 1, lopTheoMon, constraints, daChon);
            daChon.Remove(mon.MaMonHoc);

            sub.TongDiem += score;
            if (best == null || sub.KhongXepDuoc.Count < best.KhongXepDuoc.Count ||
                (sub.KhongXepDuoc.Count == best.KhongXepDuoc.Count && sub.TongDiem > best.TongDiem))
            {
                best = sub;
            }

            if (best.KhongXepDuoc.Count == 0) break;
        }

        if (best == null)
        {
            best = GiaiXepLich(thuTu, index + 1, lopTheoMon, constraints, daChon);
            best.KhongXepDuoc.Insert(0, new MonKhongXepDuocDto(mon.TenMonHoc, "Tất cả lớp của môn này đều trùng giờ với lịch đã chọn"));
        }

        return best;
    }

    private static string KyHieuToHop(Dictionary<int, LopHocTrongKy> chon) =>
        string.Join(",", chon.OrderBy(kv => kv.Key).Select(kv => $"{kv.Key}:{kv.Value.MaLopHocKy}"));

    // Tìm tối đa soLuongToiDa lịch học khác nhau (đều xếp đủ/tốt nhất có thể) để sinh viên có nhiều lựa chọn:
    // giải bình thường 1 lần, sau đó với mỗi môn có nhiều lớp khả dụng, loại các lớp đã dùng ở các lịch trước
    // để buộc thuật toán chọn lớp khác, tạo ra một biến thể lịch học mới.
    private List<XepLichResult> TimNhieuLichHoc(
        List<MonHocChuongTrinhDto> thuTu,
        Dictionary<int, List<LopHocTrongKy>> lopTheoMon,
        AiConstraints constraints,
        Dictionary<int, LopHocTrongKy> daChonCoDinh,
        int soLuongToiDa)
    {
        var ketQuas = new List<XepLichResult>();
        var toHopDaCo = new HashSet<string>();

        XepLichResult? Giai(Dictionary<int, HashSet<int>> loaiTru)
        {
            var lopTheoMonHanChe = lopTheoMon.ToDictionary(
                kv => kv.Key,
                kv => loaiTru.TryGetValue(kv.Key, out var bo) ? kv.Value.Where(l => !bo.Contains(l.MaLopHocKy)).ToList() : kv.Value);
            _soNutDaXet = 0;
            return GiaiXepLich(thuTu, 0, lopTheoMonHanChe, constraints, new Dictionary<int, LopHocTrongKy>(daChonCoDinh));
        }

        void ThuVaThem(Dictionary<int, HashSet<int>> loaiTru)
        {
            if (ketQuas.Count >= soLuongToiDa) return;
            var kq = Giai(loaiTru);
            if (kq == null) return;
            if (toHopDaCo.Add(KyHieuToHop(kq.Chon))) ketQuas.Add(kq);
        }

        ThuVaThem(new Dictionary<int, HashSet<int>>());

        var monNhieuLuaChon = thuTu.Where(m => lopTheoMon.TryGetValue(m.MaMonHoc, out var ls) && ls.Count > 1).ToList();
        foreach (var mon in monNhieuLuaChon)
        {
            if (ketQuas.Count >= soLuongToiDa) break;
            var daDung = ketQuas
                .Select(k => k.Chon.TryGetValue(mon.MaMonHoc, out var l) ? l.MaLopHocKy : (int?)null)
                .Where(x => x.HasValue).Select(x => x!.Value).ToHashSet();
            if (daDung.Count == 0) continue;
            ThuVaThem(new Dictionary<int, HashSet<int>> { [mon.MaMonHoc] = daDung });
        }

        return ketQuas;
    }

    public async Task<List<GoiYThoiKhoaBieuResultDto>> GoiYAsync(SinhVien sv, string yeuCau, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(yeuCau)) return new List<GoiYThoiKhoaBieuResultDto>();

        var hocKy = await ResolveHocKyHienTaiAsync(sv);
        if (hocKy is null) return new List<GoiYThoiKhoaBieuResultDto>();

        // Các lớp sinh viên đã đăng ký thủ công trước đó trong kỳ này: giữ cố định, AI chỉ xếp các môn còn lại
        // xung quanh lịch đã có sẵn này (không được đề xuất đổi/trùng giờ với các lớp đã đăng ký).
        var daDangKy = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien && d.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LichHocs)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .ToListAsync(ct);
        var maMonDaDangKy = daDangKy.Select(d => d.LopHocTrongKy!.MaMonHoc).ToHashSet();
        var daChonCoDinh = daDangKy.ToDictionary(d => d.LopHocTrongKy!.MaMonHoc, d => d.LopHocTrongKy!);

        var chuongTrinh = await BuildChuongTrinhAsync(sv, hocKy);
        // Mặc định: mọi môn bắt buộc còn có thể đăng ký (gồm cả môn tồn đọng từ kỳ trước, vì sinh viên
        // vẫn được đăng ký bắt kịp khi có lớp mở). Môn tự chọn chỉ thêm khi sinh viên yêu cầu rõ.
        // Nếu sinh viên yêu cầu "chỉ đăng ký môn của kỳ hiện tại" (constraints.ChiKyHienTai) thì sẽ thu hẹp lại sau khi đọc yêu cầu AI.
        var monBatBuocCoTheDangKy = chuongTrinh.MonHocs
            .Where(m => m.LoaiMonHoc == "Bắt buộc" && m.CoTheDangKy)
            .ToList();

        var tatCaLop = await _db.LopHocTrongKys
            .Where(l => l.MaHocKy == hocKy.MaHocKy)
            .Include(l => l.MonHoc)
            .Include(l => l.LichHocs)
            .Include(l => l.DangKyLopHocs)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .ToListAsync(ct);

        var lopTheoMon = tatCaLop
            .Where(l => l.DangKyLopHocs.Count < l.SiSoToiDa)
            .GroupBy(l => l.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.ToList());

        var moTaMonHocChoAi = monBatBuocCoTheDangKy
            .Select(m => new MonGoiYContext(
                m.TenMonHoc,
                lopTheoMon.TryGetValue(m.MaMonHoc, out var ls)
                    ? ls.SelectMany(l => l.LopHocKyGiangViens.Select(g => g.GiangVien?.HoTen))
                        .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).Distinct().ToList()
                    : new List<string>()))
            .ToList();

        var tenTatCaMonCoLop = tatCaLop.Select(l => l.MonHoc!.TenMonHoc).Distinct().ToList();

        var systemPrompt = BuildSystemPrompt(moTaMonHocChoAi, tenTatCaMonCoLop);
        var aiRaw = await _aiChat.ChatAsync(systemPrompt, yeuCau, ct);

        var constraints = ParseAiConstraints(aiRaw);

        // Lưới an toàn: quét trực tiếp văn bản yêu cầu để bắt các môn tự chọn được nhắc tên rõ ràng
        // mà AI có thể đã bỏ sót khi trích xuất JSON (sai số mô hình ngôn ngữ), để không bỏ lỡ môn sinh viên thực sự muốn.
        foreach (var mon in chuongTrinh.MonHocs)
        {
            if (mon.LoaiMonHoc != "Tự chọn") continue;
            if (constraints.MonTuChonMuonHoc.Any(t => Khop(mon.TenMonHoc, t))) continue;
            if (constraints.MonKhongMuonHoc.Any(t => Khop(mon.TenMonHoc, t))) continue;
            if (VanBanCoNhacTen(yeuCau, mon.TenMonHoc))
                constraints.MonTuChonMuonHoc.Add(mon.TenMonHoc);
        }

        // Nếu sinh viên yêu cầu rõ "chỉ đăng ký môn của kỳ hiện tại", thu hẹp lại chỉ còn môn đúng KyHoc == KyDat
        var monBiLoaiDoChiKyHienTai = constraints.ChiKyHienTai
            ? monBatBuocCoTheDangKy.Where(m => m.KyHoc != chuongTrinh.KyDat).ToList()
            : new List<MonHocChuongTrinhDto>();
        var monBatBuocCanXep = constraints.ChiKyHienTai
            ? monBatBuocCoTheDangKy.Where(m => m.KyHoc == chuongTrinh.KyDat).ToList()
            : monBatBuocCoTheDangKy;

        // Danh sách môn cần xếp cuối cùng: bắt buộc + tự chọn/học lại được yêu cầu (nếu còn lớp trống và chưa đạt)
        var monCanXep = new List<MonHocChuongTrinhDto>(monBatBuocCanXep);
        foreach (var tenMon in constraints.MonTuChonMuonHoc.Concat(constraints.MonCanHocLai))
        {
            var match = chuongTrinh.MonHocs.FirstOrDefault(m => Khop(m.TenMonHoc, tenMon));
            if (match != null && lopTheoMon.ContainsKey(match.MaMonHoc) &&
                !monCanXep.Any(x => x.MaMonHoc == match.MaMonHoc) &&
                (match.TrangThai != "DaDat" || match.CaiThien))
            {
                monCanXep.Add(match);
            }
        }

        // Loại các môn sinh viên nói rõ KHÔNG muốn đăng ký kỳ này, dù là môn bắt buộc của kỳ
        var monBiLoaiTheoYeuCau = new List<MonHocChuongTrinhDto>();
        foreach (var tenMon in constraints.MonKhongMuonHoc)
        {
            var match = monCanXep.FirstOrDefault(m => Khop(m.TenMonHoc, tenMon));
            if (match != null)
            {
                monCanXep.Remove(match);
                monBiLoaiTheoYeuCau.Add(match);
            }
        }

        // Môn đã đăng ký thủ công trước đó không được đưa vào danh sách cần xếp lại (đã cố định trong daChonCoDinh)
        monCanXep = monCanXep.Where(m => !maMonDaDangKy.Contains(m.MaMonHoc)).ToList();

        // Thứ tự giải theo 3 tầng ưu tiên:
        // 1) Môn sinh viên nêu rõ ưu tiên (giảng viên/lớp cụ thể), đúng thứ tự sinh viên đề cập.
        // 2) Môn tự chọn/học lại sinh viên YÊU CẦU RÕ phải có trong lịch — ưu tiên trước cả môn bắt buộc còn lại,
        //    để nếu không đủ chỗ thì các môn bắt buộc còn lại mới là phần phải xếp lại/nhường.
        // 3) Các môn bắt buộc còn lại, môn càng ít lựa chọn lớp thì giải trước để dễ tránh xung đột.
        var monUuTienHangDau = new List<MonHocChuongTrinhDto>();
        foreach (var ai in constraints.ThuTuUuTien)
        {
            var match = monCanXep.FirstOrDefault(m => !monUuTienHangDau.Contains(m) && Khop(m.TenMonHoc, ai.TenMonHoc));
            if (match != null) monUuTienHangDau.Add(match);
        }

        var tenMonTuChonYeuCauRo = constraints.MonTuChonMuonHoc.Concat(constraints.MonCanHocLai).ToList();
        var monTuChonUuTien = monCanXep
            .Where(m => !monUuTienHangDau.Contains(m) && tenMonTuChonYeuCauRo.Any(t => Khop(m.TenMonHoc, t)))
            .ToList();

        var monConLai = monCanXep
            .Except(monUuTienHangDau).Except(monTuChonUuTien)
            .OrderBy(m => lopTheoMon.TryGetValue(m.MaMonHoc, out var ls) ? ls.Count : 0)
            .ToList();
        var thuTuGiaiQuyet = monUuTienHangDau.Concat(monTuChonUuTien).Concat(monConLai).ToList();

        var dsKetQuaXepLich = TimNhieuLichHoc(thuTuGiaiQuyet, lopTheoMon, constraints, daChonCoDinh, SoLuongGoiYToiDa);

        GoiYThoiKhoaBieuResultDto XayDungKetQua(XepLichResult ketQua)
        {
            // Lưới điền thêm môn tự chọn KHÔNG chỉ định tên cụ thể (soMonTuChonBatKy), ưu tiên môn có nhiều lớp
            // khả dụng nhất (dễ tìm được lớp không trùng giờ hơn), chỉ điền vào chỗ còn trống sau khi đã xếp xong
            // các môn bắt buộc + môn ưu tiên/được chỉ định tên — không được làm xáo trộn các môn đó.
            var daChonHienTai = new Dictionary<int, LopHocTrongKy>(ketQua.Chon);
            var soDaThemTuChon = 0;
            if (constraints.SoMonTuChonBatKy > 0)
            {
                var ungVien = chuongTrinh.MonHocs
                    .Where(m => m.LoaiMonHoc == "Tự chọn" && m.CoTheDangKy
                                && !maMonDaDangKy.Contains(m.MaMonHoc)
                                && !daChonHienTai.ContainsKey(m.MaMonHoc)
                                && !monBiLoaiTheoYeuCau.Any(x => x.MaMonHoc == m.MaMonHoc)
                                && (!constraints.ChiKyHienTai || m.KyHoc == chuongTrinh.KyDat))
                    .OrderByDescending(m => lopTheoMon.TryGetValue(m.MaMonHoc, out var ls) ? ls.Count : 0)
                    .ToList();

                foreach (var mon in ungVien)
                {
                    if (soDaThemTuChon >= constraints.SoMonTuChonBatKy) break;
                    if (!lopTheoMon.TryGetValue(mon.MaMonHoc, out var candidates)) continue;
                    var lopPhuHop = candidates
                        .OrderByDescending(l => ScoreLop(l, mon.TenMonHoc, constraints))
                        .FirstOrDefault(l => !daChonHienTai.Values.Any(c => LichHoc.TrungNhau(l.LichHocs, c.LichHocs)));
                    if (lopPhuHop != null)
                    {
                        daChonHienTai[mon.MaMonHoc] = lopPhuHop;
                        soDaThemTuChon++;
                    }
                }
            }

            var monHocsKetQua = daChonHienTai.Values.Select(l =>
            {
                var gv = l.LopHocKyGiangViens.FirstOrDefault()?.GiangVien;
                return new MonHocGoiYDto(
                    l.MaMonHoc, l.MonHoc!.TenMonHoc, l.MaLopHocKy, l.TenLop, l.LoaiHinh, l.MonHoc.SoTinChi,
                    gv?.HoTen, ToBuoiHocs(l.LichHocs));
            })
            .OrderBy(m => m.TenMonHoc)
            .ToList();

            var ghiChu = new List<string>();
            if (daDangKy.Count > 0)
                ghiChu.Add($"Lịch gợi ý đã giữ nguyên {daDangKy.Count} lớp bạn đã đăng ký thủ công trước đó và xếp các môn còn lại xung quanh lịch này.");
            if (constraints.SoMonTuChonBatKy > 0)
            {
                ghiChu.Add(soDaThemTuChon < constraints.SoMonTuChonBatKy
                    ? $"Chỉ tìm được thêm {soDaThemTuChon}/{constraints.SoMonTuChonBatKy} môn tự chọn bất kỳ phù hợp với lịch hiện tại (các môn tự chọn còn lại đều trùng giờ hoặc đã hết chỗ)."
                    : $"Đã thêm {soDaThemTuChon} môn tự chọn bất kỳ theo yêu cầu của bạn.");
            }
            if (constraints.TranhThu.Count > 0)
                ghiChu.Add($"Đã ưu tiên tránh học vào: {string.Join(", ", constraints.TranhThu.Select(TenThu))}.");
            if (constraints.TranhTiet.Count > 0)
                ghiChu.Add($"Đã ưu tiên tránh học vào tiết: {string.Join(", ", constraints.TranhTiet.OrderBy(t => t))}.");
            if (!string.IsNullOrEmpty(constraints.BuoiUuTien) && constraints.BuoiUuTien != "KhongRo")
                ghiChu.Add($"Đã ưu tiên xếp lịch vào buổi {(constraints.BuoiUuTien == "Sang" ? "sáng" : "chiều")} khi có thể.");
            foreach (var ai in constraints.ThuTuUuTien.Where(x => !string.IsNullOrWhiteSpace(x.GiangVien)))
            {
                var xepDuoc = monHocsKetQua.Any(m => Khop(m.TenMonHoc, ai.TenMonHoc) && Khop(m.TenGiangVien, ai.GiangVien));
                if (!xepDuoc)
                    ghiChu.Add($"Không tìm được lớp của giảng viên \"{ai.GiangVien}\" cho môn \"{ai.TenMonHoc}\" còn chỗ trống/không trùng lịch, đã chọn lớp khác.");
            }
            foreach (var mon in monBiLoaiTheoYeuCau)
                ghiChu.Add($"Đã loại môn \"{mon.TenMonHoc}\" khỏi gợi ý theo yêu cầu của bạn. Đây là môn bắt buộc của kỳ này trong chương trình đào tạo, bạn sẽ cần tự đăng ký vào kỳ sau hoặc đăng ký bổ sung riêng.");
            foreach (var tg in constraints.GiangVienKhongMuonHoc)
            {
                var monKetQua = string.IsNullOrWhiteSpace(tg.TenMonHoc)
                    ? monHocsKetQua.Where(m => Khop(m.TenGiangVien, tg.GiangVien)).ToList()
                    : monHocsKetQua.Where(m => Khop(m.TenMonHoc, tg.TenMonHoc) && Khop(m.TenGiangVien, tg.GiangVien)).ToList();
                foreach (var m in monKetQua)
                    ghiChu.Add(maMonDaDangKy.Contains(m.MaMonHoc)
                        ? $"Môn \"{m.TenMonHoc}\" bạn đã đăng ký thủ công với giảng viên \"{tg.GiangVien}\" từ trước, lịch gợi ý giữ nguyên lựa chọn này."
                        : $"Môn \"{m.TenMonHoc}\" vẫn phải học với giảng viên \"{tg.GiangVien}\" vì đây là lớp duy nhất còn chỗ trống/không trùng lịch với các môn khác.");
            }
            if (constraints.ChiKyHienTai)
            {
                ghiChu.Add($"Đã chỉ xếp các môn bắt buộc của kỳ hiện tại (kỳ {chuongTrinh.KyDat} trong chương trình) theo yêu cầu của bạn.");
                foreach (var mon in monBiLoaiDoChiKyHienTai)
                    ghiChu.Add($"Môn \"{mon.TenMonHoc}\" (thuộc kỳ {mon.KyHoc} trong chương trình, còn tồn đọng chưa học) không được xếp vì bạn chỉ muốn các môn của kỳ hiện tại.");
                if (monHocsKetQua.Count == 0 && monBiLoaiDoChiKyHienTai.Count > 0)
                    ghiChu.Add("Hiện chưa có lớp nào mở cho môn bắt buộc của kỳ hiện tại. Bạn có thể bỏ yêu cầu \"chỉ đăng ký môn của kỳ hiện tại\" để xem các môn tồn đọng có thể đăng ký bắt kịp.");
            }
            if (constraints.TranhThu.Count > 0)
            {
                foreach (var m in monHocsKetQua)
                {
                    var ngayTrung = m.BuoiHocs.Select(b => b.Thu).Where(t => constraints.TranhThu.Contains(t)).Distinct().ToList();
                    if (ngayTrung.Count > 0)
                        ghiChu.Add(maMonDaDangKy.Contains(m.MaMonHoc)
                            ? $"Môn \"{m.TenMonHoc}\" bạn đã đăng ký thủ công vào {string.Join(", ", ngayTrung.Select(TenThu))} từ trước, lịch gợi ý giữ nguyên lựa chọn này."
                            : $"Môn \"{m.TenMonHoc}\" vẫn phải xếp vào {string.Join(", ", ngayTrung.Select(TenThu))} vì đây là lớp duy nhất còn chỗ trống/không trùng lịch với các môn khác.");
                }
            }
            if (constraints.TranhTiet.Count > 0)
            {
                foreach (var m in monHocsKetQua)
                {
                    var tietTrung = m.BuoiHocs
                        .SelectMany(b => constraints.TranhTiet.Where(t => t >= b.TietBatDau && t <= b.TietKetThuc))
                        .Distinct().OrderBy(t => t).ToList();
                    if (tietTrung.Count > 0)
                        ghiChu.Add(maMonDaDangKy.Contains(m.MaMonHoc)
                            ? $"Môn \"{m.TenMonHoc}\" bạn đã đăng ký thủ công vào tiết {string.Join(", ", tietTrung)} từ trước, lịch gợi ý giữ nguyên lựa chọn này."
                            : $"Môn \"{m.TenMonHoc}\" vẫn phải học vào tiết {string.Join(", ", tietTrung)} vì đây là lớp duy nhất còn chỗ trống/không trùng lịch với các môn khác.");
                }
            }

            return new GoiYThoiKhoaBieuResultDto(monHocsKetQua, ketQua.KhongXepDuoc, ghiChu);
        }

        return dsKetQuaXepLich.Select(XayDungKetQua).ToList();
    }
}
