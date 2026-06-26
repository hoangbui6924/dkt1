using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.TaiKhoan;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

// Quản lý tài khoản & quyền: sửa thông tin đăng nhập, khoá/mở tài khoản, đặt lại mật khẩu mặc định.
[ApiController]
[Route("api/tai-khoan")]
[Authorize(Roles = "Admin")]
public class TaiKhoanController : ControllerBase
{
    private const string MatKhauMacDinh = "123456a@B";

    private readonly AppDbContext _db;

    public TaiKhoanController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaiKhoanDto>>> GetAll()
    {
        var sinhViens = await _db.SinhViens
            .Where(s => s.MaTaiKhoan != null)
            .Select(s => new { MaTaiKhoan = s.MaTaiKhoan!.Value, s.HoTen, s.MaSoSV })
            .ToListAsync();
        var giangViens = await _db.GiangViens
            .Where(g => g.MaTaiKhoan != null)
            .Select(g => new { MaTaiKhoan = g.MaTaiKhoan!.Value, g.HoTen, g.Email })
            .ToListAsync();

        var svMap = sinhViens.ToDictionary(s => s.MaTaiKhoan);
        var gvMap = giangViens.ToDictionary(g => g.MaTaiKhoan);

        var taiKhoans = await _db.TaiKhoans.Include(t => t.Quyen).OrderBy(t => t.TenDangNhap).ToListAsync();

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

        taiKhoan.MatKhauHash = BCrypt.Net.BCrypt.HashPassword(MatKhauMacDinh);
        await _db.SaveChangesAsync();

        return Ok(new DatLaiMatKhauResponse(MatKhauMacDinh));
    }
}
