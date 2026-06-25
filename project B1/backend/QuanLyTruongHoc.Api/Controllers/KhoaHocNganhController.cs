using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.KhoaHocNganh;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/khoa-hoc-nganh")]
[Authorize]
public class KhoaHocNganhController : ControllerBase
{
    private readonly AppDbContext _db;

    public KhoaHocNganhController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<KhoaHocNganhDto>>> GetAll([FromQuery] int? maNganhHoc)
    {
        var query = _db.KhoaHocNganhs
            .Include(k => k.NganhHoc)
            .ThenInclude(n => n!.KhoaVien)
            .AsQueryable();

        if (maNganhHoc.HasValue)
            query = query.Where(k => k.MaNganhHoc == maNganhHoc.Value);

        var result = await query
            .OrderByDescending(k => k.TenKhoaHoc)
            .Select(k => new KhoaHocNganhDto(
                k.MaKhoaHocNganh,
                k.TenKhoaHoc,
                k.MaNganhHoc,
                k.NganhHoc!.TenNganh,
                k.NganhHoc!.KhoaVien!.TenKhoaVien,
                k.NamNhapHoc,
                k.NhomLopNganhs.Count))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<KhoaHocNganhDto>> GetById(int id)
    {
        var entity = await _db.KhoaHocNganhs
            .Include(k => k.NganhHoc)
            .ThenInclude(n => n!.KhoaVien)
            .Where(k => k.MaKhoaHocNganh == id)
            .Select(k => new KhoaHocNganhDto(
                k.MaKhoaHocNganh,
                k.TenKhoaHoc,
                k.MaNganhHoc,
                k.NganhHoc!.TenNganh,
                k.NganhHoc!.KhoaVien!.TenKhoaVien,
                k.NamNhapHoc,
                k.NhomLopNganhs.Count))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<KhoaHocNganhDto>> Create(CreateKhoaHocNganhRequest request)
    {
        var ten = request.TenKhoaHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên khoá học không được để trống" });

        if (request.NamNhapHoc < 2000 || request.NamNhapHoc > 2100)
            return BadRequest(new { message = "Năm nhập học không hợp lệ" });

        var nganhHoc = await _db.NganhHocs.Include(n => n.KhoaVien).FirstOrDefaultAsync(n => n.MaNganh == request.MaNganhHoc);
        if (nganhHoc is null)
            return BadRequest(new { message = "Ngành học không tồn tại" });

        var exists = await _db.KhoaHocNganhs.AnyAsync(k => k.TenKhoaHoc == ten && k.MaNganhHoc == request.MaNganhHoc);
        if (exists)
            return Conflict(new { message = "Khoá học này đã tồn tại trong ngành học đã chọn" });

        var entity = new KhoaHocNganh { TenKhoaHoc = ten, MaNganhHoc = request.MaNganhHoc, NamNhapHoc = request.NamNhapHoc };
        _db.KhoaHocNganhs.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaKhoaHocNganh },
            new KhoaHocNganhDto(entity.MaKhoaHocNganh, entity.TenKhoaHoc, entity.MaNganhHoc, nganhHoc.TenNganh, nganhHoc.KhoaVien!.TenKhoaVien, entity.NamNhapHoc, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateKhoaHocNganhRequest request)
    {
        var entity = await _db.KhoaHocNganhs.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenKhoaHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên khoá học không được để trống" });

        if (request.NamNhapHoc < 2000 || request.NamNhapHoc > 2100)
            return BadRequest(new { message = "Năm nhập học không hợp lệ" });

        var nganhHocExists = await _db.NganhHocs.AnyAsync(n => n.MaNganh == request.MaNganhHoc);
        if (!nganhHocExists)
            return BadRequest(new { message = "Ngành học không tồn tại" });

        var exists = await _db.KhoaHocNganhs.AnyAsync(k =>
            k.TenKhoaHoc == ten && k.MaNganhHoc == request.MaNganhHoc && k.MaKhoaHocNganh != id);
        if (exists)
            return Conflict(new { message = "Khoá học này đã tồn tại trong ngành học đã chọn" });

        entity.TenKhoaHoc = ten;
        entity.MaNganhHoc = request.MaNganhHoc;
        entity.NamNhapHoc = request.NamNhapHoc;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.KhoaHocNganhs
            .Include(k => k.NhomLopNganhs)
            .FirstOrDefaultAsync(k => k.MaKhoaHocNganh == id);

        if (entity is null) return NotFound();

        if (entity.NhomLopNganhs.Count > 0)
            return Conflict(new { message = "Không thể xoá: khoá học ngành đang có nhóm lớp liên kết" });

        _db.KhoaHocNganhs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
