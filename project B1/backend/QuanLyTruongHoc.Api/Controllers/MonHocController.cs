using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.MonHoc;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/mon-hoc")]
[Authorize]
public class MonHocController : ControllerBase
{
    private static readonly string[] LoaiMonHocHopLe = { "Bắt buộc", "Tự chọn" };

    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public MonHocController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    // Khoa viện hiệu lực của môn = MaKhoaVien trực tiếp, hoặc khoa viện của bộ môn. GV chỉ thao tác trong khoa viện mình.
    private async Task<bool> MonHocKhongHopLe(int? maBoMon, int? maKhoaVien)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        if (scope?.MaKhoaVien == null) return true;

        int? khoaVienHieuLuc = maKhoaVien;
        if (maBoMon.HasValue)
            khoaVienHieuLuc = await _db.BoMons.Where(b => b.MaBoMon == maBoMon.Value).Select(b => b.MaKhoaVien).FirstOrDefaultAsync();

        return khoaVienHieuLuc != scope.MaKhoaVien;
    }

    private static MonHocDto ToDto(MonHoc m) => new(
        m.MaMonHoc,
        m.TenMonHoc,
        m.LoaiMonHoc,
        m.SoTinChi,
        m.MaBoMon,
        m.BoMon?.TenBoMon,
        m.MaKhoaVien,
        m.KhoaVien?.TenKhoaVien,
        m.MaMonHocTienQuyet,
        m.MonHocTienQuyet?.TenMonHoc,
        m.LopHocTrongKys?.Count ?? 0);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MonHocDto>>> GetAll()
    {
        var query = _db.MonHocs
            .Include(m => m.BoMon)
            .Include(m => m.KhoaVien)
            .Include(m => m.MonHocTienQuyet)
            .Include(m => m.LopHocTrongKys)
            .AsQueryable();

        // GV: môn thuộc khoa viện mình (trực tiếp hoặc qua bộ môn).
        var scope = await _scope.ResolveAsync(User);
        if (_scope.IsGiangVien(User))
        {
            var maKv = scope?.MaKhoaVien ?? -1;
            query = query.Where(m => m.MaKhoaVien == maKv || (m.BoMon != null && m.BoMon.MaKhoaVien == maKv));
        }

        var result = await query.OrderBy(m => m.TenMonHoc).ToListAsync();
        return Ok(result.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MonHocDto>> GetById(int id)
    {
        var entity = await _db.MonHocs
            .Include(m => m.BoMon)
            .Include(m => m.KhoaVien)
            .Include(m => m.MonHocTienQuyet)
            .Include(m => m.LopHocTrongKys)
            .FirstOrDefaultAsync(m => m.MaMonHoc == id);

        if (entity is null) return NotFound();
        if (await MonHocKhongHopLe(entity.MaBoMon, entity.MaKhoaVien)) return Forbid();
        return Ok(ToDto(entity));
    }

    private async Task<string?> ValidateNoiThuoc(int? maBoMon, int? maKhoaVien)
    {
        if (maBoMon.HasValue && maKhoaVien.HasValue)
            return "Môn học chỉ được thuộc 1 bộ môn HOẶC 1 khoa viện trực tiếp, không thể chọn cả hai";

        if (!maBoMon.HasValue && !maKhoaVien.HasValue)
            return "Vui lòng chọn bộ môn hoặc khoa viện cho môn học này";

        if (maBoMon.HasValue)
        {
            var exists = await _db.BoMons.AnyAsync(b => b.MaBoMon == maBoMon.Value);
            if (!exists) return "Bộ môn không tồn tại";
        }

        if (maKhoaVien.HasValue)
        {
            var exists = await _db.KhoaViens.AnyAsync(k => k.MaKhoaVien == maKhoaVien.Value);
            if (!exists) return "Khoa viện không tồn tại";
        }

        return null;
    }

    [HttpPost]
    public async Task<ActionResult<MonHocDto>> Create(CreateMonHocRequest request)
    {
        var ten = request.TenMonHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên môn học không được để trống" });

        if (request.SoTinChi <= 0)
            return BadRequest(new { message = "Số tín chỉ phải lớn hơn 0" });

        if (!LoaiMonHocHopLe.Contains(request.LoaiMonHoc))
            return BadRequest(new { message = "Loại môn học phải là 'Bắt buộc' hoặc 'Tự chọn'" });

        var noiThuocError = await ValidateNoiThuoc(request.MaBoMon, request.MaKhoaVien);
        if (noiThuocError != null)
            return BadRequest(new { message = noiThuocError });

        if (await MonHocKhongHopLe(request.MaBoMon, request.MaKhoaVien)) return Forbid();

        var exists = await _db.MonHocs.AnyAsync(m =>
            m.TenMonHoc == ten && m.MaBoMon == request.MaBoMon && m.MaKhoaVien == request.MaKhoaVien);
        if (exists)
            return Conflict(new { message = "Môn học này đã tồn tại" });

        if (request.MaMonHocTienQuyet.HasValue)
        {
            var tienQuyetExists = await _db.MonHocs.AnyAsync(m => m.MaMonHoc == request.MaMonHocTienQuyet.Value);
            if (!tienQuyetExists)
                return BadRequest(new { message = "Môn học tiên quyết không tồn tại" });
        }

        var entity = new MonHoc
        {
            TenMonHoc = ten,
            LoaiMonHoc = request.LoaiMonHoc.Trim(),
            SoTinChi = request.SoTinChi,
            MaBoMon = request.MaBoMon,
            MaKhoaVien = request.MaKhoaVien,
            MaMonHocTienQuyet = request.MaMonHocTienQuyet
        };
        _db.MonHocs.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(m => m.BoMon).LoadAsync();
        await _db.Entry(entity).Reference(m => m.KhoaVien).LoadAsync();
        await _db.Entry(entity).Reference(m => m.MonHocTienQuyet).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaMonHoc }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateMonHocRequest request)
    {
        var entity = await _db.MonHocs.FindAsync(id);
        if (entity is null) return NotFound();

        // GV: cả môn cũ và nơi-thuộc mới đều phải nằm trong khoa viện của GV.
        if (await MonHocKhongHopLe(entity.MaBoMon, entity.MaKhoaVien) || await MonHocKhongHopLe(request.MaBoMon, request.MaKhoaVien))
            return Forbid();

        var ten = request.TenMonHoc.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên môn học không được để trống" });

        if (request.SoTinChi <= 0)
            return BadRequest(new { message = "Số tín chỉ phải lớn hơn 0" });

        if (!LoaiMonHocHopLe.Contains(request.LoaiMonHoc))
            return BadRequest(new { message = "Loại môn học phải là 'Bắt buộc' hoặc 'Tự chọn'" });

        var noiThuocError = await ValidateNoiThuoc(request.MaBoMon, request.MaKhoaVien);
        if (noiThuocError != null)
            return BadRequest(new { message = noiThuocError });

        var exists = await _db.MonHocs.AnyAsync(m =>
            m.TenMonHoc == ten && m.MaBoMon == request.MaBoMon && m.MaKhoaVien == request.MaKhoaVien && m.MaMonHoc != id);
        if (exists)
            return Conflict(new { message = "Môn học này đã tồn tại" });

        if (request.MaMonHocTienQuyet.HasValue)
        {
            if (request.MaMonHocTienQuyet.Value == id)
                return BadRequest(new { message = "Môn học không thể là tiên quyết của chính nó" });

            var tienQuyetExists = await _db.MonHocs.AnyAsync(m => m.MaMonHoc == request.MaMonHocTienQuyet.Value);
            if (!tienQuyetExists)
                return BadRequest(new { message = "Môn học tiên quyết không tồn tại" });
        }

        entity.TenMonHoc = ten;
        entity.LoaiMonHoc = request.LoaiMonHoc.Trim();
        entity.SoTinChi = request.SoTinChi;
        entity.MaBoMon = request.MaBoMon;
        entity.MaKhoaVien = request.MaKhoaVien;
        entity.MaMonHocTienQuyet = request.MaMonHocTienQuyet;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.MonHocs
            .Include(m => m.LopHocTrongKys)
            .Include(m => m.MonHocThuocKhungChuongTrinhs)
            .FirstOrDefaultAsync(m => m.MaMonHoc == id);

        if (entity is null) return NotFound();

        if (await MonHocKhongHopLe(entity.MaBoMon, entity.MaKhoaVien)) return Forbid();

        if (entity.LopHocTrongKys.Count > 0 || entity.MonHocThuocKhungChuongTrinhs.Count > 0)
            return Conflict(new { message = "Không thể xoá: môn học đang có lớp học theo kỳ hoặc khung chương trình liên kết" });

        _db.MonHocs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
