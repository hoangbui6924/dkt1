using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.DTOs.TaiLieu;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;
using QuanLyTruongHoc.Infrastructure.Services;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/tai-lieu")]
[Authorize]
public class TaiLieuController : ControllerBase
{
    private static readonly string[] LoaiHopLe = { "NoiQuy", "SoTay", "GiaoTrinh" };

    private readonly AppDbContext _db;
    private readonly IEmbeddingService _embedding;
    private readonly ITeacherScopeService _scope;

    public TaiLieuController(AppDbContext db, IEmbeddingService embedding, ITeacherScopeService scope)
    {
        _db = db;
        _embedding = embedding;
        _scope = scope;
    }

    private static TaiLieuDto ToDto(TaiLieu t, int soChunk) => new(
        t.MaTaiLieu, t.TenFile, t.LoaiTaiLieu, t.MaMonHoc, t.MonHoc?.TenMonHoc,
        t.KichThuocBytes, t.SoTrang, soChunk, t.TrangThai, t.GhiChuXuLy, t.NgayTaiLen, t.TenNguoiTaiLen);

    // Tài liệu GV quản lý = giáo trình của môn thuộc khoa viện mình (môn gắn trực tiếp hoặc qua bộ môn).
    private async Task<bool> MonHocKhongHopLe(int? maMonHoc)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        if (scope?.MaKhoaVien == null || maMonHoc == null) return true;
        var mon = await _db.MonHocs.Where(m => m.MaMonHoc == maMonHoc.Value)
            .Select(m => new { m.MaKhoaVien, BoMonKv = m.BoMon != null ? m.BoMon.MaKhoaVien : null })
            .FirstOrDefaultAsync();
        if (mon == null) return true;
        return (mon.MaKhoaVien ?? mon.BoMonKv) != scope.MaKhoaVien;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaiLieuDto>>> GetAll([FromQuery] string? loai, [FromQuery] int? maMonHoc)
    {
        var query = _db.TaiLieus.Include(t => t.MonHoc).AsQueryable();
        if (!string.IsNullOrWhiteSpace(loai)) query = query.Where(t => t.LoaiTaiLieu == loai);
        if (maMonHoc.HasValue) query = query.Where(t => t.MaMonHoc == maMonHoc.Value);

        // GV: chỉ giáo trình của môn thuộc khoa viện mình.
        var scope = await _scope.ResolveAsync(User);
        if (_scope.IsGiangVien(User))
        {
            var maKv = scope?.MaKhoaVien ?? -1;
            query = query.Where(t => t.LoaiTaiLieu == "GiaoTrinh" && t.MonHoc != null &&
                (t.MonHoc.MaKhoaVien == maKv || (t.MonHoc.BoMon != null && t.MonHoc.BoMon.MaKhoaVien == maKv)));
        }

        var list = await query.OrderByDescending(t => t.NgayTaiLen).ToListAsync();
        var soChunks = await _db.TaiLieuChunks
            .Where(c => list.Select(x => x.MaTaiLieu).Contains(c.MaTaiLieu))
            .GroupBy(c => c.MaTaiLieu)
            .Select(g => new { g.Key, So = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.So);

        return Ok(list.Select(t => ToDto(t, soChunks.GetValueOrDefault(t.MaTaiLieu))));
    }

    [HttpPost]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<ActionResult<TaiLieuDto>> Upload(
        [FromForm] IFormFile file, [FromForm] string loaiTaiLieu, [FromForm] int? maMonHoc)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file tài liệu" });

        if (!LoaiHopLe.Contains(loaiTaiLieu))
            return BadRequest(new { message = "Loại tài liệu không hợp lệ" });

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) &&
            file.ContentType != "application/pdf")
            return BadRequest(new { message = "Chỉ chấp nhận file PDF" });

        // GV chỉ được tải lên giáo trình của môn thuộc khoa viện mình (không tải nội quy/sổ tay).
        if (_scope.IsGiangVien(User))
        {
            if (loaiTaiLieu != "GiaoTrinh") return Forbid();
            if (await MonHocKhongHopLe(maMonHoc)) return Forbid();
        }

        if (loaiTaiLieu == "GiaoTrinh")
        {
            if (!maMonHoc.HasValue)
                return BadRequest(new { message = "Giáo trình phải gắn với một môn học" });
            if (!await _db.MonHocs.AnyAsync(m => m.MaMonHoc == maMonHoc.Value))
                return BadRequest(new { message = "Môn học không tồn tại" });
        }
        else
        {
            maMonHoc = null; // nội quy / sổ tay không gắn môn học
        }

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var maTaiKhoanClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        int.TryParse(maTaiKhoanClaim, out var maTaiKhoan);
        var tenNguoi = User.FindFirstValue(ClaimTypes.Name) ?? "admin";

        var taiLieu = new TaiLieu
        {
            TenFile = Path.GetFileName(file.FileName),
            LoaiTaiLieu = loaiTaiLieu,
            MaMonHoc = maMonHoc,
            KichThuocBytes = bytes.Length,
            NoiDungFile = bytes,
            TrangThai = "DangXuLy",
            NgayTaiLen = DateTime.SpecifyKind(DateTime.UtcNow.AddHours(7), DateTimeKind.Unspecified),
            MaNguoiTaiLen = maTaiKhoan,
            TenNguoiTaiLen = tenNguoi,
        };
        _db.TaiLieus.Add(taiLieu);
        await _db.SaveChangesAsync();

        var soChunk = 0;
        try
        {
            var (soTrang, pages) = PdfTextExtractor.Extract(bytes);
            taiLieu.SoTrang = soTrang;

            var chunks = TextChunker.Chunk(pages);
            if (chunks.Count == 0)
            {
                taiLieu.TrangThai = "DaXuLy";
                taiLieu.GhiChuXuLy = "Không trích xuất được nội dung văn bản (có thể là PDF scan ảnh). Vẫn cho phép tải về.";
            }
            else
            {
                var vectors = await _embedding.EmbedPassagesAsync(chunks.Select(c => c.NoiDung).ToList());
                for (var i = 0; i < chunks.Count; i++)
                {
                    _db.TaiLieuChunks.Add(new TaiLieuChunk
                    {
                        MaTaiLieu = taiLieu.MaTaiLieu,
                        ChiSo = i,
                        Trang = chunks[i].Trang,
                        NoiDung = chunks[i].NoiDung,
                        Embedding = VectorMath.Serialize(vectors[i]),
                    });
                }
                soChunk = chunks.Count;
                taiLieu.TrangThai = "DaXuLy";
            }
        }
        catch (Exception ex)
        {
            taiLieu.TrangThai = "Loi";
            taiLieu.GhiChuXuLy = "Lỗi xử lý tài liệu: " + ex.Message;
        }

        await _db.SaveChangesAsync();
        await _db.Entry(taiLieu).Reference(t => t.MonHoc).LoadAsync();
        return Ok(ToDto(taiLieu, soChunk));
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var taiLieu = await _db.TaiLieus.FirstOrDefaultAsync(t => t.MaTaiLieu == id);
        if (taiLieu is null) return NotFound();
        return File(taiLieu.NoiDungFile, "application/pdf", taiLieu.TenFile);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var taiLieu = await _db.TaiLieus.FirstOrDefaultAsync(t => t.MaTaiLieu == id);
        if (taiLieu is null) return NotFound();

        // GV chỉ được xoá giáo trình của môn thuộc khoa viện mình.
        if (_scope.IsGiangVien(User))
        {
            if (taiLieu.LoaiTaiLieu != "GiaoTrinh" || await MonHocKhongHopLe(taiLieu.MaMonHoc)) return Forbid();
        }

        _db.TaiLieus.Remove(taiLieu); // chunks tự xoá theo cascade
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Danh sách tài liệu cho sinh viên tải về (chỉ tài liệu đã xử lý xong)
    [HttpGet("sinh-vien")]
    public async Task<ActionResult<IEnumerable<TaiLieuSinhVienDto>>> GetForSinhVien()
    {
        var list = await _db.TaiLieus
            .Include(t => t.MonHoc)
            .Where(t => t.TrangThai != "Loi")
            .OrderByDescending(t => t.NgayTaiLen)
            .Select(t => new TaiLieuSinhVienDto(
                t.MaTaiLieu, t.TenFile, t.LoaiTaiLieu, t.MaMonHoc, t.MonHoc!.TenMonHoc,
                t.KichThuocBytes, t.SoTrang, t.NgayTaiLen))
            .ToListAsync();
        return Ok(list);
    }
}
