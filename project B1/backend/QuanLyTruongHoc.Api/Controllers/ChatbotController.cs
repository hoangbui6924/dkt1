using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;
using QuanLyTruongHoc.Application.DTOs.TaiLieu;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/chatbot")]
[Authorize]
public class ChatbotController : ControllerBase
{
    private const int SoChunkXet = 8;             // số đoạn lấy ra để cân nhắc
    private const double NguongNguCanh = 0.30;    // điểm tối thiểu để đưa đoạn vào ngữ cảnh cho mô hình
    private const double NguongHienNguon = 0.46;  // điểm tối thiểu để hiển thị đoạn như "nguồn trích dẫn"
    private const decimal DiemDat = 4.0m;

    // Cache dữ liệu DB dùng dựng ngữ cảnh (đổi hiếm) để khỏi quét lại mỗi câu hỏi.
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);
    private const string CacheKeyCoCau = "chatbot:cocau";
    private const string CacheKeyDuLieuMon = "chatbot:dulieumon";
    private const string CacheKeyChunks = "chatbot:chunks";

    private readonly AppDbContext _db;
    private readonly IEmbeddingService _embedding;
    private readonly IAiChatService _aiChat;
    private readonly IMemoryCache _cache;
    private readonly IGoiYLichService _goiYLich;
    private readonly IWebSearchService _webSearch;
    private readonly IHocVuRiskService _hocVuRisk;
    private readonly string _systemPrompt;
    private HanhDongCho? _hanhDongCho; // hành động GHI mà tool đề xuất trong request này (chatbot KHÔNG tự thực thi)

    public ChatbotController(AppDbContext db, IEmbeddingService embedding, IAiChatService aiChat,
        IMemoryCache cache, IGoiYLichService goiYLich, IWebSearchService webSearch, IHocVuRiskService hocVuRisk, IConfiguration config)
    {
        _db = db;
        _embedding = embedding;
        _aiChat = aiChat;
        _cache = cache;
        _goiYLich = goiYLich;
        _webSearch = webSearch;
        _hocVuRisk = hocVuRisk;
        // Config-first (SOTA): cho override system prompt (STATIC) qua config "Chatbot:SystemPrompt"
        // (env/appsettings) mà không cần build lại; mặc định dùng prompt trong code. Ngữ cảnh DYNAMIC
        // (tài liệu/dữ liệu hệ thống) tách riêng ở message user mỗi request (xem ChuanBiHoiThoaiAsync).
        var fromConfig = config["Chatbot:SystemPrompt"];
        _systemPrompt = string.IsNullOrWhiteSpace(fromConfig) ? SystemPrompt : fromConfig;
    }

    // Công cụ (tool) cho LLM gọi — agentic, READ-ONLY: 3 tool học vụ (xếp lịch / đã đăng ký / chương trình)
    // + 1 tool tìm web cho thông tin ngoài hệ thống.
    private static readonly IReadOnlyList<ChatTool> CongCu = new List<ChatTool>
    {
        new ChatTool(
            "goi_y_lich_hoc",
            "XẾP/SẮP thời khoá biểu (vài phương án chọn LỚP cụ thể, không trùng giờ) cho CHÍNH sinh viên đang đăng nhập, " +
            "dựa trên yêu cầu tự nhiên (tránh thứ/buổi/tiết, ưu tiên hoặc tránh giảng viên, môn tự chọn...). " +
            "Chỉ GỢI Ý tham khảo, KHÔNG tự đăng ký giúp. (Chỉ để XẾP LỊCH — muốn liệt kê môn cần học thì dùng xem_chuong_trinh_ky_nay.)",
            new
            {
                type = "object",
                properties = new
                {
                    yeu_cau = new
                    {
                        type = "string",
                        description = "Yêu cầu xếp lịch bằng tiếng Việt, nêu rõ ràng buộc nếu có (vd: 'ưu tiên buổi sáng, tránh thứ 7, tránh thầy A').",
                    },
                },
                required = new[] { "yeu_cau" },
            }),
        new ChatTool(
            "xem_lich_da_dang_ky",
            "Xem các lớp học phần mà CHÍNH sinh viên đang đăng nhập ĐÃ ĐĂNG KÝ trong học kỳ hiện tại " +
            "(môn, lớp, giảng viên, lịch buổi). Dùng khi sinh viên hỏi 'mình đã đăng ký môn gì', 'lịch học của mình', 'thời khoá biểu hiện tại'.",
            new { type = "object", properties = new { } }),
        new ChatTool(
            "xem_chuong_trinh_ky_nay",
            "Tra cứu CHƯƠNG TRÌNH HỌC + TIẾN ĐỘ của chính sinh viên: môn ĐÃ ĐẠT, môn CÓ THỂ đăng ký kỳ này, môn còn lại. " +
            "Dùng khi hỏi 'mình đã học/đạt môn gì', 'kỳ này được/cần học gì', 'còn môn nào phải học'. KHÔNG xếp lịch.",
            new { type = "object", properties = new { } }),
        new ChatTool(
            "tim_kiem_web",
            "Tìm thông tin trên Internet khi câu hỏi (ĐÚNG phạm vi học tập/nghề nghiệp) cần dữ liệu BÊN NGOÀI hệ thống nhà trường " +
            "mà tài liệu + dữ liệu hệ thống không có: cơ hội nghề nghiệp/mức lương ngành, xu hướng công nghệ, khái niệm chuyên ngành, " +
            "tuyển dụng/chứng chỉ, kiến thức cập nhật... TUYỆT ĐỐI không dùng cho câu ngoài phạm vi (giải trí, cờ bạc, chính trị...).",
            new
            {
                type = "object",
                properties = new { query = new { type = "string", description = "Từ khoá/truy vấn tìm kiếm, ngắn gọn rõ ràng." } },
                required = new[] { "query" },
            }),
        new ChatTool(
            "xem_rui_ro_hoc_tap",
            "Đánh giá NGUY CƠ TRƯỢT MÔN hoặc kết quả học tập SA SÚT của CHÍNH sinh viên đang đăng nhập, dựa trên " +
            "xu hướng GPA qua các kỳ + dữ liệu lịch sử các môn đang học, kèm gợi ý lộ trình khắc phục. " +
            "Dùng khi sinh viên hỏi 'mình có nguy cơ trượt môn nào không', 'kết quả học tập của mình có ổn không', " +
            "'mình có bị cảnh báo học vụ không', 'mình nên làm gì để cải thiện điểm'.",
            new { type = "object", properties = new { } }),
        new ChatTool(
            "dang_ky_lop_hoc",
            "ĐĂNG KÝ một lớp học phần cho CHÍNH sinh viên đang đăng nhập, khi sinh viên đã CHỌN RÕ một lớp cụ thể " +
            "(dùng mã lớp [ID:...] lấy từ kết quả goi_y_lich_hoc). Công cụ này CHỈ TẠO ĐỀ XUẤT đăng ký — hệ thống sẽ " +
            "hỏi sinh viên xác nhận trước khi ghi thật; bạn KHÔNG được khẳng định 'đã đăng ký xong'. Chỉ gọi khi sinh viên " +
            "nói rõ muốn đăng ký lớp nào (vd 'đăng ký lớp đó', 'đăng ký lớp 01 môn X').",
            new
            {
                type = "object",
                properties = new { ma_lop_hoc_ky = new { type = "integer", description = "Mã lớp học kỳ (ID) cần đăng ký, lấy từ gợi ý/lịch." } },
                required = new[] { "ma_lop_hoc_ky" },
            }),
    };

    private static string ChuanHoa(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var norm = s.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in norm)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        return sb.ToString().Replace('đ', 'd');
    }

    // Đoạn tài liệu đã NẠP SẴN cho tra cứu: vector embedding đã parse + text đã chuẩn hoá (bỏ dấu).
    // ponytail: cache trong RAM để khỏi load ~8MB embedding + parse 648×1024 float mỗi query.
    // Trần: cosine in-memory trên toàn bộ chunk; nếu chunk tăng cỡ 10K+ thì chuyển pgvector (ANN).
    private sealed record ChunkVec(
        int MaTaiLieu, string TenFile, int Trang, string LoaiTaiLieu, int? MaMonHocParent,
        string NoiDung, string NoiDungNorm, float[] Vector);

    private async Task<List<ChunkVec>> LoadChunkVecsAsync()
    {
        var raw = await _db.TaiLieuChunks
            .Where(c => c.TaiLieu!.TrangThai == "DaXuLy")
            .Select(c => new
            {
                c.MaTaiLieu,
                c.TaiLieu!.TenFile,
                c.Trang,
                c.TaiLieu.LoaiTaiLieu,
                MaMonHocParent = c.TaiLieu.MaMonHoc,
                c.NoiDung,
                c.Embedding,
            })
            .ToListAsync();

        return raw.Select(c => new ChunkVec(
            c.MaTaiLieu, c.TenFile, c.Trang, c.LoaiTaiLieu, c.MaMonHocParent,
            c.NoiDung, ChuanHoa(c.NoiDung), VectorMath.Parse(c.Embedding))).ToList();
    }

    // Cơ cấu tổ chức: khoa/viện -> bộ môn + ngành đào tạo
    private async Task<string> BuildCoCauToChucAsync()
    {
        var khoaViens = await _db.KhoaViens
            .Select(k => new
            {
                k.TenKhoaVien,
                BoMons = k.BoMons.Select(b => b.TenBoMon).OrderBy(x => x).ToList(),
                Nganhs = k.NganhHocs.Select(n => n.TenNganh).OrderBy(x => x).ToList(),
            })
            .ToListAsync();

        var sb = new StringBuilder();
        foreach (var k in khoaViens.OrderBy(k => k.TenKhoaVien))
        {
            sb.AppendLine($"- {k.TenKhoaVien}:");
            sb.AppendLine($"    Bộ môn: {(k.BoMons.Count > 0 ? string.Join(", ", k.BoMons) : "(chưa cập nhật)")}");
            if (k.Nganhs.Count > 0)
                sb.AppendLine($"    Ngành đào tạo: {string.Join(", ", k.Nganhs)}");
        }
        return sb.ToString();
    }

    // Tổng hợp dữ liệu môn học từ DB: tín chỉ, loại, học kỳ + giảng viên giảng dạy + độ khó (thống kê điểm khoá trước)
    private async Task<string> BuildDuLieuMonHocAsync()
    {
        var monHocs = await _db.MonHocs
            .Select(m => new { m.MaMonHoc, m.TenMonHoc, m.LoaiMonHoc, m.SoTinChi })
            .ToListAsync();
        if (monHocs.Count == 0) return "";

        var kyHocByMon = (await _db.MonHocThuocKhungChuongTrinhs
            .GroupBy(x => x.MaMonHoc)
            .Select(g => new { MaMonHoc = g.Key, Ky = g.Min(x => x.KyHoc) })
            .ToListAsync())
            .ToDictionary(x => x.MaMonHoc, x => x.Ky);

        var teaching = await _db.LopHocKyGiangViens
            .Select(g => new { g.LopHocTrongKy!.MaMonHoc, TenGV = g.GiangVien!.HoTen, g.MaGiangVien })
            .Distinct()
            .ToListAsync();

        var grades = await _db.DiemHocPhans
            .Where(d => d.DiemZ != null)
            .Select(d => new
            {
                d.DangKyLopHoc!.LopHocTrongKy!.MaMonHoc,
                Z = d.DiemZ!.Value,
                MaGiangVien = d.DangKyLopHoc.LopHocTrongKy.LopHocKyGiangViens.Select(x => x.MaGiangVien).FirstOrDefault(),
            })
            .ToListAsync();

        var gradeByMon = grades.GroupBy(g => g.MaMonHoc).ToDictionary(g => g.Key, g => g.ToList());
        var teachByMon = teaching.GroupBy(t => t.MaMonHoc).ToDictionary(g => g.Key, g => g.ToList());
        var avgByMonGv = grades
            .Where(g => g.MaGiangVien != 0)
            .GroupBy(g => (g.MaMonHoc, g.MaGiangVien))
            .ToDictionary(g => g.Key, g => g.Average(x => (double)x.Z));

        var sb = new StringBuilder();
        foreach (var m in monHocs.OrderBy(m => m.TenMonHoc))
        {
            var ky = kyHocByMon.TryGetValue(m.MaMonHoc, out var k) ? $", học kỳ {k}" : "";
            var line = $"- {m.TenMonHoc} ({m.SoTinChi} TC, {m.LoaiMonHoc}{ky})";

            if (teachByMon.TryGetValue(m.MaMonHoc, out var ts) && ts.Count > 0)
            {
                var gvStr = string.Join(", ", ts.Select(t =>
                    avgByMonGv.TryGetValue((m.MaMonHoc, t.MaGiangVien), out var avg)
                        ? $"{t.TenGV} (điểm TB lớp {avg:0.0})"
                        : t.TenGV));
                line += $" | GV: {gvStr}";
            }

            if (gradeByMon.TryGetValue(m.MaMonHoc, out var gs) && gs.Count > 0)
            {
                var n = gs.Count;
                var avg = gs.Average(x => (double)x.Z);
                var pass = gs.Count(x => x.Z >= DiemDat) / (double)n;
                string label = (avg < 6.0 || pass < 0.5) ? "Khó" : (avg < 7.5 || pass < 0.8) ? "Trung bình" : "Dễ";
                line += $" | Độ khó: {label} (điểm TB {avg:0.0}, tỉ lệ đạt {pass * 100:0}% trên {n} lượt)";
            }

            sb.AppendLine(line);
        }

        return sb.ToString();
    }

    [HttpPost("hoi")]
    public async Task<ActionResult<ChatbotResponse>> Hoi(ChatbotRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CauHoi))
            return BadRequest(new { message = "Vui lòng nhập câu hỏi" });

        List<ChatTurn> messages;
        List<NguonUngVien> ungVien;
        try { (messages, ungVien) = await ChuanBiHoiThoaiAsync(request); }
        catch (Exception ex) { return StatusCode(502, new { message = "Không thể kết nối dịch vụ AI: " + ex.Message }); }

        var sb = new StringBuilder();
        try
        {
            await foreach (var t in _aiChat.ChatStreamAsync(_systemPrompt, messages, CongCu, ChayCongCuAsync, HttpContext.RequestAborted))
                sb.Append(t);
        }
        catch (Exception ex) { return StatusCode(502, new { message = "Không thể kết nối dịch vụ AI: " + ex.Message }); }

        var traLoi = sb.ToString();
        return Ok(new ChatbotResponse(traLoi.TrimEnd(), CiteGrounded(traLoi, ungVien), _hanhDongCho));
    }

    // Streaming SSE: phát từng mảnh trả lời ngay khi LLM sinh -> độ trễ cảm nhận ~1s thay vì chờ trọn ~20s.
    [HttpPost("hoi-stream")]
    public async Task HoiStream(ChatbotRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CauHoi))
        {
            Response.StatusCode = 400;
            await Response.WriteAsJsonAsync(new { message = "Vui lòng nhập câu hỏi" }, ct);
            return;
        }

        List<ChatTurn> messages;
        List<NguonUngVien> ungVien;
        try { (messages, ungVien) = await ChuanBiHoiThoaiAsync(request); }
        catch (Exception ex)
        {
            Response.StatusCode = 502;
            await Response.WriteAsJsonAsync(new { message = "Không thể kết nối dịch vụ AI: " + ex.Message }, ct);
            return;
        }

        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no"; // chặn proxy buffer luồng SSE

        var full = new StringBuilder();
        await foreach (var token in _aiChat.ChatStreamAsync(_systemPrompt, messages, CongCu, ChayCongCuAsync, ct))
        {
            full.Append(token);
            await WriteSseAsync(new { delta = token }, ct);
        }

        // Cite sau khi có trọn câu trả lời: chỉ nguồn ứng viên có nội dung THỰC SỰ xuất hiện trong câu trả lời.
        await WriteSseAsync(new { done = true, nguon = CiteGrounded(full.ToString(), ungVien), hanhDong = _hanhDongCho }, ct);
    }

    private async Task WriteSseAsync(object payload, CancellationToken ct)
    {
        await Response.WriteAsync($"data: {JsonSerializer.Serialize(payload)}\n\n", ct);
        await Response.Body.FlushAsync(ct);
    }

    // Bộ điều phối tool (registry nhỏ): resolve sinh viên 1 lần rồi gọi đúng executor. Tất cả READ-ONLY, in-process.
    private async Task<string> ChayCongCuAsync(string ten, string thamSoJson)
    {
        // Tìm web không cần danh tính sinh viên.
        if (ten == "tim_kiem_web") return await ToolTimKiemWebAsync(thamSoJson);

        var sv = await ResolveSinhVienAsync();
        if (sv is null) return "Không xác định được sinh viên đang đăng nhập.";
        return ten switch
        {
            "goi_y_lich_hoc" => await ToolXepLichAsync(sv, thamSoJson),
            "xem_lich_da_dang_ky" => await ToolLichDaDangKyAsync(sv),
            "xem_chuong_trinh_ky_nay" => await ToolChuongTrinhKyNayAsync(sv),
            "xem_rui_ro_hoc_tap" => await _hocVuRisk.TomTatRuiRoAsync(sv.MaSinhVien),
            "dang_ky_lop_hoc" => await ToolDangKyLopHocAsync(sv, thamSoJson),
            _ => "Công cụ không được hỗ trợ.",
        };
    }

    // Tool 4: tìm kiếm web (thông tin ngoài hệ thống) — tái dùng WebSearchService (DuckDuckGo -> Wikipedia VI, không cần key).
    private async Task<string> ToolTimKiemWebAsync(string thamSoJson)
    {
        string query;
        try
        {
            using var doc = JsonDocument.Parse(thamSoJson);
            query = doc.RootElement.TryGetProperty("query", out var q) && q.ValueKind == JsonValueKind.String
                ? (q.GetString() ?? "") : "";
        }
        catch (JsonException) { query = ""; }
        if (string.IsNullOrWhiteSpace(query)) return "Không có từ khoá tìm kiếm.";

        var kq = await _webSearch.SearchAsync(query, HttpContext.RequestAborted);
        return string.IsNullOrWhiteSpace(kq) ? "Không tìm thấy kết quả web phù hợp." : "Kết quả tìm kiếm web:\n" + kq;
    }

    private async Task<SinhVien?> ResolveSinhVienAsync()
    {
        var maTaiKhoanClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(maTaiKhoanClaim, out var maTaiKhoan)) return null;
        return await _db.SinhViens
            .Include(s => s.KhoaHocNganh).ThenInclude(k => k!.NganhHoc)
            .FirstOrDefaultAsync(s => s.MaTaiKhoan == maTaiKhoan);
    }

    // Tool 1: gợi ý thời khoá biểu (gọi GoiYLichService — cùng logic trang đăng ký, không tự đăng ký).
    private async Task<string> ToolXepLichAsync(SinhVien sv, string thamSoJson)
    {
        string yeuCau;
        try
        {
            using var doc = JsonDocument.Parse(thamSoJson);
            yeuCau = doc.RootElement.TryGetProperty("yeu_cau", out var yc) && yc.ValueKind == JsonValueKind.String
                ? (yc.GetString() ?? "") : "";
        }
        catch (JsonException) { yeuCau = ""; }
        if (string.IsNullOrWhiteSpace(yeuCau)) yeuCau = "Xếp giúp tôi thời khoá biểu kỳ này.";
        return TomTatLich(await _goiYLich.GoiYAsync(sv, yeuCau));
    }

    // Tool 2: các lớp sinh viên ĐÃ đăng ký trong học kỳ hiện tại.
    private async Task<string> ToolLichDaDangKyAsync(SinhVien sv)
    {
        var hocKy = await _goiYLich.ResolveHocKyHienTaiAsync(sv);
        if (hocKy is null) return "Hiện chưa có học kỳ nào để xem lịch.";
        var dangKys = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien && d.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LichHocs)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .ToListAsync();
        if (dangKys.Count == 0)
            return $"Học kỳ {hocKy.TenHocKy}: bạn CHƯA đăng ký lớp học phần nào.";

        var sb = new StringBuilder();
        sb.AppendLine($"Lịch đã đăng ký học kỳ {hocKy.TenHocKy} ({dangKys.Count} lớp):");
        foreach (var d in dangKys)
        {
            var l = d.LopHocTrongKy!;
            var gv = l.LopHocKyGiangViens.FirstOrDefault()?.GiangVien?.HoTen;
            var buoi = string.Join("; ", l.LichHocs.OrderBy(x => x.Thu).ThenBy(x => x.TietBatDau)
                .Select(x => $"Thứ {x.Thu} tiết {x.TietBatDau}-{x.TietKetThuc}" + (x.PhongHoc != null ? $" P.{x.PhongHoc}" : "")));
            sb.AppendLine($"- {l.MonHoc?.TenMonHoc} (lớp {l.TenLop}, {l.MonHoc?.SoTinChi} TC, GV {gv}): {buoi}");
        }
        return sb.ToString();
    }

    // Tool 3: các môn CÓ THỂ đăng ký trong chương trình ở học kỳ hiện tại.
    private async Task<string> ToolChuongTrinhKyNayAsync(SinhVien sv)
    {
        var hocKy = await _goiYLich.ResolveHocKyHienTaiAsync(sv);
        if (hocKy is null) return "Hiện chưa có học kỳ nào.";
        var ct = await _goiYLich.BuildChuongTrinhAsync(sv, hocKy);
        var daDat = ct.MonHocs.Where(m => m.TrangThai == "DaDat").Select(m => m.TenMonHoc).ToList();
        var coTheDk = ct.MonHocs.Where(m => m.CoTheDangKy).ToList();
        var conLai = ct.MonHocs.Count(m => m.TrangThai != "DaDat" && !m.CoTheDangKy && !m.DaDangKyKyNay);

        var sb = new StringBuilder();
        sb.AppendLine($"Chương trình học của bạn — học kỳ {hocKy.TenHocKy} (năm thứ {ct.NamThu}):");
        sb.AppendLine($"- Đã đạt: {daDat.Count} môn"
            + (daDat.Count > 0 ? $" ({string.Join(", ", daDat.Take(20))}{(daDat.Count > 20 ? ", ..." : "")})" : ""));
        if (coTheDk.Count > 0)
        {
            sb.AppendLine($"- CÓ THỂ đăng ký kỳ này ({coTheDk.Count} môn):");
            foreach (var m in coTheDk)
                sb.AppendLine($"  • {m.TenMonHoc} ({m.SoTinChi} TC, {m.LoaiMonHoc}, kỳ {m.KyHoc}){(m.CaiThien ? " [học cải thiện]" : "")}");
        }
        else sb.AppendLine("- Hiện không có môn nào đủ điều kiện đăng ký kỳ này.");
        if (conLai > 0) sb.AppendLine($"- Còn {conLai} môn khác chưa tới kỳ / chưa đủ điều kiện.");
        return sb.ToString();
    }

    // Tool GHI: chỉ ĐỀ XUẤT đăng ký (KHÔNG tự ghi) — set _hanhDongCho; FE xác nhận (mặc định) hoặc tự chạy (chế độ nguy hiểm).
    // Ghi thật luôn đi qua POST /api/dang-ky-hoc-phan/{maLopHocKy} (đủ validate điều kiện/trùng lịch), do FE gọi sau xác nhận.
    private async Task<string> ToolDangKyLopHocAsync(SinhVien sv, string thamSoJson)
    {
        int maLop;
        try
        {
            using var doc = JsonDocument.Parse(thamSoJson);
            maLop = doc.RootElement.TryGetProperty("ma_lop_hoc_ky", out var m) && m.ValueKind == JsonValueKind.Number
                ? m.GetInt32() : 0;
        }
        catch (JsonException) { maLop = 0; }
        if (maLop <= 0) return "Chưa rõ lớp nào để đăng ký — cần mã lớp (ID) lấy từ gợi ý thời khoá biểu.";

        var lop = await _db.LopHocTrongKys
            .Include(l => l.MonHoc)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == maLop);
        if (lop is null) return $"Không tìm thấy lớp học phần có mã {maLop}.";

        var gv = lop.LopHocKyGiangViens.FirstOrDefault()?.GiangVien?.HoTen;
        var moTa = $"{lop.MonHoc?.TenMonHoc} — lớp {lop.TenLop}" + (gv != null ? $", GV {gv}" : "");
        _hanhDongCho = new HanhDongCho("dang_ky_lop_hoc", maLop, moTa);
        return $"Đã chuẩn bị đăng ký: {moTa}. Hãy báo sinh viên BẤM XÁC NHẬN để hệ thống ghi thật — " +
               "mình KHÔNG tự đăng ký khi sinh viên chưa xác nhận.";
    }

    // Tóm tắt kết quả xếp lịch thành text gọn cho LLM trình bày (≤3 phương án để tiết kiệm token).
    private static string TomTatLich(List<GoiYThoiKhoaBieuResultDto>? ds)
    {
        if (ds == null || ds.Count == 0)
            return "Hiện chưa xếp được phương án nào (có thể chưa tới đợt đăng ký, hoặc không có lớp mở phù hợp).";

        var sb = new StringBuilder();
        sb.AppendLine($"Đã xếp được {ds.Count} phương án thời khoá biểu (GỢI Ý tham khảo, sinh viên TỰ đăng ký):");
        var stt = 1;
        foreach (var pa in ds.Take(2))
        {
            sb.AppendLine($"== Phương án {stt} ==");
            foreach (var m in pa.MonHocs)
            {
                var buoi = string.Join("; ", m.BuoiHocs.Select(b => $"Thứ {b.Thu} tiết {b.TietBatDau}-{b.TietKetThuc}"));
                sb.AppendLine($"- {m.TenMonHoc} (lớp {m.TenLop} [ID:{m.MaLopHocKy}], {m.SoTinChi} TC, GV {m.TenGiangVien}): {buoi}");
            }
            if (pa.MonKhongXepDuoc.Count > 0)
                sb.AppendLine("  Chưa xếp được: " + string.Join(", ", pa.MonKhongXepDuoc.Select(x => $"{x.TenMonHoc} ({x.LyDo})")));
            if (pa.GhiChu.Count > 0) sb.AppendLine("  Ghi chú: " + string.Join(" ", pa.GhiChu));
            stt++;
        }
        if (ds.Count > 2) sb.AppendLine($"(Còn {ds.Count - 2} phương án khác, hỏi nếu muốn xem thêm.)");
        return sb.ToString();
    }

    // Nguồn ứng viên: đoạn khớp ngữ nghĩa đủ tốt (≥ NguongHienNguon) + text đã chuẩn hoá để đối chiếu groundedness.
    private sealed record NguonUngVien(NguonTraLoiDto Nguon, string NoiDungNorm);

    private const int GroundingMinHits = 4; // số từ "đặc trưng" (≥5 ký tự) của đoạn phải xuất hiện trong câu trả lời

    // Citation XÁC ĐỊNH (thay marker [[DUNG_TAILIEU]] flaky ~33%): chỉ cite đoạn mà nội dung THỰC SỰ
    // được dùng trong câu trả lời (đủ từ đặc trưng trùng) -> tránh "nguồn ảo" khi trả lời từ DB/kiến thức chung.
    private static List<NguonTraLoiDto> CiteGrounded(string traLoi, List<NguonUngVien> ungVien)
    {
        var na = ChuanHoa(traLoi);
        var cited = new List<NguonTraLoiDto>();
        foreach (var uv in ungVien)
        {
            var terms = uv.NoiDungNorm.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length >= 5).Distinct();
            if (terms.Count(t => na.Contains(t)) >= GroundingMinHits)
                cited.Add(uv.Nguon);
        }
        return cited.GroupBy(n => new { n.MaTaiLieu, n.Trang }).Select(g => g.First()).ToList();
    }

    // Chuẩn bị hội thoại dùng chung cho cả /hoi và /hoi-stream: retrieval hybrid + dữ liệu DB (cache)
    // -> danh sách message gửi LLM + nguồn ỨNG VIÊN (chunk ≥ ngưỡng, kèm text để CiteGrounded đối chiếu).
    // Ném exception nếu embedding lỗi (caller -> 502).
    private async Task<(List<ChatTurn> messages, List<NguonUngVien> ungVien)> ChuanBiHoiThoaiAsync(ChatbotRequest request)
    {
        var lichSu = request.LichSu ?? new List<ChatLichSuItem>();

        // Câu hỏi nối ngữ cảnh: ghép lượt hỏi trước của sinh viên để giải nghĩa đại từ ("nó", "môn đó"...) khi tra cứu.
        var luotHoiTruoc = lichSu.Where(h => h.VaiTro == "user").Select(h => h.NoiDung).LastOrDefault();
        var cauTraCuu = string.IsNullOrWhiteSpace(luotHoiTruoc) ? request.CauHoi : $"{luotHoiTruoc}. {request.CauHoi}";

        // 1) Đoạn tài liệu ứng viên (nạp sẵn + cache 10 phút). Có chọn môn -> tập trung môn đó + nội quy/sổ tay; không thì toàn bộ.
        var allChunks = await _cache.GetOrCreateAsync(CacheKeyChunks, async e =>
        {
            e.AbsoluteExpirationRelativeToNow = CacheTtl;
            var data = await LoadChunkVecsAsync();
            e.Size = data.Count; // OOM guard: Size = số chunk; vượt SizeLimit -> entry không cache (re-load, không OOM)
            return data;
        }) ?? new List<ChunkVec>();

        var candidates = request.MaMonHoc.HasValue
            ? allChunks.Where(c =>
                c.LoaiTaiLieu == "NoiQuy" || c.LoaiTaiLieu == "SoTay" ||
                (c.LoaiTaiLieu == "GiaoTrinh" && c.MaMonHocParent == request.MaMonHoc.Value)).ToList()
            : allChunks;

        // 2) Tra cứu ngữ nghĩa + lexical (hybrid) để chọn đoạn liên quan nhất — cosine in-memory (vector đã parse).
        var topChunks = new List<(ChunkVec chunk, double score)>();
        if (candidates.Count > 0)
        {
            var qVec = await _embedding.EmbedQueryAsync(cauTraCuu);
            var qTokens = ChuanHoa(cauTraCuu).Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length >= 3).Distinct().ToList();

            topChunks = candidates
                .Select(c =>
                {
                    var cos = VectorMath.CosineSimilarity(qVec, c.Vector);
                    var overlap = qTokens.Count(t => c.NoiDungNorm.Contains(t));
                    return (chunk: c, score: cos + overlap * 0.015); // cộng nhẹ điểm trùng từ khoá
                })
                .OrderByDescending(x => x.score)
                .Take(SoChunkXet)
                .Where(x => x.score >= NguongNguCanh)
                .ToList();
        }

        // 3) Dữ liệu từ DB: cơ cấu tổ chức + môn học.
        // Cache 10 phút: quét cả 68 môn + thống kê điểm khoá trước, dữ liệu đổi rất hiếm (admin sửa)
        // -> không cần dựng lại mỗi câu hỏi. Giảm tải DB; phần chậm chính vẫn là LLM (~20s).
        var coCau = await _cache.GetOrCreateAsync(CacheKeyCoCau, e =>
        {
            e.AbsoluteExpirationRelativeToNow = CacheTtl;
            e.Size = 1;
            return BuildCoCauToChucAsync();
        }) ?? "";
        var duLieuMon = await _cache.GetOrCreateAsync(CacheKeyDuLieuMon, e =>
        {
            e.AbsoluteExpirationRelativeToNow = CacheTtl;
            e.Size = 1;
            return BuildDuLieuMonHocAsync();
        }) ?? "";

        // 4) Dựng ngữ cảnh + nguồn
        var ctx = new StringBuilder();
        var ungVien = new List<NguonUngVien>();
        if (topChunks.Count > 0)
        {
            ctx.AppendLine("=== NGỮ CẢNH TÀI LIỆU ===");
            var stt = 1;
            foreach (var (chunk, score) in topChunks)
            {
                ctx.AppendLine($"[Đoạn {stt} — {chunk.TenFile}, trang {chunk.Trang}]");
                ctx.AppendLine(chunk.NoiDung);
                ctx.AppendLine();
                // Đoạn khớp tốt -> nguồn ỨNG VIÊN; cite thật hay không do CiteGrounded quyết (đối chiếu câu trả lời).
                if (score >= NguongHienNguon)
                    ungVien.Add(new NguonUngVien(new NguonTraLoiDto(chunk.MaTaiLieu, chunk.TenFile, chunk.Trang), chunk.NoiDungNorm));
                stt++;
            }
        }
        else ctx.AppendLine("=== NGỮ CẢNH TÀI LIỆU ===\n(Không tìm thấy đoạn tài liệu liên quan trực tiếp tới câu hỏi này.)\n");

        if (!string.IsNullOrEmpty(coCau))
        {
            ctx.AppendLine("=== CƠ CẤU TỔ CHỨC NHÀ TRƯỜNG (từ hệ thống) ===");
            ctx.AppendLine(coCau);
        }

        if (!string.IsNullOrEmpty(duLieuMon))
        {
            ctx.AppendLine("=== DỮ LIỆU MÔN HỌC (từ hệ thống, thống kê từ điểm khoá trước) ===");
            ctx.AppendLine(duLieuMon);
        }

        // OOM/token guard: chặn ngữ cảnh phình quá lớn (vd dữ liệu môn tăng) -> cắt bớt để prompt không nổ.
        const int MaxCtxChars = 24_000;
        var ctxStr = ctx.ToString();
        if (ctxStr.Length > MaxCtxChars)
            ctxStr = ctxStr[..MaxCtxChars] + "\n... (ngữ cảnh đã cắt bớt do quá dài)";

        // Dựng hội thoại: các lượt trước (tối đa 6) + lượt hiện tại (kèm ngữ cảnh tài liệu/dữ liệu)
        var messages = new List<ChatTurn>();
        foreach (var h in lichSu.TakeLast(6))
            messages.Add(new ChatTurn(h.VaiTro == "bot" ? "assistant" : "user", h.NoiDung));
        messages.Add(new ChatTurn("user", $"{ctxStr}\n=== CÂU HỎI CỦA SINH VIÊN ===\n{request.CauHoi}"));

        return (messages, ungVien);
    }

    private const string SystemPrompt =
            "Bạn là \"Trợ lý ảo sinh viên\" thân thiện của Trường Đại học Hàng hải Việt Nam (VMU). " +
            "Phong cách: gần gũi, tự nhiên, ấm áp như một anh/chị khoá trên; xưng \"mình\" và gọi người hỏi là \"bạn\"; có thể dùng emoji nhẹ nhàng.\n\n" +
            "Bạn có các nguồn thông tin: (1) NGỮ CẢNH TÀI LIỆU trích từ nội quy/sổ tay/giáo trình; " +
            "(2) DỮ LIỆU HỆ THỐNG gồm CƠ CẤU TỔ CHỨC (khoa/viện, bộ môn, ngành đào tạo) và DỮ LIỆU MÔN HỌC (giảng viên giảng dạy, độ khó môn học thống kê từ điểm khoá trước); " +
            "(3) kiến thức chung về học tập, ngành nghề, kỹ năng cho sinh viên; " +
            "(4) công cụ tìm web tim_kiem_web cho thông tin BÊN NGOÀI / cập nhật khi 3 nguồn trên không đủ.\n\n" +
            "QUY TẮC QUAN TRỌNG NHẤT về cách trả lời:\n" +
            "- NGẮN GỌN và ĐÚNG TRỌNG TÂM. Trả lời thẳng vào đúng điều được hỏi, KHÔNG thêm thông tin/lời khuyên không được hỏi.\n" +
            "- Độ dài tương xứng câu hỏi: câu hỏi tra cứu đơn giản (vd \"khoa X có bộ môn nào\", \"môn Y mấy tín chỉ\") chỉ trả lời gọn trong 1-3 câu hoặc một danh sách ngắn. KHÔNG dùng bảng biểu dài dòng, KHÔNG kể lể lan man.\n" +
            "- Chỉ mở rộng/đưa lời khuyên khi người hỏi thực sự xin tư vấn (vd \"nên học thế nào\", \"chọn giảng viên nào\").\n\n" +
            "Nguyên tắc nội dung:\n" +
            "- LƯU Ý NGỮ CẢNH HỘI THOẠI: hãy đọc các tin nhắn trước đó để hiểu đại từ như \"nó\", \"môn đó\", \"thầy đó\"... trỏ tới đối tượng nào. Nếu chưa chắc, hỏi lại ngắn gọn.\n" +
            "- Tra cứu nhanh (mấy tín chỉ, học kỳ mấy, khoa nào có bộ môn gì...): trả lời thẳng từ DỮ LIỆU HỆ THỐNG, gọn gàng.\n" +
            "- Khi sinh viên muốn GIỚI THIỆU / TÌM HIỂU về một môn học: nêu thông tin có trong hệ thống (tín chỉ, loại môn, học kỳ, giảng viên, độ khó nếu có) RỒI dùng KIẾN THỨC CHUNG của bạn để mô tả ngắn gọn (3-6 câu) môn đó học về gì, kiến thức/kỹ năng chính, ứng dụng và vì sao quan trọng. Đừng chỉ liệt kê khô khan dữ liệu hệ thống.\n" +
            "- Ưu tiên dùng tài liệu + dữ liệu hệ thống; được kết hợp kiến thức chung của bạn để câu trả lời hữu ích, sinh động hơn (miễn là trong phạm vi học thuật/giáo dục).\n" +
            "- Thông tin QUY ĐỊNH/CHÍNH THỨC riêng của trường (học phí, lịch, thủ tục, con số cụ thể...) không có trong nguồn nào: nói rõ chưa có trong hệ thống và khuyên liên hệ phòng/khoa phụ trách — KHÔNG bịa số liệu.\n" +
            "- Tư vấn chọn giảng viên/độ khó: dựa vào điểm trung bình & tỉ lệ đạt, nói gọn lý do, nhắc đây là số liệu tham khảo từ khoá trước.\n" +
            "- XẾP LỊCH HỌC: Bạn CÓ công cụ goi_y_lich_hoc để GỢI Ý thời khoá biểu cho chính bạn sinh viên đang hỏi. Khi bạn ấy nhờ xếp/gợi ý lịch học, đăng ký môn kỳ này — ĐỪNG từ chối hay đẩy sang phòng Đào tạo — hãy GỌI công cụ đó, truyền lại yêu cầu kèm ràng buộc (tránh thứ/buổi/tiết, ưu tiên/tránh giảng viên...). Khi có kết quả, BẮT BUỘC LIỆT KÊ CHI TIẾT ít nhất 1 phương án đầy đủ — mỗi môn một dòng theo dạng: \"• Tên môn — lớp — GV — Thứ X tiết Y-Z\". (Đây là ngoại lệ của quy tắc ngắn gọn: phải cho sinh viên XEM được lịch, đừng chỉ tóm tắt suông.) Sau đó nói rõ đây là GỢI Ý tham khảo và bạn ấy TỰ đăng ký trên hệ thống (bạn KHÔNG tự đăng ký giúp), nhắc còn phương án khác và hỏi có muốn chỉnh ràng buộc không.\n" +
            "- DỮ LIỆU HỌC VỤ CỦA CHÍNH SINH VIÊN: Hệ thống ĐÃ BIẾT sinh viên nào đang đăng nhập (qua phiên đăng nhập) — TUYỆT ĐỐI KHÔNG hỏi mã sinh viên / họ tên / năm học; các công cụ tự biết là ai. Khi bạn ấy hỏi về tình trạng học tập của bản thân (đã đăng ký gì, đã đạt/đã học môn nào, kỳ này được/cần học gì, còn môn nào), PHẢI GỌI NGAY đúng công cụ để lấy số liệu THẬT, không hỏi ngược, không bịa: 'đã đăng ký lớp/lịch của mình' → xem_lich_da_dang_ky; 'đã đạt/đã học/được học/còn môn nào phải học' → xem_chuong_trinh_ky_nay. Trình bày kết quả gọn, rõ.\n" +
            "- TÌM WEB: khi câu hỏi ĐÚNG phạm vi (nghề nghiệp, công nghệ, khái niệm chuyên ngành, chứng chỉ...) cần thông tin BÊN NGOÀI mà tài liệu/dữ liệu hệ thống không có và bạn không chắc, hãy GỌI tim_kiem_web; có kết quả thì tổng hợp lại NGẮN GỌN bằng lời của bạn (có thể nói 'theo thông tin trên mạng'), đừng dán thô. KHÔNG tìm web cho câu đã trả lời được từ tài liệu/hệ thống.\n" +
            "- ĐĂNG KÝ LỚP: khi sinh viên nói rõ muốn đăng ký một lớp CỤ THỂ (đã thấy trong gợi ý, có mã [ID:...]), hãy gọi dang_ky_lop_hoc với mã đó. Đây chỉ là ĐỀ XUẤT — hệ thống sẽ hỏi sinh viên xác nhận trước khi ghi; TUYỆT ĐỐI đừng nói 'đã đăng ký xong'. Nếu chưa rõ lớp nào, hãy gợi ý lịch trước rồi hỏi sinh viên chọn.\n" +
            "- Chỉ trao đổi trong phạm vi học tập, môn học, ngành nghề và đời sống sinh viên/nhà trường. Câu hỏi ngoài phạm vi (chính trị nhạy cảm, nội dung không phù hợp, chuyện phiếm...) thì từ chối nhẹ nhàng và mời quay lại chủ đề học tập — và TUYỆT ĐỐI KHÔNG gọi tim_kiem_web cho những câu này.";
}
