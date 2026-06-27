using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.KhoaVien;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/khoa-vien")]
[Authorize]
public class KhoaVienController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public KhoaVienController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<KhoaVienDto>>> GetAll()
    {
        var query = _db.KhoaViens.AsQueryable();

        // GV: chỉ thấy khoa viện của chính mình (để các dropdown form dùng lại đúng phạm vi).
        var scope = await _scope.ResolveAsync(User);
        if (_scope.IsGiangVien(User))
            query = query.Where(k => k.MaKhoaVien == (scope != null ? scope.MaKhoaVien : -1));

        var result = await query
            .OrderBy(k => k.TenKhoaVien)
            .Select(k => new KhoaVienDto(
                k.MaKhoaVien,
                k.TenKhoaVien,
                k.NganhHocs.Count,
                k.BoMons.Count))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<KhoaVienDto>> GetById(int id)
    {
        var entity = await _db.KhoaViens
            .Where(k => k.MaKhoaVien == id)
            .Select(k => new KhoaVienDto(k.MaKhoaVien, k.TenKhoaVien, k.NganhHocs.Count, k.BoMons.Count))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<KhoaVienDto>> Create(CreateKhoaVienRequest request)
    {
        var ten = request.TenKhoaVien.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên khoa viện không được để trống" });

        var exists = await _db.KhoaViens.AnyAsync(k => k.TenKhoaVien == ten);
        if (exists)
            return Conflict(new { message = "Khoa viện này đã tồn tại" });

        var entity = new KhoaVien { TenKhoaVien = ten };
        _db.KhoaViens.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaKhoaVien },
            new KhoaVienDto(entity.MaKhoaVien, entity.TenKhoaVien, 0, 0));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, UpdateKhoaVienRequest request)
    {
        var entity = await _db.KhoaViens.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenKhoaVien.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên khoa viện không được để trống" });

        var exists = await _db.KhoaViens.AnyAsync(k => k.TenKhoaVien == ten && k.MaKhoaVien != id);
        if (exists)
            return Conflict(new { message = "Khoa viện này đã tồn tại" });

        entity.TenKhoaVien = ten;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.KhoaViens
            .Include(k => k.NganhHocs)
            .Include(k => k.BoMons)
            .FirstOrDefaultAsync(k => k.MaKhoaVien == id);

        if (entity is null) return NotFound();

        if (entity.NganhHocs.Count > 0 || entity.BoMons.Count > 0)
            return Conflict(new { message = "Không thể xoá: khoa viện đang có ngành học hoặc bộ môn liên kết" });

        _db.KhoaViens.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
