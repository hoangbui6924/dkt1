using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.DotDangKy;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/dot-dang-ky")]
[Authorize]
public class DotDangKyController : ControllerBase
{
    private static readonly string[] LoaiDotHopLe = { "Lan1", "Lan2" };

    private readonly AppDbContext _db;

    public DotDangKyController(AppDbContext db)
    {
        _db = db;
    }

    private static DateTime VnNow() => DateTime.UtcNow.AddHours(7);

    private static DotDangKyDto ToDto(DotDangKy d)
    {
        var now = VnNow();
        string trangThai = now < d.ThoiGianBatDau ? "ChuaMo" : (now > d.ThoiGianKetThuc ? "DaDong" : "DangMo");
        string phamVi = d.NamNhapHoc.HasValue
            ? $"Khóa {d.NamNhapHoc}"
            : d.MaKhoaVien.HasValue
                ? (d.KhoaVien?.TenKhoaVien ?? "Một khoa viện")
                : "Tất cả sinh viên";
        return new DotDangKyDto(
            d.MaDot, d.MaHocKy, d.HocKy?.TenHocKy ?? "", d.HocKy?.NamHoc?.TenNamHoc ?? "",
            d.Ten, d.LoaiDot, d.ThoiGianBatDau, d.ThoiGianKetThuc, d.ChoPhepDangKy, d.ChoPhepRut,
            d.NamNhapHoc, d.MaKhoaVien, d.KhoaVien?.TenKhoaVien, phamVi, trangThai);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DotDangKyDto>>> GetAll([FromQuery] int? maHocKy)
    {
        var query = _db.DotDangKys
            .Include(d => d.HocKy).ThenInclude(h => h!.NamHoc)
            .Include(d => d.KhoaVien)
            .AsQueryable();
        if (maHocKy.HasValue)
            query = query.Where(d => d.MaHocKy == maHocKy.Value);

        var result = await query.OrderBy(d => d.ThoiGianBatDau).ToListAsync();
        return Ok(result.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DotDangKyDto>> GetById(int id)
    {
        var entity = await _db.DotDangKys
            .Include(d => d.HocKy).ThenInclude(h => h!.NamHoc)
            .Include(d => d.KhoaVien)
            .FirstOrDefaultAsync(d => d.MaDot == id);
        if (entity is null) return NotFound();
        return Ok(ToDto(entity));
    }

    private async Task<string?> Validate(int maHocKy, CreateDotDangKyRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Ten)) return "Tên đợt không được để trống";
        if (!LoaiDotHopLe.Contains(r.LoaiDot)) return "Loại đợt phải là 'Lan1' hoặc 'Lan2'";
        if (r.ThoiGianKetThuc <= r.ThoiGianBatDau) return "Thời gian kết thúc phải sau thời gian bắt đầu";
        if (r.NamNhapHoc.HasValue && r.MaKhoaVien.HasValue)
            return "Một đợt chỉ chọn một phạm vi: theo khoá HOẶC theo khoa viện (hoặc để trống = tất cả)";
        if (!await _db.HocKys.AnyAsync(h => h.MaHocKy == maHocKy))
            return "Học kỳ không tồn tại";
        if (r.MaKhoaVien.HasValue && !await _db.KhoaViens.AnyAsync(k => k.MaKhoaVien == r.MaKhoaVien.Value))
            return "Khoa viện không tồn tại";
        return null;
    }

    [HttpPost]
    public async Task<ActionResult<DotDangKyDto>> Create(CreateDotDangKyRequest request)
    {
        var err = await Validate(request.MaHocKy, request);
        if (err != null) return BadRequest(new { message = err });

        var entity = new DotDangKy
        {
            MaHocKy = request.MaHocKy,
            Ten = request.Ten.Trim(),
            LoaiDot = request.LoaiDot,
            ThoiGianBatDau = request.ThoiGianBatDau,
            ThoiGianKetThuc = request.ThoiGianKetThuc,
            ChoPhepDangKy = request.ChoPhepDangKy,
            ChoPhepRut = request.ChoPhepRut,
            NamNhapHoc = request.NamNhapHoc,
            MaKhoaVien = request.MaKhoaVien,
        };
        _db.DotDangKys.Add(entity);
        await _db.SaveChangesAsync();

        var created = await _db.DotDangKys
            .Include(d => d.HocKy).ThenInclude(h => h!.NamHoc)
            .Include(d => d.KhoaVien)
            .FirstAsync(d => d.MaDot == entity.MaDot);
        return CreatedAtAction(nameof(GetById), new { id = entity.MaDot }, ToDto(created));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateDotDangKyRequest request)
    {
        var entity = await _db.DotDangKys.FindAsync(id);
        if (entity is null) return NotFound();

        var err = await Validate(entity.MaHocKy, new CreateDotDangKyRequest(
            entity.MaHocKy, request.Ten, request.LoaiDot, request.ThoiGianBatDau, request.ThoiGianKetThuc,
            request.ChoPhepDangKy, request.ChoPhepRut, request.NamNhapHoc, request.MaKhoaVien));
        if (err != null) return BadRequest(new { message = err });

        entity.Ten = request.Ten.Trim();
        entity.LoaiDot = request.LoaiDot;
        entity.ThoiGianBatDau = request.ThoiGianBatDau;
        entity.ThoiGianKetThuc = request.ThoiGianKetThuc;
        entity.ChoPhepDangKy = request.ChoPhepDangKy;
        entity.ChoPhepRut = request.ChoPhepRut;
        entity.NamNhapHoc = request.NamNhapHoc;
        entity.MaKhoaVien = request.MaKhoaVien;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.DotDangKys.FindAsync(id);
        if (entity is null) return NotFound();

        _db.DotDangKys.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
