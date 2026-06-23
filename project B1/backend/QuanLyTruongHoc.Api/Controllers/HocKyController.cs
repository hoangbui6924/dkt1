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
    private readonly AppDbContext _db;

    public HocKyController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HocKyDto>>> GetAll([FromQuery] int? maNamHoc)
    {
        var query = _db.HocKys.Include(h => h.NamHoc).AsQueryable();
        if (maNamHoc.HasValue)
            query = query.Where(h => h.MaNamHoc == maNamHoc.Value);

        var result = await query
            .OrderByDescending(h => h.NgayBatDau)
            .Select(h => new HocKyDto(
                h.MaHocKy,
                h.TenHocKy,
                h.MaNamHoc,
                h.NamHoc!.TenNamHoc,
                h.NgayBatDau,
                h.NgayKetThuc,
                h.LopHocTrongKys.Count))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HocKyDto>> GetById(int id)
    {
        var entity = await _db.HocKys
            .Include(h => h.NamHoc)
            .Where(h => h.MaHocKy == id)
            .Select(h => new HocKyDto(h.MaHocKy, h.TenHocKy, h.MaNamHoc, h.NamHoc!.TenNamHoc, h.NgayBatDau, h.NgayKetThuc, h.LopHocTrongKys.Count))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<HocKyDto>> Create(CreateHocKyRequest request)
    {
        var ten = request.TenHocKy.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên học kỳ không được để trống" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

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
            NgayBatDau = request.NgayBatDau,
            NgayKetThuc = request.NgayKetThuc,
        };
        _db.HocKys.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaHocKy },
            new HocKyDto(entity.MaHocKy, entity.TenHocKy, entity.MaNamHoc, namHoc.TenNamHoc, entity.NgayBatDau, entity.NgayKetThuc, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateHocKyRequest request)
    {
        var entity = await _db.HocKys.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenHocKy.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên học kỳ không được để trống" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        var exists = await _db.HocKys.AnyAsync(h => h.TenHocKy == ten && h.MaNamHoc == entity.MaNamHoc && h.MaHocKy != id);
        if (exists)
            return Conflict(new { message = "Học kỳ này đã tồn tại trong năm học đã chọn" });

        entity.TenHocKy = ten;
        entity.NgayBatDau = request.NgayBatDau;
        entity.NgayKetThuc = request.NgayKetThuc;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
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
