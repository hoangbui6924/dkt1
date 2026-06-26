using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.DTOs.TaiLieu;
using QuanLyTruongHoc.Application.Interfaces;
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

    private readonly AppDbContext _db;
    private readonly IEmbeddingService _embedding;
    private readonly IAiChatService _aiChat;
    private readonly IWebSearchService _webSearch;

    public ChatbotController(AppDbContext db, IEmbeddingService embedding, IAiChatService aiChat, IWebSearchService webSearch)
    {
        _db = db;
        _embedding = embedding;
        _aiChat = aiChat;
        _webSearch = webSearch;
    }

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

        var lichSu = request.LichSu ?? new List<ChatLichSuItem>();

        // Câu hỏi nối ngữ cảnh: ghép lượt hỏi trước của sinh viên để giải nghĩa đại từ ("nó", "môn đó"...) khi tra cứu.
        var luotHoiTruoc = lichSu.Where(h => h.VaiTro == "user").Select(h => h.NoiDung).LastOrDefault();
        var cauTraCuu = string.IsNullOrWhiteSpace(luotHoiTruoc) ? request.CauHoi : $"{luotHoiTruoc}. {request.CauHoi}";

        // 1) Lấy các đoạn tài liệu ứng viên. Có chọn môn -> tập trung môn đó + nội quy/sổ tay; không chọn -> tìm trên toàn bộ.
        var taiLieuQuery = _db.TaiLieus.Where(t => t.TrangThai == "DaXuLy");
        if (request.MaMonHoc.HasValue)
            taiLieuQuery = taiLieuQuery.Where(t =>
                t.LoaiTaiLieu == "NoiQuy" || t.LoaiTaiLieu == "SoTay" ||
                (t.LoaiTaiLieu == "GiaoTrinh" && t.MaMonHoc == request.MaMonHoc.Value));

        var maTaiLieus = await taiLieuQuery.Select(t => t.MaTaiLieu).ToListAsync();
        var chunks = maTaiLieus.Count == 0
            ? new List<Domain.Entities.TaiLieuChunk>()
            : await _db.TaiLieuChunks.Where(c => maTaiLieus.Contains(c.MaTaiLieu)).Include(c => c.TaiLieu).ToListAsync();

        // 2) Tra cứu ngữ nghĩa + lexical (hybrid) để chọn đoạn liên quan nhất
        var topChunks = new List<(Domain.Entities.TaiLieuChunk chunk, double score)>();
        if (chunks.Count > 0)
        {
            float[] qVec;
            try { qVec = await _embedding.EmbedQueryAsync(cauTraCuu); }
            catch (Exception ex) { return StatusCode(502, new { message = "Không thể kết nối dịch vụ AI: " + ex.Message }); }

            var qTokens = ChuanHoa(cauTraCuu).Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length >= 3).Distinct().ToList();

            topChunks = chunks
                .Select(c =>
                {
                    var cos = VectorMath.CosineSimilarity(qVec, VectorMath.Parse(c.Embedding));
                    var norm = ChuanHoa(c.NoiDung);
                    var overlap = qTokens.Count(t => norm.Contains(t));
                    return (chunk: c, score: cos + overlap * 0.015); // cộng nhẹ điểm trùng từ khoá
                })
                .OrderByDescending(x => x.score)
                .Take(SoChunkXet)
                .Where(x => x.score >= NguongNguCanh)
                .ToList();
        }

        // 3) Dữ liệu từ DB: cơ cấu tổ chức + môn học
        var coCau = await BuildCoCauToChucAsync();
        var duLieuMon = await BuildDuLieuMonHocAsync();

        // 4) Dựng ngữ cảnh + nguồn
        var ctx = new StringBuilder();
        var nguon = new List<NguonTraLoiDto>();
        if (topChunks.Count > 0)
        {
            ctx.AppendLine("=== NGỮ CẢNH TÀI LIỆU ===");
            var stt = 1;
            foreach (var (chunk, score) in topChunks)
            {
                ctx.AppendLine($"[Đoạn {stt} — {chunk.TaiLieu!.TenFile}, trang {chunk.Trang}]");
                ctx.AppendLine(chunk.NoiDung);
                ctx.AppendLine();
                // Chỉ hiển thị làm nguồn trích dẫn khi đoạn thực sự khớp tốt, tránh "nguồn ảo" cho câu hỏi chung chung
                if (score >= NguongHienNguon)
                    nguon.Add(new NguonTraLoiDto(chunk.MaTaiLieu, chunk.TaiLieu.TenFile, chunk.Trang));
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

        const string systemPrompt =
            "Bạn là \"Trợ lý ảo sinh viên\" thân thiện của Trường Đại học Hàng hải Việt Nam (VMU). " +
            "Phong cách: gần gũi, tự nhiên, ấm áp như một anh/chị khoá trên; xưng \"mình\" và gọi người hỏi là \"bạn\"; có thể dùng emoji nhẹ nhàng.\n\n" +
            "Bạn có các nguồn thông tin: (1) NGỮ CẢNH TÀI LIỆU trích từ nội quy/sổ tay/giáo trình; " +
            "(2) DỮ LIỆU HỆ THỐNG gồm CƠ CẤU TỔ CHỨC (khoa/viện, bộ môn, ngành đào tạo) và DỮ LIỆU MÔN HỌC (giảng viên giảng dạy, độ khó môn học thống kê từ điểm khoá trước); " +
            "(3) kiến thức chung về học tập, ngành nghề, kỹ năng cho sinh viên; " +
            "(4) công cụ tìm kiếm web `tim_kiem_web` để tra cứu thông tin BÊN NGOÀI / cập nhật khi 3 nguồn trên không đủ.\n\n" +
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
            "- TRƯỚC KHI làm bất cứ điều gì, hãy kiểm tra câu hỏi có thuộc phạm vi học tập/môn học/ngành nghề/đời sống sinh viên–nhà trường không. Nếu KHÔNG (xổ số, cờ bạc, bói toán, chính trị nhạy cảm, giải trí ngoài lề...) thì TỪ CHỐI ngay và TUYỆT ĐỐI KHÔNG gọi công cụ `tim_kiem_web`.\n" +
            "- DÙNG CÔNG CỤ `tim_kiem_web` (chỉ cho câu hỏi ĐÚNG phạm vi) khi cần thông tin BÊN NGOÀI hệ thống mà bạn không chắc chắn: ví dụ cơ hội nghề nghiệp/mức lương của một ngành, xu hướng công nghệ mới, định nghĩa/khái niệm chuyên ngành, thông tin tuyển dụng/chứng chỉ, kiến thức cập nhật... Sau khi có kết quả, hãy tổng hợp lại ngắn gọn bằng lời của bạn (đừng dán nguyên kết quả thô) và có thể nhắc 'theo thông tin trên mạng'. KHÔNG cần tìm web cho những câu đã trả lời được từ tài liệu/dữ liệu hệ thống.\n" +
            "- Chỉ trao đổi trong phạm vi học tập, môn học, ngành nghề và đời sống sinh viên/nhà trường. Câu hỏi ngoài phạm vi (chính trị nhạy cảm, nội dung không phù hợp, chuyện phiếm...) thì từ chối nhẹ nhàng và mời quay lại chủ đề học tập — và KHÔNG dùng công cụ tìm web cho những câu này.\n\n" +
            "ĐÁNH DẤU NGUỒN: Nếu câu trả lời CÓ dùng thông tin từ phần NGỮ CẢNH TÀI LIỆU, hãy kết thúc bằng đúng một dòng riêng cuối cùng: [[DUNG_TAILIEU]]. " +
            "Nếu trả lời từ DỮ LIỆU HỆ THỐNG, kết quả tìm web hoặc kiến thức chung (không dùng tài liệu nội bộ), TUYỆT ĐỐI không thêm dòng đó.";

        // Dựng hội thoại: các lượt trước (tối đa 6) + lượt hiện tại (kèm ngữ cảnh tài liệu/dữ liệu)
        var messages = new List<ChatTurn>();
        foreach (var h in lichSu.TakeLast(6))
            messages.Add(new ChatTurn(h.VaiTro == "bot" ? "assistant" : "user", h.NoiDung));
        messages.Add(new ChatTurn("user", $"{ctx}\n=== CÂU HỎI CỦA SINH VIÊN ===\n{request.CauHoi}"));

        // Công cụ tìm kiếm web cho mô hình tự gọi khi cần thông tin ngoài hệ thống
        var tools = new List<ChatToolDef>
        {
            new("tim_kiem_web",
                "Tìm kiếm thông tin trên Internet khi câu hỏi cần dữ liệu bên ngoài hệ thống nhà trường (nghề nghiệp, xu hướng công nghệ, khái niệm chuyên ngành, thông tin cập nhật...).",
                new
                {
                    type = "object",
                    properties = new { query = new { type = "string", description = "Từ khoá/truy vấn tìm kiếm, nên ngắn gọn, rõ ràng" } },
                    required = new[] { "query" },
                }),
        };

        ChatToolHandler handler = async (name, argsJson, c) =>
        {
            if (name != "tim_kiem_web") return "Công cụ không hỗ trợ.";
            string query = "";
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(argsJson) ? "{}" : argsJson);
                if (doc.RootElement.TryGetProperty("query", out var q)) query = q.GetString() ?? "";
            }
            catch { /* args lỗi -> để query rỗng */ }
            if (string.IsNullOrWhiteSpace(query)) return "(không có từ khoá tìm kiếm)";
            var kq = await _webSearch.SearchAsync(query, c);
            return string.IsNullOrWhiteSpace(kq) ? "(không tìm thấy kết quả phù hợp trên web)" : $"Kết quả tìm kiếm cho \"{query}\":\n{kq}";
        };

        string traLoi;
        try { traLoi = await _aiChat.ChatWithToolsAsync(systemPrompt, messages, tools, handler); }
        catch (Exception ex) { return StatusCode(502, new { message = "Không thể kết nối dịch vụ AI: " + ex.Message }); }

        // Mô hình đánh dấu [[DUNG_TAILIEU]] khi thực sự dùng tài liệu -> chỉ khi đó mới hiện nguồn trích dẫn
        var coDungTaiLieu = traLoi.Contains("[[DUNG_TAILIEU]]");
        traLoi = traLoi.Replace("[[DUNG_TAILIEU]]", "").TrimEnd();

        var nguonHienThi = coDungTaiLieu
            ? nguon.GroupBy(n => new { n.MaTaiLieu, n.Trang }).Select(g => g.First()).ToList()
            : new List<NguonTraLoiDto>();

        return Ok(new ChatbotResponse(traLoi, nguonHienThi));
    }
}
