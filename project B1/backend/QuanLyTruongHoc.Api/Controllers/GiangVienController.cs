using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.GiangVien;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/giang-vien")]
[Authorize]
public class GiangVienController : ControllerBase
{
    private const string MatKhauMacDinh = "123456a@B";

    private readonly AppDbContext _db;

    public GiangVienController(AppDbContext db)
    {
        _db = db;
    }

    private static GiangVienDto ToDto(GiangVien g) => new(
        g.MaGiangVien,
        g.HoTen,
        g.MaBoMon,
        g.BoMon?.TenBoMon,
        g.MaBoMon.HasValue ? g.BoMon?.MaKhoaVien : g.MaKhoaVien,
        g.MaBoMon.HasValue ? g.BoMon?.KhoaVien?.TenKhoaVien : g.KhoaVien?.TenKhoaVien,
        g.Email,
        g.SoDienThoai,
        g.MaTaiKhoan,
        g.TaiKhoan?.TenDangNhap,
        g.LopHocKyGiangViens?.Count ?? 0);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GiangVienDto>>> GetAll()
    {
        var result = await _db.GiangViens
            .Include(g => g.BoMon).ThenInclude(b => b!.KhoaVien)
            .Include(g => g.KhoaVien)
            .Include(g => g.TaiKhoan)
            .Include(g => g.LopHocKyGiangViens)
            .OrderBy(g => g.HoTen)
            .ToListAsync();

        return Ok(result.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GiangVienDto>> GetById(int id)
    {
        var entity = await _db.GiangViens
            .Include(g => g.BoMon).ThenInclude(b => b!.KhoaVien)
            .Include(g => g.KhoaVien)
            .Include(g => g.TaiKhoan)
            .Include(g => g.LopHocKyGiangViens)
            .FirstOrDefaultAsync(g => g.MaGiangVien == id);

        if (entity is null) return NotFound();
        return Ok(ToDto(entity));
    }

    private async Task<string?> ValidateNoiThuoc(int? maBoMon, int? maKhoaVien)
    {
        if (maBoMon.HasValue && maKhoaVien.HasValue)
            return "Giảng viên chỉ được thuộc 1 bộ môn HOẶC 1 khoa viện trực tiếp, không thể chọn cả hai";

        if (!maBoMon.HasValue && !maKhoaVien.HasValue)
            return "Vui lòng chọn bộ môn hoặc khoa viện cho giảng viên này";

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
    public async Task<ActionResult<GiangVienDto>> Create(CreateGiangVienRequest request)
    {
        var hoTen = request.HoTen.Trim();
        if (string.IsNullOrWhiteSpace(hoTen))
            return BadRequest(new { message = "Họ tên không được để trống" });

        var email = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống (dùng làm tên đăng nhập tài khoản)" });

        var noiThuocError = await ValidateNoiThuoc(request.MaBoMon, request.MaKhoaVien);
        if (noiThuocError != null)
            return BadRequest(new { message = noiThuocError });

        var taiKhoanTonTai = await _db.TaiKhoans.AnyAsync(t => t.TenDangNhap == email);
        if (taiKhoanTonTai)
            return Conflict(new { message = "Email này đã được dùng làm tên đăng nhập cho 1 tài khoản khác" });

        var quyenGiangVien = await _db.Quyens.FirstOrDefaultAsync(q => q.TenQuyen == "GiangVien");
        if (quyenGiangVien is null)
        {
            quyenGiangVien = new Quyen { TenQuyen = "GiangVien" };
            _db.Quyens.Add(quyenGiangVien);
            await _db.SaveChangesAsync();
        }

        var taiKhoan = new TaiKhoan
        {
            TenDangNhap = email,
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword(MatKhauMacDinh),
            MaQuyen = quyenGiangVien.MaQuyen,
            TrangThai = true
        };
        _db.TaiKhoans.Add(taiKhoan);
        await _db.SaveChangesAsync();

        var entity = new GiangVien
        {
            HoTen = hoTen,
            MaBoMon = request.MaBoMon,
            MaKhoaVien = request.MaKhoaVien,
            Email = email,
            SoDienThoai = request.SoDienThoai?.Trim(),
            MaTaiKhoan = taiKhoan.MaTaiKhoan
        };
        _db.GiangViens.Add(entity);
        await _db.SaveChangesAsync();

        if (entity.MaBoMon.HasValue)
        {
            await _db.Entry(entity).Reference(g => g.BoMon).LoadAsync();
            await _db.Entry(entity.BoMon!).Reference(b => b.KhoaVien).LoadAsync();
        }
        else
        {
            await _db.Entry(entity).Reference(g => g.KhoaVien).LoadAsync();
        }
        await _db.Entry(entity).Reference(g => g.TaiKhoan).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaGiangVien }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateGiangVienRequest request)
    {
        var entity = await _db.GiangViens.FindAsync(id);
        if (entity is null) return NotFound();

        var hoTen = request.HoTen.Trim();
        if (string.IsNullOrWhiteSpace(hoTen))
            return BadRequest(new { message = "Họ tên không được để trống" });

        var noiThuocError = await ValidateNoiThuoc(request.MaBoMon, request.MaKhoaVien);
        if (noiThuocError != null)
            return BadRequest(new { message = noiThuocError });

        entity.HoTen = hoTen;
        entity.MaBoMon = request.MaBoMon;
        entity.MaKhoaVien = request.MaKhoaVien;
        entity.Email = request.Email?.Trim();
        entity.SoDienThoai = request.SoDienThoai?.Trim();
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.GiangViens
            .Include(g => g.LopHocKyGiangViens)
            .FirstOrDefaultAsync(g => g.MaGiangVien == id);

        if (entity is null) return NotFound();

        if (entity.LopHocKyGiangViens.Count > 0)
            return Conflict(new { message = "Không thể xoá: giảng viên đang được phân công lớp học phần" });

        _db.GiangViens.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
