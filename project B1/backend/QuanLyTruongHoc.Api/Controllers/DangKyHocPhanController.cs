using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.Common;
using static QuanLyTruongHoc.Application.Common.DangKyRules;
using QuanLyTruongHoc.Application.DTOs.DangKyHocPhan;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/dang-ky-hoc-phan")]
[Authorize]
public class DangKyHocPhanController : ControllerBase
{
    // Bắt buộc đúng đợt đăng ký + khung giờ đã cấu hình cho từng sinh viên. Đặt false để test mở tự do.
    private const bool BatBuocDot = true;

    private readonly AppDbContext _db;
    private readonly IGoiYLichService _goiYLich;

    public DangKyHocPhanController(AppDbContext db, IGoiYLichService goiYLich)
    {
        _db = db;
        _goiYLich = goiYLich;
    }

    private async Task<Domain.Entities.SinhVien?> GetSinhVienHienTaiAsync()
    {
        var maTaiKhoanClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(maTaiKhoanClaim, out var maTaiKhoan)) return null;

        return await _db.SinhViens
            .Include(s => s.KhoaHocNganh).ThenInclude(k => k!.NganhHoc)
            .FirstOrDefaultAsync(s => s.MaTaiKhoan == maTaiKhoan);
    }

    private static bool TrungLich(IEnumerable<LichHocLopHocKy> a, IEnumerable<LichHocLopHocKy> b) =>
        LichHoc.TrungNhau(a, b);

    // Trạng thái đăng ký/rút cho 1 sinh viên trong 1 học kỳ, dựa trên các đợt áp dụng
    private (bool dangMoDk, bool dangMoRut, string? tenDot) TrangThaiDot(int maHocKy, List<DotDangKy> dotsCuaSv, DateTime now)
    {
        if (!BatBuocDot) return (true, true, "Chế độ test (mở tự do)");
        var eligible = dotsCuaSv
            .Where(d => d.MaHocKy == maHocKy && now >= d.ThoiGianBatDau && now <= d.ThoiGianKetThuc)
            .ToList();
        var dk = eligible.Any(d => d.ChoPhepDangKy);
        var rut = eligible.Any(d => d.ChoPhepRut);
        var ten = eligible.FirstOrDefault(d => d.ChoPhepDangKy)?.Ten ?? eligible.FirstOrDefault()?.Ten;
        return (dk, rut, ten);
    }

    [HttpGet("hoc-ky-mo")]
    public async Task<ActionResult<HocKyDangKyDto>> GetHocKyMo()
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var hocKy = await _goiYLich.ResolveHocKyHienTaiAsync(sv);
        if (hocKy is null) return NoContent();

        var now = VnNow();
        var dotsCuaSv = (await _db.DotDangKys.ToListAsync()).Where(d => DotApDungCho(d, sv)).ToList();
        var (dangMoDk, dangMoRut, tenDot) = TrangThaiDot(hocKy.MaHocKy, dotsCuaSv, now);
        var dto = new HocKyDangKyDto(
            hocKy.MaHocKy, hocKy.TenHocKy, hocKy.LoaiHocKy, hocKy.MaNamHoc, hocKy.NamHoc?.TenNamHoc ?? "",
            hocKy.NgayBatDau, hocKy.NgayKetThuc, hocKy.HanDangKyTu, hocKy.HanDangKyDen, hocKy.HanRutDangKyTu, hocKy.HanRutDangKyDen,
            dangMoDk, dangMoRut, tenDot);
        return Ok(dto);
    }

    [HttpGet("{maHocKy:int}/da-dang-ky")]
    public async Task<ActionResult<IEnumerable<LopDaDangKyDto>>> GetDaDangKy(int maHocKy)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var dangKys = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien && d.LopHocTrongKy!.MaHocKy == maHocKy)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LichHocs)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.DangKyLopHocs)
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .ToListAsync();

        var result = dangKys.Select(d =>
        {
            var l = d.LopHocTrongKy!;
            var gv = l.LopHocKyGiangViens.FirstOrDefault()?.GiangVien;
            return new LopDaDangKyDto(
                d.MaDangKy, l.MaLopHocKy, l.TenLop, l.MaMonHoc, l.MonHoc?.TenMonHoc ?? "",
                l.MonHoc?.SoTinChi ?? 0, l.LoaiHinh, gv?.MaGiangVien, gv?.HoTen,
                l.DangKyLopHocs.Count, l.SiSoToiDa, ToBuoiHocs(l.LichHocs));
        }).ToList();

        return Ok(result);
    }

    [HttpGet("{maHocKy:int}/chuong-trinh")]
    public async Task<ActionResult<ChuongTrinhDangKyDto>> GetChuongTrinh(int maHocKy)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var hocKy = await _db.HocKys.Include(h => h.NamHoc).FirstOrDefaultAsync(h => h.MaHocKy == maHocKy);
        if (hocKy is null) return NotFound(new { message = "Học kỳ không tồn tại" });

        return Ok(await _goiYLich.BuildChuongTrinhAsync(sv, hocKy));
    }

    [HttpGet("{maHocKy:int}/mon/{maMonHoc:int}/lop")]
    public async Task<ActionResult<IEnumerable<LopCuaMonDto>>> GetLopCuaMon(int maHocKy, int maMonHoc)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        // Lịch các lớp sinh viên đã đăng ký trong kỳ này, KHÔNG tính lớp của chính môn này (vì nếu đã đăng ký môn này
        // rồi thì đây là màn đổi sang lớp khác trong cùng môn, không nên tự báo trùng với lựa chọn hiện tại của mình).
        var lichDaDangKy = await _db.LichHocLopHocKys
            .Where(x => x.LopHocTrongKy!.MaHocKy == maHocKy && x.LopHocTrongKy.MaMonHoc != maMonHoc &&
                        x.LopHocTrongKy.DangKyLopHocs.Any(d => d.MaSinhVien == sv.MaSinhVien))
            .ToListAsync();

        var maLopHienTai = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien && d.LopHocTrongKy!.MaHocKy == maHocKy && d.LopHocTrongKy.MaMonHoc == maMonHoc)
            .Select(d => d.MaLopHocKy)
            .FirstOrDefaultAsync();

        var lops = await _db.LopHocTrongKys
            .Where(l => l.MaHocKy == maHocKy && l.MaMonHoc == maMonHoc)
            .Include(l => l.LichHocs)
            .Include(l => l.DangKyLopHocs)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .OrderBy(l => l.TenLop)
            .ToListAsync();

        var result = lops.Select(l =>
        {
            var gv = l.LopHocKyGiangViens.FirstOrDefault()?.GiangVien;
            return new LopCuaMonDto(
                l.MaLopHocKy, l.TenLop, l.LoaiHinh, gv?.MaGiangVien, gv?.HoTen,
                l.DangKyLopHocs.Count, l.SiSoToiDa,
                l.DangKyLopHocs.Count >= l.SiSoToiDa,
                TrungLich(l.LichHocs, lichDaDangKy),
                l.MaLopHocKy == maLopHienTai,
                ToBuoiHocs(l.LichHocs));
        }).ToList();

        return Ok(result);
    }

    [HttpPost("{maLopHocKy:int}")]
    public async Task<ActionResult<LopDaDangKyDto>> DangKy(int maLopHocKy)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var lop = await _db.LopHocTrongKys
            .Include(l => l.MonHoc)
            .Include(l => l.HocKy)
            .Include(l => l.LichHocs)
            .Include(l => l.DangKyLopHocs)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == maLopHocKy);
        if (lop is null) return NotFound(new { message = "Lớp học không tồn tại" });

        var hocKy = lop.HocKy!;
        var now = VnNow();
        var dotsCuaSv = (await _db.DotDangKys.ToListAsync()).Where(d => DotApDungCho(d, sv)).ToList();
        var (dangMo, _, _) = TrangThaiDot(hocKy.MaHocKy, dotsCuaSv, now);
        if (!dangMo)
            return BadRequest(new { message = "Hiện không trong thời gian đăng ký học phần dành cho bạn ở học kỳ này" });

        // Đã đăng ký một lớp của môn này trong kỳ?
        var dangKyMonNay = await _db.DangKyLopHocs
            .Include(d => d.LopHocTrongKy)
            .FirstOrDefaultAsync(d => d.MaSinhVien == sv.MaSinhVien &&
                                      d.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy &&
                                      d.LopHocTrongKy.MaMonHoc == lop.MaMonHoc);
        if (dangKyMonNay != null)
        {
            if (dangKyMonNay.MaLopHocKy == maLopHocKy)
                return Conflict(new { message = "Bạn đã đăng ký lớp này rồi" });
            return Conflict(new { message = "Bạn đã đăng ký một lớp khác của môn này trong kỳ" });
        }

        if (lop.DangKyLopHocs.Count >= lop.SiSoToiDa)
            return Conflict(new { message = "Lớp đã đầy, không thể đăng ký" });

        // Lịch sử điểm để kiểm tra đã đạt / tiên quyết
        var history = await _db.DangKyLopHocs
            .Where(d => d.MaSinhVien == sv.MaSinhVien)
            .Include(d => d.LopHocTrongKy)
            .Include(d => d.DiemHocPhan)
            .ToListAsync();
        var maxZ = history.Where(h => h.DiemHocPhan?.DiemZ != null)
            .GroupBy(h => h.LopHocTrongKy!.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.Max(x => x.DiemHocPhan!.DiemZ!.Value));

        if (maxZ.TryGetValue(lop.MaMonHoc, out var zHienTai) && zHienTai >= DiemHetCaiThien)
            return Conflict(new { message = "Bạn đã đạt môn này (điểm >= 7), không cần đăng ký lại" });

        if (lop.MonHoc?.MaMonHocTienQuyet is int tienQuyet)
        {
            var datTienQuyet = maxZ.TryGetValue(tienQuyet, out var zt) && zt >= DiemDat;
            if (!datTienQuyet)
                return Conflict(new { message = "Bạn chưa đạt môn tiên quyết của môn này" });
        }

        // Môn bắt buộc chưa tới kỳ (chỉ chặn nếu chưa từng học)
        var (_, kyDat) = TinhKyDat(hocKy, sv.KhoaHocNganh?.NamNhapHoc ?? 0);
        var monKhung = await _db.MonHocThuocKhungChuongTrinhs
            .Include(m => m.MonHoc)
            .FirstOrDefaultAsync(m => m.MonHoc!.MaMonHoc == lop.MaMonHoc && m.KhungChuongTrinh!.MaNganhHoc == (sv.KhoaHocNganh!.MaNganhHoc));
        if (monKhung != null && lop.MonHoc?.LoaiMonHoc == "Bắt buộc" && monKhung.KyHoc > kyDat && !maxZ.ContainsKey(lop.MaMonHoc))
            return Conflict(new { message = "Chưa tới kỳ học của môn này" });

        // Trùng lịch với các lớp đã đăng ký trong kỳ
        var lichDaDangKy = await _db.LichHocLopHocKys
            .Where(x => x.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy &&
                        x.LopHocTrongKy.DangKyLopHocs.Any(d => d.MaSinhVien == sv.MaSinhVien))
            .ToListAsync();
        if (TrungLich(lop.LichHocs, lichDaDangKy))
            return Conflict(new { message = "Lịch học của lớp này trùng với một lớp bạn đã đăng ký" });

        var dangKy = new DangKyLopHoc
        {
            MaSinhVien = sv.MaSinhVien,
            MaLopHocKy = maLopHocKy,
            NgayDangKy = DateTime.UtcNow,
            TrangThai = "DaDangKy",
        };
        _db.DangKyLopHocs.Add(dangKy);
        await _db.SaveChangesAsync();

        var gv = lop.LopHocKyGiangViens.FirstOrDefault()?.GiangVien;
        var dto = new LopDaDangKyDto(
            dangKy.MaDangKy, lop.MaLopHocKy, lop.TenLop, lop.MaMonHoc, lop.MonHoc?.TenMonHoc ?? "",
            lop.MonHoc?.SoTinChi ?? 0, lop.LoaiHinh, gv?.MaGiangVien, gv?.HoTen,
            lop.DangKyLopHocs.Count + 1, lop.SiSoToiDa, ToBuoiHocs(lop.LichHocs));
        return Ok(dto);
    }

    [HttpDelete("{maDangKy:int}")]
    public async Task<IActionResult> HuyDangKy(int maDangKy)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var dangKy = await _db.DangKyLopHocs
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.HocKy)
            .Include(d => d.DiemHocPhan)
            .FirstOrDefaultAsync(d => d.MaDangKy == maDangKy);
        if (dangKy is null) return NotFound();
        if (dangKy.MaSinhVien != sv.MaSinhVien) return Forbid();

        var hocKy = dangKy.LopHocTrongKy!.HocKy!;
        var now = VnNow();
        var dotsCuaSv = (await _db.DotDangKys.ToListAsync()).Where(d => DotApDungCho(d, sv)).ToList();
        var (dangMoDk, dangMoRut, _) = TrangThaiDot(hocKy.MaHocKy, dotsCuaSv, now);
        if (!dangMoDk && !dangMoRut)
            return BadRequest(new { message = "Hiện không trong thời gian được phép huỷ/rút đăng ký" });

        if (dangKy.DiemHocPhan != null)
            _db.DiemHocPhans.Remove(dangKy.DiemHocPhan);
        _db.DangKyLopHocs.Remove(dangKy);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Đổi sang lớp khác của CÙNG một môn đã đăng ký (vd. đổi giờ học/giảng viên), không phải rút rồi đăng ký lại thủ công.
    [HttpPut("{maDangKy:int}/doi-lop")]
    public async Task<ActionResult<LopDaDangKyDto>> DoiLop(int maDangKy, DoiLopRequest request)
    {
        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        var dangKyCu = await _db.DangKyLopHocs
            .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.HocKy)
            .Include(d => d.DiemHocPhan)
            .FirstOrDefaultAsync(d => d.MaDangKy == maDangKy);
        if (dangKyCu is null) return NotFound();
        if (dangKyCu.MaSinhVien != sv.MaSinhVien) return Forbid();

        var lopMoi = await _db.LopHocTrongKys
            .Include(l => l.MonHoc)
            .Include(l => l.LichHocs)
            .Include(l => l.DangKyLopHocs)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == request.MaLopHocKyMoi);
        if (lopMoi is null) return NotFound(new { message = "Lớp học không tồn tại" });

        if (lopMoi.MaMonHoc != dangKyCu.LopHocTrongKy!.MaMonHoc)
            return BadRequest(new { message = "Lớp mới không thuộc cùng môn học đang đăng ký" });

        if (lopMoi.MaLopHocKy == dangKyCu.MaLopHocKy)
            return Conflict(new { message = "Bạn đang học đúng lớp này rồi" });

        var hocKy = dangKyCu.LopHocTrongKy.HocKy!;
        var now = VnNow();
        var dotsCuaSv = (await _db.DotDangKys.ToListAsync()).Where(d => DotApDungCho(d, sv)).ToList();
        var (dangMo, _, _) = TrangThaiDot(hocKy.MaHocKy, dotsCuaSv, now);
        if (!dangMo)
            return BadRequest(new { message = "Hiện không trong thời gian đăng ký học phần dành cho bạn ở học kỳ này" });

        if (lopMoi.DangKyLopHocs.Count >= lopMoi.SiSoToiDa)
            return Conflict(new { message = "Lớp đã đầy, không thể đổi sang lớp này" });

        // Trùng lịch với các lớp KHÁC đã đăng ký, không tính lớp cũ của chính môn này vì sẽ được thay thế
        var lichDaDangKy = await _db.LichHocLopHocKys
            .Where(x => x.LopHocTrongKy!.MaHocKy == hocKy.MaHocKy && x.MaLopHocKy != dangKyCu.MaLopHocKy &&
                        x.LopHocTrongKy.DangKyLopHocs.Any(d => d.MaSinhVien == sv.MaSinhVien))
            .ToListAsync();
        if (TrungLich(lopMoi.LichHocs, lichDaDangKy))
            return Conflict(new { message = "Lịch học của lớp này trùng với một lớp khác bạn đã đăng ký" });

        if (dangKyCu.DiemHocPhan != null)
            _db.DiemHocPhans.Remove(dangKyCu.DiemHocPhan);
        _db.DangKyLopHocs.Remove(dangKyCu);

        var dangKyMoi = new DangKyLopHoc
        {
            MaSinhVien = sv.MaSinhVien,
            MaLopHocKy = lopMoi.MaLopHocKy,
            NgayDangKy = DateTime.UtcNow,
            TrangThai = "DaDangKy",
        };
        _db.DangKyLopHocs.Add(dangKyMoi);
        await _db.SaveChangesAsync();

        var gv = lopMoi.LopHocKyGiangViens.FirstOrDefault()?.GiangVien;
        var dto = new LopDaDangKyDto(
            dangKyMoi.MaDangKy, lopMoi.MaLopHocKy, lopMoi.TenLop, lopMoi.MaMonHoc, lopMoi.MonHoc?.TenMonHoc ?? "",
            lopMoi.MonHoc?.SoTinChi ?? 0, lopMoi.LoaiHinh, gv?.MaGiangVien, gv?.HoTen,
            lopMoi.DangKyLopHocs.Count + 1, lopMoi.SiSoToiDa, ToBuoiHocs(lopMoi.LichHocs));
        return Ok(dto);
    }

    // Gợi ý thời khoá biểu bằng AI — logic ở GoiYLichService; controller chỉ resolve sinh viên rồi uỷ quyền.
    [HttpPost("goi-y-thoi-khoa-bieu")]
    public async Task<ActionResult<List<GoiYThoiKhoaBieuResultDto>>> GoiYThoiKhoaBieu(GoiYThoiKhoaBieuRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.YeuCau))
            return BadRequest(new { message = "Vui lòng nhập yêu cầu" });

        var sv = await GetSinhVienHienTaiAsync();
        if (sv is null) return NotFound(new { message = "Không tìm thấy hồ sơ sinh viên" });

        try { return Ok(await _goiYLich.GoiYAsync(sv, request.YeuCau)); }
        catch (Exception ex) { return StatusCode(502, new { message = "Không thể kết nối tới trợ lý AI: " + ex.Message }); }
    }
}
