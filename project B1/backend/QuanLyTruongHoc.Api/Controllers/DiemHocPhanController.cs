using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.DTOs.DiemHocPhan;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/diem-hoc-phan")]
[Authorize]
public class DiemHocPhanController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITeacherScopeService _scope;

    public DiemHocPhanController(AppDbContext db, ITeacherScopeService scope)
    {
        _db = db;
        _scope = scope;
    }

    // Nhập điểm: GV chỉ được thao tác lớp mình được phân công dạy (sinh viên ngành nào cũng được).
    private async Task<bool> LopKhongPhaiCuaToi(int maLopHocKy)
    {
        if (!_scope.IsGiangVien(User)) return false;
        var scope = await _scope.ResolveAsync(User);
        var maGv = scope?.MaGiangVien ?? -1;
        var coDay = await _db.LopHocKyGiangViens.AnyAsync(g => g.MaLopHocKy == maLopHocKy && g.MaGiangVien == maGv);
        return !coDay;
    }

    private static SinhVienTrongLopDiemDto ToDto(DangKyLopHoc d)
    {
        var z = d.DiemHocPhan?.DiemZ;
        string? chu = null;
        decimal? thang4 = null;
        if (z.HasValue) (chu, thang4) = DiemQuyDoi.TinhDiemChuVaThang4(z.Value);

        return new SinhVienTrongLopDiemDto(
            d.MaDangKy, d.MaSinhVien, d.SinhVien!.MaSoSV, d.SinhVien.HoTen,
            d.DiemHocPhan?.DiemX, d.DiemHocPhan?.DiemY, z, chu, thang4,
            z.HasValue ? "DaNhap" : "ChuaNhap");
    }

    [HttpGet("lop/{maLopHocKy:int}")]
    public async Task<ActionResult<LopDiemInfoDto>> GetByLop(int maLopHocKy)
    {
        var lop = await _db.LopHocTrongKys
            .Include(l => l.MonHoc)
            .Include(l => l.HocKy)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == maLopHocKy);
        if (lop is null) return NotFound();

        if (await LopKhongPhaiCuaToi(maLopHocKy)) return Forbid();

        var dangKys = await _db.DangKyLopHocs
            .Where(d => d.MaLopHocKy == maLopHocKy)
            .Include(d => d.SinhVien)
            .Include(d => d.DiemHocPhan)
            .ToListAsync();

        var sinhViens = dangKys.OrderBy(d => d.SinhVien!.HoTen).Select(ToDto).ToList();

        return Ok(new LopDiemInfoDto(
            lop.MaLopHocKy, lop.TenLop, lop.MaMonHoc, lop.MonHoc?.TenMonHoc ?? "",
            lop.MonHoc?.SoTinChi ?? 0, lop.MaHocKy, lop.HocKy?.TenHocKy ?? "", sinhViens));
    }

    [HttpPut("{maDangKy:int}")]
    public async Task<ActionResult<SinhVienTrongLopDiemDto>> NhapDiem(int maDangKy, NhapDiemRequest request)
    {
        var dangKy = await _db.DangKyLopHocs
            .Include(d => d.SinhVien)
            .Include(d => d.DiemHocPhan)
            .FirstOrDefaultAsync(d => d.MaDangKy == maDangKy);
        if (dangKy is null) return NotFound();

        if (await LopKhongPhaiCuaToi(dangKy.MaLopHocKy)) return Forbid();

        if (request.DiemX.HasValue && (request.DiemX < 0 || request.DiemX > 10))
            return BadRequest(new { message = "Điểm X phải trong khoảng 0-10" });
        if (request.DiemY.HasValue && (request.DiemY < 0 || request.DiemY > 10))
            return BadRequest(new { message = "Điểm Y phải trong khoảng 0-10" });

        var diem = dangKy.DiemHocPhan;
        if (diem is null)
        {
            diem = new DiemHocPhan { MaDangKy = maDangKy };
            _db.DiemHocPhans.Add(diem);
        }
        diem.DiemX = request.DiemX;
        diem.DiemY = request.DiemY;
        diem.DiemZ = diem.DiemX.HasValue && diem.DiemY.HasValue
            ? Math.Round((diem.DiemX.Value + diem.DiemY.Value) / 2, 2)
            : null;
        diem.NgayNhapDiem = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await CapNhatTichLuyAsync(dangKy.MaSinhVien);

        dangKy.DiemHocPhan = diem;
        return Ok(ToDto(dangKy));
    }

    private async Task CapNhatTichLuyAsync(int maSinhVien)
    {
        var dangKys = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == maSinhVien)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .Include(d => d.DiemHocPhan)
            .ToListAsync();

        // Mỗi môn chỉ tính 1 lần theo điểm Z cao nhất (tránh học cải thiện bị cộng tín 2 lần)
        var diemDaNhap = dangKys.Where(d => d.DiemHocPhan?.DiemZ != null).ToList();
        var bestPerMon = diemDaNhap
            .GroupBy(d => d.LopHocTrongKy!.MaMonHoc)
            .Select(g => g.OrderByDescending(d => d.DiemHocPhan!.DiemZ).First())
            .ToList();
        var datList = bestPerMon.Where(d => d.DiemHocPhan!.DiemZ!.Value >= DiemQuyDoi.DiemDat).ToList();

        var tongTinChi = datList.Sum(d => d.LopHocTrongKy!.MonHoc!.SoTinChi);
        decimal tongDiemNhanTinChi = 0;
        foreach (var d in datList)
        {
            var (_, thang4) = DiemQuyDoi.TinhDiemChuVaThang4(d.DiemHocPhan!.DiemZ!.Value);
            tongDiemNhanTinChi += thang4 * d.LopHocTrongKy!.MonHoc!.SoTinChi;
        }
        var gpa = tongTinChi > 0 ? Math.Round(tongDiemNhanTinChi / tongTinChi, 2) : 0;

        var sv = await _db.SinhViens.FindAsync(maSinhVien);
        if (sv != null)
        {
            sv.TongTinChiTichLuy = tongTinChi;
            sv.GPATichLuy = gpa;
            await _db.SaveChangesAsync();
        }
    }
}
