using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.NganhHoc;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/nganh-hoc")]
[Authorize]
public class NganhHocController : ControllerBase
{
    private readonly AppDbContext _db;

    public NganhHocController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NganhHocDto>>> GetAll()
    {
        var result = await _db.NganhHocs
            .Include(n => n.KhoaVien)
            .OrderBy(n => n.TenNganh)
            .Select(n => new NganhHocDto(
                n.MaNganh,
                n.TenNganh,
                n.MaKhoaVien,
                n.KhoaVien!.TenKhoaVien,
                n.KhoaHocNganhs.Sum(k => k.NhomLopNganhs.Count)))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NganhHocDto>> GetById(int id)
    {
        var entity = await _db.NganhHocs
            .Include(n => n.KhoaVien)
            .Where(n => n.MaNganh == id)
            .Select(n => new NganhHocDto(n.MaNganh, n.TenNganh, n.MaKhoaVien, n.KhoaVien!.TenKhoaVien, n.KhoaHocNganhs.Sum(k => k.NhomLopNganhs.Count)))
            .FirstOrDefaultAsync();

        if (entity is null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<ActionResult<NganhHocDto>> Create(CreateNganhHocRequest request)
    {
        var ten = request.TenNganh.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên ngành học không được để trống" });

        var khoaVien = await _db.KhoaViens.FindAsync(request.MaKhoaVien);
        if (khoaVien is null)
            return BadRequest(new { message = "Khoa viện không tồn tại" });

        var exists = await _db.NganhHocs.AnyAsync(n => n.TenNganh == ten && n.MaKhoaVien == request.MaKhoaVien);
        if (exists)
            return Conflict(new { message = "Ngành học này đã tồn tại trong khoa viện đã chọn" });

        var entity = new NganhHoc { TenNganh = ten, MaKhoaVien = request.MaKhoaVien };
        _db.NganhHocs.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaNganh },
            new NganhHocDto(entity.MaNganh, entity.TenNganh, entity.MaKhoaVien, khoaVien.TenKhoaVien, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateNganhHocRequest request)
    {
        var entity = await _db.NganhHocs.FindAsync(id);
        if (entity is null) return NotFound();

        var ten = request.TenNganh.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên ngành học không được để trống" });

        var khoaVienExists = await _db.KhoaViens.AnyAsync(k => k.MaKhoaVien == request.MaKhoaVien);
        if (!khoaVienExists)
            return BadRequest(new { message = "Khoa viện không tồn tại" });

        var exists = await _db.NganhHocs.AnyAsync(n =>
            n.TenNganh == ten && n.MaKhoaVien == request.MaKhoaVien && n.MaNganh != id);
        if (exists)
            return Conflict(new { message = "Ngành học này đã tồn tại trong khoa viện đã chọn" });

        entity.TenNganh = ten;
        entity.MaKhoaVien = request.MaKhoaVien;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.NganhHocs
            .Include(n => n.KhoaHocNganhs)
            .Include(n => n.KhungChuongTrinh)
            .FirstOrDefaultAsync(n => n.MaNganh == id);

        if (entity is null) return NotFound();

        if (entity.KhoaHocNganhs.Count > 0 || entity.KhungChuongTrinh != null)
            return Conflict(new { message = "Không thể xoá: ngành học đang có khoá học ngành hoặc khung chương trình liên kết" });

        _db.NganhHocs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
