using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.DTOs.KetQuaHocTap;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/ket-qua-hoc-tap")]
[Authorize]
public class KetQuaHocTapController : ControllerBase
{
    private readonly AppDbContext _db;

    public KetQuaHocTapController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("me")]
    public async Task<ActionResult<KetQuaHocTapDto>> GetMe()
    {
        var maTaiKhoanClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(maTaiKhoanClaim, out var maTaiKhoan)) return Unauthorized();

        var sv = await _db.SinhViens
            .Include(s => s.NhomLopNganh)
            .FirstOrDefaultAsync(s => s.MaTaiKhoan == maTaiKhoan);
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var dangKys = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.HocKy).ThenInclude(h => h!.NamHoc)
            .Include(d => d.DiemHocPhan)
            .ToListAsync();

        var hocKys = dangKys
            .GroupBy(d => d.LopHocTrongKy!.MaHocKy)
            .Select(g =>
            {
                var hocKy = g.First().LopHocTrongKy!.HocKy!;
                var hocPhans = g.Select(d =>
                {
                    var z = d.DiemHocPhan?.DiemZ;
                    var chu = z.HasValue ? DiemQuyDoi.TinhDiemChuVaThang4(z.Value).DiemChu : null;
                    var monHoc = d.LopHocTrongKy!.MonHoc!;
                    return new HocPhanKetQuaDto(
                        monHoc.MaMonHoc, monHoc.TenMonHoc, monHoc.SoTinChi,
                        d.DiemHocPhan?.DiemX, d.DiemHocPhan?.DiemY, z, chu,
                        monHoc.LoaiMonHoc == "Tự chọn" ? "Tự Chọn" : null);
                })
                .OrderBy(h => h.TenMonHoc)
                .ToList();
                return (hocKy.NgayBatDau, dto: new HocKyKetQuaDto(hocKy.MaHocKy, hocKy.TenHocKy, hocKy.NamHoc?.TenNamHoc ?? "", hocPhans));
            })
            .OrderBy(x => x.NgayBatDau)
            .Select(x => x.dto)
            .ToList();

        return Ok(new KetQuaHocTapDto(
            sv.MaSoSV, sv.HoTen, sv.NgaySinh, sv.GioiTinh, sv.NhomLopNganh?.TenNhomLop ?? "",
            sv.TongTinChiTichLuy, sv.GPATichLuy, hocKys));
    }
}
