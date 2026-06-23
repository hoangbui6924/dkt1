using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.KhungChuongTrinh;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/khung-chuong-trinh")]
[Authorize]
public class KhungChuongTrinhController : ControllerBase
{
    private readonly AppDbContext _db;

    public KhungChuongTrinhController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<KhungChuongTrinhDto> ToDto(KhungChuongTrinh k)
    {
        var monHocs = await _db.MonHocThuocKhungChuongTrinhs
            .Where(m => m.MaKhungChuongTrinh == k.MaKhungChuongTrinh)
            .Include(m => m.MonHoc)
            .ToListAsync();

        var nganh = k.NganhHoc ?? await _db.NganhHocs.Include(n => n.KhoaVien).FirstAsync(n => n.MaNganh == k.MaNganhHoc);

        return new KhungChuongTrinhDto(
            k.MaKhungChuongTrinh,
            k.MaNganhHoc,
            nganh.TenNganh,
            nganh.KhoaVien?.TenKhoaVien ?? "",
            k.TongTinChi,
            k.SoTinChiBatBuoc,
            k.SoTinChiTuChonToiThieu,
            monHocs.Where(m => m.MonHoc!.LoaiMonHoc == "Bắt buộc").Sum(m => m.MonHoc!.SoTinChi),
            monHocs.Where(m => m.MonHoc!.LoaiMonHoc == "Tự chọn").Sum(m => m.MonHoc!.SoTinChi),
            monHocs.Count);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<KhungChuongTrinhDto>>> GetAll()
    {
        var khungs = await _db.KhungChuongTrinhs
            .Include(k => k.NganhHoc).ThenInclude(n => n!.KhoaVien)
            .OrderBy(k => k.NganhHoc!.TenNganh)
            .ToListAsync();

        var result = new List<KhungChuongTrinhDto>();
        foreach (var k in khungs)
            result.Add(await ToDto(k));

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<KhungChuongTrinhDto>> GetById(int id)
    {
        var entity = await _db.KhungChuongTrinhs
            .Include(k => k.NganhHoc).ThenInclude(n => n!.KhoaVien)
            .FirstOrDefaultAsync(k => k.MaKhungChuongTrinh == id);

        if (entity is null) return NotFound();
        return Ok(await ToDto(entity));
    }

    [HttpGet("by-nganh/{maNganh:int}")]
    public async Task<ActionResult<KhungChuongTrinhDto>> GetByNganh(int maNganh)
    {
        var entity = await _db.KhungChuongTrinhs
            .Include(k => k.NganhHoc).ThenInclude(n => n!.KhoaVien)
            .FirstOrDefaultAsync(k => k.MaNganhHoc == maNganh);

        if (entity is null) return NotFound();
        return Ok(await ToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<KhungChuongTrinhDto>> Create(CreateKhungChuongTrinhRequest request)
    {
        var nganh = await _db.NganhHocs.FindAsync(request.MaNganhHoc);
        if (nganh is null)
            return BadRequest(new { message = "Ngành học không tồn tại" });

        var exists = await _db.KhungChuongTrinhs.AnyAsync(k => k.MaNganhHoc == request.MaNganhHoc);
        if (exists)
            return Conflict(new { message = "Ngành học này đã có khung chương trình" });

        if (request.TongTinChi <= 0 || request.SoTinChiBatBuoc < 0 || request.SoTinChiTuChonToiThieu < 0)
            return BadRequest(new { message = "Số tín chỉ không hợp lệ" });

        var entity = new KhungChuongTrinh
        {
            MaNganhHoc = request.MaNganhHoc,
            TongTinChi = request.TongTinChi,
            SoTinChiBatBuoc = request.SoTinChiBatBuoc,
            SoTinChiTuChonToiThieu = request.SoTinChiTuChonToiThieu
        };
        _db.KhungChuongTrinhs.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaKhungChuongTrinh }, await ToDto(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateKhungChuongTrinhRequest request)
    {
        var entity = await _db.KhungChuongTrinhs.FindAsync(id);
        if (entity is null) return NotFound();

        if (request.TongTinChi <= 0 || request.SoTinChiBatBuoc < 0 || request.SoTinChiTuChonToiThieu < 0)
            return BadRequest(new { message = "Số tín chỉ không hợp lệ" });

        entity.TongTinChi = request.TongTinChi;
        entity.SoTinChiBatBuoc = request.SoTinChiBatBuoc;
        entity.SoTinChiTuChonToiThieu = request.SoTinChiTuChonToiThieu;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.KhungChuongTrinhs.FindAsync(id);
        if (entity is null) return NotFound();

        _db.KhungChuongTrinhs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("{id:int}/mon-hoc")]
    public async Task<ActionResult<IEnumerable<MonHocTrongKhungDto>>> GetMonHocs(int id)
    {
        var exists = await _db.KhungChuongTrinhs.AnyAsync(k => k.MaKhungChuongTrinh == id);
        if (!exists) return NotFound();

        var rows = await _db.MonHocThuocKhungChuongTrinhs
            .Where(m => m.MaKhungChuongTrinh == id)
            .Include(m => m.MonHoc).ThenInclude(mh => mh!.BoMon).ThenInclude(b => b!.KhoaVien)
            .Include(m => m.MonHoc).ThenInclude(mh => mh!.KhoaVien)
            .Include(m => m.MonHoc).ThenInclude(mh => mh!.MonHocTienQuyet)
            .OrderBy(m => m.KyHoc).ThenBy(m => m.MonHoc!.TenMonHoc)
            .ToListAsync();

        var result = rows.Select(m => new MonHocTrongKhungDto(
            m.Ma,
            m.MaMonHoc,
            m.MonHoc!.TenMonHoc,
            m.MonHoc.LoaiMonHoc,
            m.MonHoc.SoTinChi,
            m.MonHoc.MaBoMon,
            m.MonHoc.BoMon?.TenBoMon,
            m.MonHoc.MaBoMon != null ? m.MonHoc.BoMon?.MaKhoaVien : m.MonHoc.MaKhoaVien,
            m.MonHoc.MaBoMon != null ? m.MonHoc.BoMon?.KhoaVien?.TenKhoaVien : m.MonHoc.KhoaVien?.TenKhoaVien,
            m.KyHoc,
            m.MonHoc.MaMonHocTienQuyet,
            m.MonHoc.MonHocTienQuyet?.TenMonHoc));

        return Ok(result);
    }

    [HttpPost("{id:int}/mon-hoc")]
    public async Task<ActionResult<MonHocTrongKhungDto>> AddMonHoc(int id, AddMonHocVaoKhungRequest request)
    {
        var khung = await _db.KhungChuongTrinhs.FindAsync(id);
        if (khung is null) return NotFound();

        if (request.KyHoc <= 0)
            return BadRequest(new { message = "Kỳ học không hợp lệ" });

        var monHoc = await _db.MonHocs.FindAsync(request.MaMonHoc);
        if (monHoc is null)
            return BadRequest(new { message = "Môn học không tồn tại" });

        var exists = await _db.MonHocThuocKhungChuongTrinhs
            .AnyAsync(m => m.MaKhungChuongTrinh == id && m.MaMonHoc == request.MaMonHoc);
        if (exists)
            return Conflict(new { message = "Môn học này đã có trong khung chương trình" });

        var entity = new MonHocThuocKhungChuongTrinh
        {
            MaKhungChuongTrinh = id,
            MaMonHoc = request.MaMonHoc,
            KyHoc = request.KyHoc
        };
        _db.MonHocThuocKhungChuongTrinhs.Add(entity);
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPut("mon-hoc/{ma:int}")]
    public async Task<IActionResult> UpdateKyHoc(int ma, UpdateKyHocRequest request)
    {
        var entity = await _db.MonHocThuocKhungChuongTrinhs.FindAsync(ma);
        if (entity is null) return NotFound();

        if (request.KyHoc <= 0)
            return BadRequest(new { message = "Kỳ học không hợp lệ" });

        entity.KyHoc = request.KyHoc;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("mon-hoc/{ma:int}")]
    public async Task<IActionResult> RemoveMonHoc(int ma)
    {
        var entity = await _db.MonHocThuocKhungChuongTrinhs.FindAsync(ma);
        if (entity is null) return NotFound();

        _db.MonHocThuocKhungChuongTrinhs.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
