using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Infrastructure.Services;

public class TeacherScopeService : ITeacherScopeService
{
    private readonly AppDbContext _db;

    public TeacherScopeService(AppDbContext db)
    {
        _db = db;
    }

    public bool IsGiangVien(ClaimsPrincipal user) => user.IsInRole("GiangVien");

    public async Task<TeacherScope?> ResolveAsync(ClaimsPrincipal user)
    {
        if (!IsGiangVien(user)) return null;

        var maTaiKhoanClaim = (user.FindFirst(ClaimTypes.NameIdentifier) ?? user.FindFirst("sub"))?.Value;
        if (!int.TryParse(maTaiKhoanClaim, out var maTaiKhoan)) return null;

        var gv = await _db.GiangViens
            .Include(g => g.BoMon)
            .FirstOrDefaultAsync(g => g.MaTaiKhoan == maTaiKhoan);
        if (gv is null) return null;

        // Khoa viện: gắn trực tiếp, hoặc suy ra từ bộ môn.
        var maKhoaVien = gv.MaKhoaVien ?? gv.BoMon?.MaKhoaVien;
        return new TeacherScope(gv.MaGiangVien, maKhoaVien);
    }
}
