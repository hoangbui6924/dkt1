using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.NamHoc;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/nam-hoc")]
[Authorize]
public class NamHocController : ControllerBase
{
    private readonly AppDbContext _db;

    public NamHocController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NamHocDto>>> GetAll()
    {
        var result = await _db.NamHocs
            .OrderByDescending(n => n.NgayBatDau)
            .Select(n => new NamHocDto(n.MaNamHoc, n.TenNamHoc, n.NgayBatDau, n.NgayKetThuc, n.HocKys.Count))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NamHocDto>> GetById(int id)
    {
        var entity = await _db.NamHocs
            .Where(n => n.MaNamHoc == id)
            .Select(n => new NamHocDto(n.MaNamHoc, n.TenNamHoc, n.NgayBatDau, n.NgayKetThuc, n.HocKys.Count))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<NamHocDto>> Create(CreateNamHocRequest request)
    {
        var ten = request.TenNamHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên năm học không được để trống" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        var exists = await _db.NamHocs.AnyAsync(n => n.TenNamHoc == ten);
        if (exists)
            return Conflict(new { message = "Năm học này đã tồn tại" });

        var entity = new NamHoc { TenNamHoc = ten, NgayBatDau = request.NgayBatDau, NgayKetThuc = request.NgayKetThuc };
        _db.NamHocs.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaNamHoc },
            new NamHocDto(entity.MaNamHoc, entity.TenNamHoc, entity.NgayBatDau, entity.NgayKetThuc, 0));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, UpdateNamHocRequest request)
    {
        var entity = await _db.NamHocs.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenNamHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên năm học không được để trống" });

        if (request.NgayKetThuc <= request.NgayBatDau)
            return BadRequest(new { message = "Ngày kết thúc phải sau ngày bắt đầu" });

        var exists = await _db.NamHocs.AnyAsync(n => n.TenNamHoc == ten && n.MaNamHoc != id);
        if (exists)
            return Conflict(new { message = "Năm học này đã tồn tại" });

        entity.TenNamHoc = ten;
        entity.NgayBatDau = request.NgayBatDau;
        entity.NgayKetThuc = request.NgayKetThuc;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.NamHocs
            .Include(n => n.HocKys)
            .FirstOrDefaultAsync(n => n.MaNamHoc == id);

        if (entity is null) return NotFound();

        if (entity.HocKys.Count > 0)
            return Conflict(new { message = "Không thể xoá: năm học đang có học kỳ liên kết" });

        _db.NamHocs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
