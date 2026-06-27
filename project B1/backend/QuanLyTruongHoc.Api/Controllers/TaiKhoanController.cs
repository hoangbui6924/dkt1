using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.TaiKhoan;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

// Quản lý tài khoản & quyền: sửa thông tin đăng nhập, khoá/mở tài khoản, đặt lại mật khẩu mặc định.
// Admin: toàn bộ tài khoản. Giảng viên: chỉ tài khoản SINH VIÊN thuộc khoa viện của mình.
[ApiController]
[Route("api/tai-khoan")]
[Authorize]
public class TaiKhoanController : ControllerBase
{
    private const string MatKhauMacDinh = "123456a@B";

    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public TaiKhoanController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    // GV chỉ được thao tác tài khoản của sinh viên thuộc khoa viện mình (không động vào tài khoản GV/Admin).
    private async Task<bool> TaiKhoanKhongHopLe(int maTaiKhoan)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        var maKv = await _db.SinhViens
            .Where(s => s.MaTaiKhoan == maTaiKhoan)
            .Select(s => (int?)s.KhoaHocNganh!.NganhHoc!.MaKhoaVien)
            .FirstOrDefaultAsync();
        return maKv == null || scope?.MaKhoaVien != maKv;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaiKhoanDto>>> GetAll()
    {
        var laGiangVien = _scope.IsGiangVien(User);
        var scope = laGiangVien ? await _scope.ResolveAsync(User) : null;
        var maKvGv = scope?.MaKhoaVien ?? -1;

        var svQuery = _db.SinhViens.Where(s => s.MaTaiKhoan != null);
        if (laGiangVien)
            svQuery = svQuery.Where(s => s.KhoaHocNganh!.NganhHoc!.MaKhoaVien == maKvGv);

        var sinhViens = await svQuery
            .Select(s => new { MaTaiKhoan = s.MaTaiKhoan!.Value, s.HoTen, s.MaSoSV })
            .ToListAsync();
        var svMap = sinhViens.ToDictionary(s => s.MaTaiKhoan);

        // GV không thấy tài khoản giảng viên/admin.
        var gvMap = laGiangVien
            ? new Dictionary<int, (string HoTen, string? Email)>()
            : (await _db.GiangViens
                .Where(g => g.MaTaiKhoan != null)
                .Select(g => new { MaTaiKhoan = g.MaTaiKhoan!.Value, g.HoTen, g.Email })
                .ToListAsync()).ToDictionary(g => g.MaTaiKhoan, g => (g.HoTen, g.Email));

        var taiKhoanQuery = _db.TaiKhoans.Include(t => t.Quyen).AsQueryable();
        if (laGiangVien)
        {
            // Chỉ tài khoản của sinh viên trong khoa viện GV.
            var ids = svMap.Keys.ToList();
            taiKhoanQuery = taiKhoanQuery.Where(t => ids.Contains(t.MaTaiKhoan));
        }

        var taiKhoans = await taiKhoanQuery.OrderBy(t => t.TenDangNhap).ToListAsync();

        var result = taiKhoans.Select(t =>
        {
            string? hoTen = null, maSoSV = null, email = null;
            if (svMap.TryGetValue(t.MaTaiKhoan, out var sv))
            {
                hoTen = sv.HoTen;
                maSoSV = sv.MaSoSV;
            }
            else if (gvMap.TryGetValue(t.MaTaiKhoan, out var gv))
            {
                hoTen = gv.HoTen;
                email = gv.Email;
            }

            return new TaiKhoanDto(
                t.MaTaiKhoan, t.TenDangNhap, t.MaQuyen, t.Quyen?.TenQuyen ?? "",
                t.TrangThai, t.NgayTao, hoTen, maSoSV, email);
        });

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateTaiKhoanRequest request)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(id);
        if (taiKhoan is null) return NotFound();

        if (await TaiKhoanKhongHopLe(id)) return Forbid();

        var ten = request.TenDangNhap.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên đăng nhập không được để trống" });

        var trung = await _db.TaiKhoans.AnyAsync(t => t.TenDangNhap == ten && t.MaTaiKhoan != id);
        if (trung)
            return Conflict(new { message = "Tên đăng nhập đã được sử dụng bởi tài khoản khác" });

        taiKhoan.TenDangNhap = ten;
        taiKhoan.TrangThai = request.TrangThai;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Đặt lại mật khẩu về mặc định, dùng khi sinh viên/giảng viên quên mật khẩu
    [HttpPost("{id:int}/dat-lai-mat-khau")]
    public async Task<ActionResult<DatLaiMatKhauResponse>> DatLaiMatKhau(int id)
    {
        var taiKhoan = await _db.TaiKhoans.FindAsync(id);
        if (taiKhoan is null) return NotFound();

        if (await TaiKhoanKhongHopLe(id)) return Forbid();

        taiKhoan.MatKhauHash = BCrypt.Net.BCrypt.HashPassword(MatKhauMacDinh);
        await _db.SaveChangesAsync();

        return Ok(new DatLaiMatKhauResponse(MatKhauMacDinh));
    }
}
