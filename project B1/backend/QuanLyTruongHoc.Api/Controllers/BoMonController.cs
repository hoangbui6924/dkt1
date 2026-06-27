using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.BoMon;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/bo-mon")]
[Authorize]
public class BoMonController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public BoMonController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    // Giảng viên chỉ được thao tác bộ môn thuộc khoa viện của mình (khoa viện null = không hợp lệ với GV).
    private async Task<bool> KhoaVienKhongHopLe(int? maKhoaVien)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        return maKhoaVien == null || scope?.MaKhoaVien != maKhoaVien;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BoMonDto>>> GetAll()
    {
        var query = _db.BoMons.Include(b => b.KhoaVien).AsQueryable();

        var scope = await _scope.ResolveAsync(User);
        if (_scope.IsGiangVien(User))
            query = query.Where(b => b.MaKhoaVien == (scope != null ? scope.MaKhoaVien : -1));

        var result = await query
            .OrderBy(b => b.TenBoMon)
            .Select(b => new BoMonDto(
                b.MaBoMon,
                b.TenBoMon,
                b.MaKhoaVien,
                b.KhoaVien == null ? null : b.KhoaVien.TenKhoaVien,
                b.MonHocs.Count,
                b.GiangViens.Count))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BoMonDto>> GetById(int id)
    {
        var entity = await _db.BoMons
            .Include(b => b.KhoaVien)
            .Where(b => b.MaBoMon == id)
            .Select(b => new BoMonDto(b.MaBoMon, b.TenBoMon, b.MaKhoaVien, b.KhoaVien == null ? null : b.KhoaVien.TenKhoaVien, b.MonHocs.Count, b.GiangViens.Count))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        if (await KhoaVienKhongHopLe(entity.MaKhoaVien)) return Forbid();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<BoMonDto>> Create(CreateBoMonRequest request)
    {
        var ten = request.TenBoMon.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên bộ môn không được để trống" });

        if (await KhoaVienKhongHopLe(request.MaKhoaVien)) return Forbid();

        KhoaVien? khoaVien = null;
        if (request.MaKhoaVien.HasValue)
        {
            khoaVien = await _db.KhoaViens.FindAsync(request.MaKhoaVien.Value);
            if (khoaVien is null)
                return BadRequest(new { message = "Khoa viện không tồn tại" });
        }

        var exists = await _db.BoMons.AnyAsync(b => b.TenBoMon == ten && b.MaKhoaVien == request.MaKhoaVien);
        if (exists)
            return Conflict(new { message = "Bộ môn này đã tồn tại trong khoa viện đã chọn" });

        var entity = new BoMon { TenBoMon = ten, MaKhoaVien = request.MaKhoaVien };
        _db.BoMons.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaBoMon },
            new BoMonDto(entity.MaBoMon, entity.TenBoMon, entity.MaKhoaVien, khoaVien?.TenKhoaVien, 0, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateBoMonRequest request)
    {
        var entity = await _db.BoMons.FindAsync(id);
        if (entity is null) return NotFound();

        if (await KhoaVienKhongHopLe(entity.MaKhoaVien) || await KhoaVienKhongHopLe(request.MaKhoaVien))
            return Forbid();

        var ten = request.TenBoMon.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên bộ môn không được để trống" });

        if (request.MaKhoaVien.HasValue)
        {
            var khoaVienExists = await _db.KhoaViens.AnyAsync(k => k.MaKhoaVien == request.MaKhoaVien.Value);
            if (!khoaVienExists)
                return BadRequest(new { message = "Khoa viện không tồn tại" });
        }

        var exists = await _db.BoMons.AnyAsync(b =>
            b.TenBoMon == ten && b.MaKhoaVien == request.MaKhoaVien && b.MaBoMon != id);
        if (exists)
            return Conflict(new { message = "Bộ môn này đã tồn tại trong khoa viện đã chọn" });

        entity.TenBoMon = ten;
        entity.MaKhoaVien = request.MaKhoaVien;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.BoMons
            .Include(b => b.MonHocs)
            .Include(b => b.GiangViens)
            .FirstOrDefaultAsync(b => b.MaBoMon == id);

        if (entity is null) return NotFound();

        if (await KhoaVienKhongHopLe(entity.MaKhoaVien)) return Forbid();

        if (entity.MonHocs.Count > 0 || entity.GiangViens.Count > 0)
            return Conflict(new { message = "Không thể xoá: bộ môn đang có môn học hoặc giảng viên liên kết" });

        _db.BoMons.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
