using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.HocKy;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/hoc-ky")]
[Authorize]
public class HocKyController : ControllerBase
{
    private static readonly string[] LoaiHocKyHopLe = { "Chính", "Phụ" };

    private readonly AppDbContext _db;

    public HocKyController(AppDbContext db)
    {
        _db = db;
    }

    private static HocKyDto ToDto(HocKy h, int soLopHoc) => new(
        h.MaHocKy,
        h.TenHocKy,
        h.MaNamHoc,
        h.NamHoc?.TenNamHoc ?? "",
        h.LoaiHocKy,
        h.NgayBatDau,
        h.NgayKetThuc,
        h.HanDangKyTu,
        h.HanDangKyDen,
        h.HanRutDangKyTu,
        h.HanRutDangKyDen,
        soLopHoc);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HocKyDto>>> GetAll([FromQuery] int? maNamHoc)
    {
        var query = _db.HocKys.Include(h => h.NamHoc).Include(h => h.LopHocTrongKys).AsQueryable();
        if (maNamHoc.HasValue)
            query = query.Where(h => h.MaNamHoc == maNamHoc.Value);

        var result = await query.OrderByDescending(h => h.NgayBatDau).ToListAsync();
        return Ok(result.Select(h => ToDto(h, h.LopHocTrongKys.Count)));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HocKyDto>> GetById(int id)
    {
        var entity = await _db.HocKys
            .Include(h => h.NamHoc)
            .Include(h => h.LopHocTrongKys)
            .FirstOrDefaultAsync(h => h.MaHocKy == id);

        if (entity is null) return NotFound();
        return Ok(ToDto(entity, entity.LopHocTrongKys.Count));
    }

    private static string? ValidateHan(DateTime? tu, DateTime? den, string ten)
    {
        if (tu.HasValue != den.HasValue)
            return $"Vui lòng nhập đủ cả thời điểm bắt đầu và kết thúc cho {ten}";
        if (tu.HasValue && den.HasValue && den.Value <= tu.Value)
            return $"Thời điểm kết thúc {ten} phải sau thời điểm bắt đầu";
        return null;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<HocKyDto>> Create(CreateHocKyRequest request)
    {
        var ten = request.TenHocKy.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên học kỳ không được để trống" });

        if (!LoaiHocKyHopLe.Contains(request.LoaiHocKy))
            return BadRequest(new { message = "Loại học kỳ phải là 'Chính' hoặc 'Phụ'" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        var hanDkError = ValidateHan(request.HanDangKyTu, request.HanDangKyDen, "hạn đăng ký");
        if (hanDkError != null) return BadRequest(new { message = hanDkError });
        var hanRutError = ValidateHan(request.HanRutDangKyTu, request.HanRutDangKyDen, "hạn rút đăng ký");
        if (hanRutError != null) return BadRequest(new { message = hanRutError });

        var namHoc = await _db.NamHocs.FindAsync(request.MaNamHoc);
        if (namHoc is null)
            return BadRequest(new { message = "Năm học không tồn tại" });

        var exists = await _db.HocKys.AnyAsync(h => h.TenHocKy == ten && h.MaNamHoc == request.MaNamHoc);
        if (exists)
            return Conflict(new { message = "Học kỳ này đã tồn tại trong năm học đã chọn" });

        var entity = new HocKy
        {
            TenHocKy = ten,
            MaNamHoc = request.MaNamHoc,
            LoaiHocKy = request.LoaiHocKy,
            NgayBatDau = request.NgayBatDau,
            NgayKetThuc = request.NgayKetThuc,
            HanDangKyTu = request.HanDangKyTu,
            HanDangKyDen = request.HanDangKyDen,
            HanRutDangKyTu = request.HanRutDangKyTu,
            HanRutDangKyDen = request.HanRutDangKyDen,
        };
        _db.HocKys.Add(entity);
        await _db.SaveChangesAsync();

        entity.NamHoc = namHoc;
        return CreatedAtAction(nameof(GetById), new { id = entity.MaHocKy }, ToDto(entity, 0));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, UpdateHocKyRequest request)
    {
        var entity = await _db.HocKys.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenHocKy.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên học kỳ không được để trống" });

        if (!LoaiHocKyHopLe.Contains(request.LoaiHocKy))
            return BadRequest(new { message = "Loại học kỳ phải là 'Chính' hoặc 'Phụ'" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        var hanDkError = ValidateHan(request.HanDangKyTu, request.HanDangKyDen, "hạn đăng ký");
        if (hanDkError != null) return BadRequest(new { message = hanDkError });
        var hanRutError = ValidateHan(request.HanRutDangKyTu, request.HanRutDangKyDen, "hạn rút đăng ký");
        if (hanRutError != null) return BadRequest(new { message = hanRutError });

        var exists = await _db.HocKys.AnyAsync(h => h.TenHocKy == ten && h.MaNamHoc == entity.MaNamHoc && h.MaHocKy != id);
        if (exists)
            return Conflict(new { message = "Học kỳ này đã tồn tại trong năm học đã chọn" });

        entity.TenHocKy = ten;
        entity.LoaiHocKy = request.LoaiHocKy;
        entity.NgayBatDau = request.NgayBatDau;
        entity.NgayKetThuc = request.NgayKetThuc;
        entity.HanDangKyTu = request.HanDangKyTu;
        entity.HanDangKyDen = request.HanDangKyDen;
        entity.HanRutDangKyTu = request.HanRutDangKyTu;
        entity.HanRutDangKyDen = request.HanRutDangKyDen;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.HocKys
            .Include(h => h.LopHocTrongKys)
            .FirstOrDefaultAsync(h => h.MaHocKy == id);

        if (entity is null) return NotFound();

        if (entity.LopHocTrongKys.Count > 0)
            return Conflict(new { message = "Không thể xoá: học kỳ đang có lớp học liên kết" });

        _db.HocKys.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
