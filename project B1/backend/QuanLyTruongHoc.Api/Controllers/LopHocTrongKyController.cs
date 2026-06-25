using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.LopHocTrongKy;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/lop-hoc-ky")]
[Authorize]
public class LopHocTrongKyController : ControllerBase
{
    private static readonly string[] LoaiHinhHopLe = { "Lý thuyết", "Thực hành" };

    private readonly AppDbContext _db;

    public LopHocTrongKyController(AppDbContext db)
    {
        _db = db;
    }

    private static LopHocTrongKyDto ToDto(Domain.Entities.LopHocTrongKy l)
    {
        var giangVien = l.LopHocKyGiangViens?.FirstOrDefault()?.GiangVien;
        return new(
            l.MaLopHocKy,
            l.TenLop,
            l.LoaiHinh,
            l.SiSoToiDa,
            l.DangKyLopHocs?.Count ?? 0,
            l.MaMonHoc,
            l.MonHoc?.TenMonHoc ?? "",
            l.MonHoc?.SoTinChi ?? 0,
            l.MaHocKy,
            l.HocKy?.TenHocKy ?? "",
            giangVien?.MaGiangVien,
            giangVien?.HoTen,
            l.LichHocs?.OrderBy(x => x.NgayBatDau).ThenBy(x => x.Thu).ThenBy(x => x.TietBatDau)
                .Select(x => new LichHocDto(x.MaLich, x.Thu, x.TietBatDau, x.TietKetThuc, x.NgayBatDau, x.NgayKetThuc, x.PhongHoc)).ToList()
                ?? new List<LichHocDto>());
    }

    // Hai buổi học trùng nhau khi: cùng thứ trong tuần, dải tiết giao nhau VÀ khoảng ngày giao nhau.
    public static bool BuoiTrungNhau(
        int thuA, int tietBdA, int tietKtA, DateOnly ngayBdA, DateOnly ngayKtA,
        int thuB, int tietBdB, int tietKtB, DateOnly ngayBdB, DateOnly ngayKtB)
    {
        if (thuA != thuB) return false;
        var trungTiet = tietBdA <= tietKtB && tietBdB <= tietKtA;
        var trungNgay = ngayBdA <= ngayKtB && ngayBdB <= ngayKtA;
        return trungTiet && trungNgay;
    }

    private static IQueryable<Domain.Entities.LopHocTrongKy> IncludeAll(IQueryable<Domain.Entities.LopHocTrongKy> q) =>
        q.Include(l => l.MonHoc)
            .Include(l => l.HocKy)
            .Include(l => l.LichHocs)
            .Include(l => l.DangKyLopHocs)
            .Include(l => l.LopHocKyGiangViens).ThenInclude(g => g.GiangVien);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LopHocTrongKyDto>>> GetAll([FromQuery] int? maHocKy, [FromQuery] int? maMonHoc)
    {
        var query = IncludeAll(_db.LopHocTrongKys.AsQueryable());
        if (maHocKy.HasValue) query = query.Where(l => l.MaHocKy == maHocKy.Value);
        if (maMonHoc.HasValue) query = query.Where(l => l.MaMonHoc == maMonHoc.Value);

        var result = await query.OrderBy(l => l.MonHoc!.TenMonHoc).ThenBy(l => l.TenLop).ToListAsync();
        return Ok(result.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<LopHocTrongKyDto>> GetById(int id)
    {
        var entity = await IncludeAll(_db.LopHocTrongKys.AsQueryable()).FirstOrDefaultAsync(l => l.MaLopHocKy == id);
        if (entity is null) return NotFound();
        return Ok(ToDto(entity));
    }

    private static string? ValidateLichHocs(List<LichHocInput> lichHocs)
    {
        if (lichHocs.Count == 0)
            return "Lớp học cần ít nhất 1 buổi học trong tuần";

        foreach (var l in lichHocs)
        {
            if (l.Thu < 2 || l.Thu > 8)
                return "Thứ trong tuần không hợp lệ (2 = Thứ 2 ... 8 = Chủ nhật)";
            if (l.TietBatDau < 1 || l.TietBatDau > 10 || l.TietKetThuc < 1 || l.TietKetThuc > 10)
                return "Tiết học phải trong khoảng 1 đến 10";
            if (l.TietKetThuc < l.TietBatDau)
                return "Tiết kết thúc phải sau tiết bắt đầu";
            var cungBuoiSang = l.TietBatDau <= 5 && l.TietKetThuc <= 5;
            var cungBuoiChieu = l.TietBatDau >= 6 && l.TietKetThuc >= 6;
            if (!cungBuoiSang && !cungBuoiChieu)
                return "Một buổi học không được kéo dài qua cả buổi sáng (tiết 1-5) và buổi chiều (tiết 6-10)";
            if (l.NgayKetThuc < l.NgayBatDau)
                return "Ngày kết thúc của buổi học phải sau hoặc bằng ngày bắt đầu";
        }

        for (var i = 0; i < lichHocs.Count; i++)
        {
            for (var j = i + 1; j < lichHocs.Count; j++)
            {
                if (BuoiTrungNhau(
                    lichHocs[i].Thu, lichHocs[i].TietBatDau, lichHocs[i].TietKetThuc, lichHocs[i].NgayBatDau, lichHocs[i].NgayKetThuc,
                    lichHocs[j].Thu, lichHocs[j].TietBatDau, lichHocs[j].TietKetThuc, lichHocs[j].NgayBatDau, lichHocs[j].NgayKetThuc))
                    return "Các buổi học của lớp này đang trùng giờ với nhau";
            }
        }

        return null;
    }

    private async Task<string?> ValidateGiangVienKhongTrung(int maGiangVien, int maHocKy, List<LichHocInput> lichHocs, int? maLopHocKyHienTai)
    {
        var lichKhac = await _db.LopHocKyGiangViens
            .Where(g => g.MaGiangVien == maGiangVien)
            .Where(g => g.LopHocTrongKy!.MaHocKy == maHocKy && g.MaLopHocKy != maLopHocKyHienTai)
            .Include(g => g.LopHocTrongKy).ThenInclude(l => l!.LichHocs)
            .SelectMany(g => g.LopHocTrongKy!.LichHocs)
            .ToListAsync();

        foreach (var lich in lichHocs)
        {
            foreach (var khac in lichKhac)
            {
                if (BuoiTrungNhau(
                    lich.Thu, lich.TietBatDau, lich.TietKetThuc, lich.NgayBatDau, lich.NgayKetThuc,
                    khac.Thu, khac.TietBatDau, khac.TietKetThuc, khac.NgayBatDau, khac.NgayKetThuc))
                    return "Giảng viên này đã có lớp học khác trùng giờ trong học kỳ này";
            }
        }

        return null;
    }

    // Phòng học không được dùng trùng giờ bởi lớp khác (môn/giảng viên bất kỳ) trong cùng học kỳ.
    private async Task<string?> ValidatePhongHocKhongTrung(int maHocKy, List<LichHocInput> lichHocs, int? maLopHocKyHienTai)
    {
        var canKiemTra = lichHocs.Where(l => !string.IsNullOrWhiteSpace(l.PhongHoc)).ToList();
        if (canKiemTra.Count == 0) return null;

        var lichKhac = await _db.LichHocLopHocKys
            .Where(x => x.LopHocTrongKy!.MaHocKy == maHocKy && x.MaLopHocKy != maLopHocKyHienTai && !string.IsNullOrWhiteSpace(x.PhongHoc))
            .Include(x => x.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
            .ToListAsync();

        foreach (var lich in canKiemTra)
        {
            foreach (var khac in lichKhac)
            {
                if (string.Equals(lich.PhongHoc!.Trim(), khac.PhongHoc!.Trim(), StringComparison.OrdinalIgnoreCase) &&
                    BuoiTrungNhau(
                        lich.Thu, lich.TietBatDau, lich.TietKetThuc, lich.NgayBatDau, lich.NgayKetThuc,
                        khac.Thu, khac.TietBatDau, khac.TietKetThuc, khac.NgayBatDau, khac.NgayKetThuc))
                    return $"Phòng học \"{lich.PhongHoc}\" đã được lớp \"{khac.LopHocTrongKy!.MonHoc!.TenMonHoc} ({khac.LopHocTrongKy.TenLop})\" sử dụng trùng giờ trong học kỳ này, vui lòng đổi phòng học khác";
            }
        }

        return null;
    }

    [HttpPost]
    public async Task<ActionResult<LopHocTrongKyDto>> Create(CreateLopHocTrongKyRequest request)
    {
        var ten = request.TenLop.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên lớp không được để trống" });

        if (!LoaiHinhHopLe.Contains(request.LoaiHinh))
            return BadRequest(new { message = "Loại hình phải là 'Lý thuyết' hoặc 'Thực hành'" });

        if (request.SiSoToiDa <= 0)
            return BadRequest(new { message = "Sĩ số tối đa phải lớn hơn 0" });

        var monHoc = await _db.MonHocs.FindAsync(request.MaMonHoc);
        if (monHoc is null)
            return BadRequest(new { message = "Môn học không tồn tại" });

        var hocKy = await _db.HocKys.FindAsync(request.MaHocKy);
        if (hocKy is null)
            return BadRequest(new { message = "Học kỳ không tồn tại" });

        var lichError = ValidateLichHocs(request.LichHocs);
        if (lichError != null)
            return BadRequest(new { message = lichError });

        var phongError = await ValidatePhongHocKhongTrung(request.MaHocKy, request.LichHocs, null);
        if (phongError != null)
            return Conflict(new { message = phongError });

        var exists = await _db.LopHocTrongKys.AnyAsync(l =>
            l.TenLop == ten && l.MaMonHoc == request.MaMonHoc && l.MaHocKy == request.MaHocKy);
        if (exists)
            return Conflict(new { message = "Lớp học này đã tồn tại trong môn học và học kỳ đã chọn" });

        if (request.MaGiangVien.HasValue)
        {
            var giangVienExists = await _db.GiangViens.AnyAsync(g => g.MaGiangVien == request.MaGiangVien.Value);
            if (!giangVienExists)
                return BadRequest(new { message = "Giảng viên không tồn tại" });

            var trungGioError = await ValidateGiangVienKhongTrung(request.MaGiangVien.Value, request.MaHocKy, request.LichHocs, null);
            if (trungGioError != null)
                return Conflict(new { message = trungGioError });
        }

        var entity = new Domain.Entities.LopHocTrongKy
        {
            MaMonHoc = request.MaMonHoc,
            MaHocKy = request.MaHocKy,
            TenLop = ten,
            LoaiHinh = request.LoaiHinh,
            SiSoToiDa = request.SiSoToiDa,
            LichHocs = request.LichHocs.Select(l => new LichHocLopHocKy
            {
                Thu = l.Thu,
                TietBatDau = l.TietBatDau,
                TietKetThuc = l.TietKetThuc,
                NgayBatDau = l.NgayBatDau,
                NgayKetThuc = l.NgayKetThuc,
                PhongHoc = l.PhongHoc?.Trim(),
            }).ToList(),
        };
        _db.LopHocTrongKys.Add(entity);
        await _db.SaveChangesAsync();

        if (request.MaGiangVien.HasValue)
        {
            _db.LopHocKyGiangViens.Add(new LopHocKyGiangVien
            {
                MaLopHocKy = entity.MaLopHocKy,
                MaGiangVien = request.MaGiangVien.Value,
                VaiTro = "Giảng viên chính",
            });
            await _db.SaveChangesAsync();
        }

        var created = await IncludeAll(_db.LopHocTrongKys.AsQueryable()).FirstAsync(l => l.MaLopHocKy == entity.MaLopHocKy);
        return CreatedAtAction(nameof(GetById), new { id = entity.MaLopHocKy }, ToDto(created));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateLopHocTrongKyRequest request)
    {
        var entity = await _db.LopHocTrongKys
            .Include(l => l.LichHocs)
            .Include(l => l.LopHocKyGiangViens)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == id);
        if (entity is null) return NotFound();

        var ten = request.TenLop.Trim();
        if (string.IsNullOrWhiteSpace(ten))
            return BadRequest(new { message = "Tên lớp không được để trống" });

        if (!LoaiHinhHopLe.Contains(request.LoaiHinh))
            return BadRequest(new { message = "Loại hình phải là 'Lý thuyết' hoặc 'Thực hành'" });

        if (request.SiSoToiDa <= 0)
            return BadRequest(new { message = "Sĩ số tối đa phải lớn hơn 0" });

        var lichError = ValidateLichHocs(request.LichHocs);
        if (lichError != null)
            return BadRequest(new { message = lichError });

        var phongError = await ValidatePhongHocKhongTrung(entity.MaHocKy, request.LichHocs, id);
        if (phongError != null)
            return Conflict(new { message = phongError });

        var exists = await _db.LopHocTrongKys.AnyAsync(l =>
            l.TenLop == ten && l.MaMonHoc == entity.MaMonHoc && l.MaHocKy == entity.MaHocKy && l.MaLopHocKy != id);
        if (exists)
            return Conflict(new { message = "Lớp học này đã tồn tại trong môn học và học kỳ đã chọn" });

        if (request.MaGiangVien.HasValue)
        {
            var giangVienExists = await _db.GiangViens.AnyAsync(g => g.MaGiangVien == request.MaGiangVien.Value);
            if (!giangVienExists)
                return BadRequest(new { message = "Giảng viên không tồn tại" });

            var trungGioError = await ValidateGiangVienKhongTrung(request.MaGiangVien.Value, entity.MaHocKy, request.LichHocs, id);
            if (trungGioError != null)
                return Conflict(new { message = trungGioError });
        }

        entity.TenLop = ten;
        entity.LoaiHinh = request.LoaiHinh;
        entity.SiSoToiDa = request.SiSoToiDa;

        _db.LichHocLopHocKys.RemoveRange(entity.LichHocs);
        entity.LichHocs = request.LichHocs.Select(l => new LichHocLopHocKy
        {
            MaLopHocKy = id,
            Thu = l.Thu,
            TietBatDau = l.TietBatDau,
            TietKetThuc = l.TietKetThuc,
            NgayBatDau = l.NgayBatDau,
            NgayKetThuc = l.NgayKetThuc,
            PhongHoc = l.PhongHoc?.Trim(),
        }).ToList();

        _db.LopHocKyGiangViens.RemoveRange(entity.LopHocKyGiangViens);
        if (request.MaGiangVien.HasValue)
        {
            entity.LopHocKyGiangViens.Add(new LopHocKyGiangVien
            {
                MaLopHocKy = id,
                MaGiangVien = request.MaGiangVien.Value,
                VaiTro = "Giảng viên chính",
            });
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.LopHocTrongKys
            .Include(l => l.DangKyLopHocs)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == id);

        if (entity is null) return NotFound();

        if (entity.DangKyLopHocs.Count > 0)
            return Conflict(new { message = "Không thể xoá: lớp học đã có sinh viên đăng ký" });

        _db.LopHocTrongKys.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // Huỷ lớp (ít sinh viên): xoá lớp + huỷ tất cả đăng ký + điểm của sinh viên trong lớp đó
    [HttpDelete("{id:int}/huy-lop")]
    public async Task<IActionResult> HuyLop(int id)
    {
        var entity = await _db.LopHocTrongKys
            .Include(l => l.DangKyLopHocs).ThenInclude(d => d.DiemHocPhan)
            .Include(l => l.LichHocs)
            .Include(l => l.LopHocKyGiangViens)
            .FirstOrDefaultAsync(l => l.MaLopHocKy == id);

        if (entity is null) return NotFound();

        var soSinhVien = entity.DangKyLopHocs.Count;

        foreach (var dk in entity.DangKyLopHocs)
            if (dk.DiemHocPhan != null)
                _db.DiemHocPhans.Remove(dk.DiemHocPhan);
        _db.DangKyLopHocs.RemoveRange(entity.DangKyLopHocs);
        _db.LichHocLopHocKys.RemoveRange(entity.LichHocs);
        _db.LopHocKyGiangViens.RemoveRange(entity.LopHocKyGiangViens);
        _db.LopHocTrongKys.Remove(entity);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Đã huỷ lớp và gỡ đăng ký của {soSinhVien} sinh viên" });
    }
}
