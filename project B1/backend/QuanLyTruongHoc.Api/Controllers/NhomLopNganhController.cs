using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.NhomLopNganh;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/nhom-lop-nganh")]
[Authorize]
public class NhomLopNganhController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public NhomLopNganhController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    // Nhóm lớp -> khoá học ngành -> ngành -> khoa viện. GV chỉ thao tác trong khoa viện mình.
    private async Task<bool> KhoaHocNganhKhongHopLe(int maKhoaHocNganh)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        var maKv = await _db.KhoaHocNganhs
            .Where(k => k.MaKhoaHocNganh == maKhoaHocNganh)
            .Select(k => (int?)k.NganhHoc!.MaKhoaVien)
            .FirstOrDefaultAsync();
        return scope?.MaKhoaVien != maKv;
    }

    private async Task<bool> NhomLopKhongHopLe(int maNhomLop)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var maKhoaHocNganh = await _db.NhomLopNganhs.Where(n => n.MaNhomLop == maNhomLop).Select(n => (int?)n.MaKhoaHocNganh).FirstOrDefaultAsync();
        return maKhoaHocNganh == null || await KhoaHocNganhKhongHopLe(maKhoaHocNganh.Value);
    }

    private static NhomLopNganhDto ToDto(NhomLopNganh n) => new(
        n.MaNhomLop,
        n.TenNhomLop,
        n.MaKhoaHocNganh,
        n.KhoaHocNganh!.TenKhoaHoc,
        n.KhoaHocNganh!.NganhHoc!.TenNganh,
        n.SinhViens?.Count ?? 0,
        n.MaCoVanHocTap,
        n.CoVanHocTap?.HoTen);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NhomLopNganhDto>>> GetAll([FromQuery] int? maKhoaHocNganh)
    {
        var query = _db.NhomLopNganhs
            .Include(n => n.KhoaHocNganh).ThenInclude(k => k!.NganhHoc)
            .Include(n => n.CoVanHocTap)
            .Include(n => n.SinhViens)
            .AsQueryable();
        if (maKhoaHocNganh.HasValue)
            query = query.Where(n => n.MaKhoaHocNganh == maKhoaHocNganh.Value);

        var scope = await _scope.ResolveAsync(User);
        if (_scope.IsGiangVien(User))
            query = query.Where(n => n.KhoaHocNganh!.NganhHoc!.MaKhoaVien == (scope != null ? scope.MaKhoaVien : -1));

        var result = await query.OrderBy(n => n.TenNhomLop).ToListAsync();

        return Ok(result.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NhomLopNganhDto>> GetById(int id)
    {
        var entity = await _db.NhomLopNganhs
            .Include(n => n.KhoaHocNganh).ThenInclude(k => k!.NganhHoc)
            .Include(n => n.CoVanHocTap)
            .Include(n => n.SinhViens)
            .FirstOrDefaultAsync(n => n.MaNhomLop == id);

        if (entity is null) return NotFound();
        if (await KhoaHocNganhKhongHopLe(entity.MaKhoaHocNganh)) return Forbid();
        return Ok(ToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<NhomLopNganhDto>> Create(CreateNhomLopNganhRequest request)
    {
        if (await KhoaHocNganhKhongHopLe(request.MaKhoaHocNganh)) return Forbid();

        var ten = request.TenNhomLop.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên nhóm lớp không được để trống" });

        var khoaHocNganh = await _db.KhoaHocNganhs.Include(k => k.NganhHoc).FirstOrDefaultAsync(k => k.MaKhoaHocNganh == request.MaKhoaHocNganh);
        if (khoaHocNganh is null)
            return BadRequest(new { message = "Khoá học ngành không tồn tại" });

        var exists = await _db.NhomLopNganhs.AnyAsync(n => n.TenNhomLop == ten && n.MaKhoaHocNganh == request.MaKhoaHocNganh);
        if (exists)
            return Conflict(new { message = "Nhóm lớp này đã tồn tại trong khoá học ngành đã chọn" });

        var entity = new NhomLopNganh { TenNhomLop = ten, MaKhoaHocNganh = request.MaKhoaHocNganh };
        _db.NhomLopNganhs.Add(entity);
        await _db.SaveChangesAsync();

        entity.KhoaHocNganh = khoaHocNganh;
        return CreatedAtAction(nameof(GetById), new { id = entity.MaNhomLop }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateNhomLopNganhRequest request)
    {
        var entity = await _db.NhomLopNganhs.FindAsync(id);
        if (entity is null) return NotFound();

        if (await KhoaHocNganhKhongHopLe(entity.MaKhoaHocNganh) || await KhoaHocNganhKhongHopLe(request.MaKhoaHocNganh))
            return Forbid();

        var ten = request.TenNhomLop.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên nhóm lớp không được để trống" });

        var khoaHocNganhExists = await _db.KhoaHocNganhs.AnyAsync(k => k.MaKhoaHocNganh == request.MaKhoaHocNganh);
        if (!khoaHocNganhExists)
            return BadRequest(new { message = "Khoá học ngành không tồn tại" });

        var exists = await _db.NhomLopNganhs.AnyAsync(n =>
            n.TenNhomLop == ten && n.MaKhoaHocNganh == request.MaKhoaHocNganh && n.MaNhomLop != id);
        if (exists)
            return Conflict(new { message = "Nhóm lớp này đã tồn tại trong khoá học ngành đã chọn" });

        entity.TenNhomLop = ten;
        entity.MaKhoaHocNganh = request.MaKhoaHocNganh;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.NhomLopNganhs
            .Include(n => n.SinhViens)
            .FirstOrDefaultAsync(n => n.MaNhomLop == id);

        if (entity is null) return NotFound();

        if (await KhoaHocNganhKhongHopLe(entity.MaKhoaHocNganh)) return Forbid();

        if (entity.SinhViens.Count > 0)
            return Conflict(new { message = "Không thể xoá: nhóm lớp đang có sinh viên liên kết" });

        _db.NhomLopNganhs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:int}/sinh-vien")]
    public async Task<ActionResult<IEnumerable<SinhVienTrongNhomDto>>> GetSinhViens(int id)
    {
        var nhomLopExists = await _db.NhomLopNganhs.AnyAsync(n => n.MaNhomLop == id);
        if (!nhomLopExists) return NotFound();
        if (await NhomLopKhongHopLe(id)) return Forbid();

        var result = await _db.SinhViens
            .Where(s => s.MaNhomLop == id)
            .OrderBy(s => s.HoTen)
            .Select(s => new SinhVienTrongNhomDto(s.MaSinhVien, s.MaSoSV, s.HoTen, s.GioiTinh))
            .ToListAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}/sinh-vien-chua-co-nhom")]
    public async Task<ActionResult<IEnumerable<SinhVienTrongNhomDto>>> GetSinhViensChuaCoNhom(int id)
    {
        var nhomLop = await _db.NhomLopNganhs.FindAsync(id);
        if (nhomLop is null) return NotFound();
        if (await KhoaHocNganhKhongHopLe(nhomLop.MaKhoaHocNganh)) return Forbid();

        var result = await _db.SinhViens
            .Where(s => s.MaKhoaHocNganh == nhomLop.MaKhoaHocNganh && s.MaNhomLop == null)
            .OrderBy(s => s.HoTen)
            .Select(s => new SinhVienTrongNhomDto(s.MaSinhVien, s.MaSoSV, s.HoTen, s.GioiTinh))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost("{id:int}/sinh-vien")]
    public async Task<IActionResult> AddSinhVien(int id, AddSinhVienVaoNhomRequest request)
    {
        var nhomLop = await _db.NhomLopNganhs.FindAsync(id);
        if (nhomLop is null) return NotFound();
        if (await KhoaHocNganhKhongHopLe(nhomLop.MaKhoaHocNganh)) return Forbid();

        var sinhVien = await _db.SinhViens.FindAsync(request.MaSinhVien);
        if (sinhVien is null)
            return BadRequest(new { message = "Sinh viên không tồn tại" });

        if (sinhVien.MaKhoaHocNganh != nhomLop.MaKhoaHocNganh)
            return BadRequest(new { message = "Sinh viên không thuộc khoá học ngành của nhóm lớp này" });

        if (sinhVien.MaNhomLop.HasValue)
            return Conflict(new { message = "Sinh viên này đã thuộc một nhóm lớp khác" });

        sinhVien.MaNhomLop = id;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}/sinh-vien/{maSinhVien:int}")]
    public async Task<IActionResult> RemoveSinhVien(int id, int maSinhVien)
    {
        if (await NhomLopKhongHopLe(id)) return Forbid();

        var sinhVien = await _db.SinhViens.FirstOrDefaultAsync(s => s.MaSinhVien == maSinhVien && s.MaNhomLop == id);
        if (sinhVien is null) return NotFound();

        sinhVien.MaNhomLop = null;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id:int}/sinh-vien/import")]
    public async Task<ActionResult<ImportSinhVienVaoNhomResultDto>> ImportSinhVien(int id, ImportSinhVienVaoNhomRequest request)
    {
        var nhomLop = await _db.NhomLopNganhs.FindAsync(id);
        if (nhomLop is null) return NotFound();
        if (await KhoaHocNganhKhongHopLe(nhomLop.MaKhoaHocNganh)) return Forbid();

        var loi = new List<ImportSinhVienVaoNhomErrorDto>();
        var thanhCong = 0;

        for (var i = 0; i < request.SinhViens.Count; i++)
        {
            var dong = i + 2; // dòng 1 là tiêu đề
            var row = request.SinhViens[i];
            var maSoSV = row.MaSoSV?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(maSoSV))
                continue; // bỏ qua dòng trống

            var sinhVien = await _db.SinhViens.FirstOrDefaultAsync(s => s.MaSoSV == maSoSV);
            if (sinhVien is null)
            {
                loi.Add(new ImportSinhVienVaoNhomErrorDto(dong, maSoSV, "Không tìm thấy sinh viên với mã số này"));
                continue;
            }

            if (sinhVien.MaKhoaHocNganh != nhomLop.MaKhoaHocNganh)
            {
                loi.Add(new ImportSinhVienVaoNhomErrorDto(dong, maSoSV, "Sinh viên không thuộc khoá học ngành của nhóm lớp này"));
                continue;
            }

            if (sinhVien.MaNhomLop.HasValue)
            {
                loi.Add(new ImportSinhVienVaoNhomErrorDto(dong, maSoSV, "Sinh viên đã thuộc một nhóm lớp khác"));
                continue;
            }

            sinhVien.MaNhomLop = id;
            thanhCong++;
        }

        await _db.SaveChangesAsync();

        return Ok(new ImportSinhVienVaoNhomResultDto(thanhCong, loi.Count, loi));
    }

    [HttpPut("{id:int}/co-van")]
    public async Task<ActionResult<NhomLopNganhDto>> SetCoVan(int id, SetCoVanHocTapRequest request)
    {
        var entity = await _db.NhomLopNganhs
            .Include(n => n.KhoaHocNganh).ThenInclude(k => k!.NganhHoc)
            .Include(n => n.SinhViens)
            .FirstOrDefaultAsync(n => n.MaNhomLop == id);
        if (entity is null) return NotFound();
        if (await KhoaHocNganhKhongHopLe(entity.MaKhoaHocNganh)) return Forbid();

        if (request.MaGiangVien.HasValue)
        {
            var giangVienExists = await _db.GiangViens.AnyAsync(g => g.MaGiangVien == request.MaGiangVien.Value);
            if (!giangVienExists)
                return BadRequest(new { message = "Giảng viên không tồn tại" });
        }

        entity.MaCoVanHocTap = request.MaGiangVien;
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(n => n.CoVanHocTap).LoadAsync();

        return Ok(ToDto(entity));
    }
}
