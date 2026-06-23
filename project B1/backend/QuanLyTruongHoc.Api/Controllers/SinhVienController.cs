using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Application.DTOs.SinhVien;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/sinh-vien")]
[Authorize]
public class SinhVienController : ControllerBase
{
    private const string MatKhauMacDinh = "123456a@B";

    private readonly AppDbContext _db;

    public SinhVienController(AppDbContext db)
    {
        _db = db;
    }

    private static SinhVienDto ToDto(Domain.Entities.SinhVien s) => new(
        s.MaSinhVien,
        s.MaSoSV,
        s.HoTen,
        s.NgaySinh,
        s.GioiTinh,
        s.MaKhoaHocNganh,
        s.KhoaHocNganh?.TenKhoaHoc ?? "",
        s.KhoaHocNganh?.NganhHoc?.MaNganh ?? 0,
        s.KhoaHocNganh?.NganhHoc?.TenNganh ?? "",
        s.KhoaHocNganh?.NganhHoc?.KhoaVien?.TenKhoaVien ?? "",
        s.MaNhomLop,
        s.NhomLopNganh?.TenNhomLop,
        s.MaTaiKhoan,
        s.TaiKhoan?.TenDangNhap,
        s.TongTinChiTichLuy,
        s.GPATichLuy);

    private static IQueryable<Domain.Entities.SinhVien> IncludeAll(IQueryable<Domain.Entities.SinhVien> q) =>
        q.Include(s => s.KhoaHocNganh).ThenInclude(k => k!.NganhHoc).ThenInclude(n => n!.KhoaVien)
            .Include(s => s.NhomLopNganh)
            .Include(s => s.TaiKhoan);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SinhVienDto>>> GetAll()
    {
        var result = await IncludeAll(_db.SinhViens.AsQueryable())
            .OrderBy(s => s.HoTen)
            .ToListAsync();

        return Ok(result.Select(ToDto));
    }

    [HttpGet("me")]
    public async Task<ActionResult<SinhVienDto>> GetMe()
    {
        var maTaiKhoanClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(maTaiKhoanClaim, out var maTaiKhoan))
            return Unauthorized();

        var entity = await IncludeAll(_db.SinhViens.AsQueryable())
            .FirstOrDefaultAsync(s => s.MaTaiKhoan == maTaiKhoan);

        if (entity is null) return NotFound();
        return Ok(ToDto(entity));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SinhVienDto>> GetById(int id)
    {
        var entity = await IncludeAll(_db.SinhViens.AsQueryable())
            .FirstOrDefaultAsync(s => s.MaSinhVien == id);

        if (entity is null) return NotFound();
        return Ok(ToDto(entity));
    }

    [HttpPost]
    public async Task<ActionResult<SinhVienDto>> Create(CreateSinhVienRequest request)
    {
        var maSoSV = request.MaSoSV.Trim();
        if (string.IsNullOrWhiteSpace(maSoSV))
            return BadRequest(new { message = "Mã số sinh viên không được để trống" });

        var hoTen = request.HoTen.Trim();
        if (string.IsNullOrWhiteSpace(hoTen))
            return BadRequest(new { message = "Họ tên không được để trống" });

        var khoaHocNganh = await _db.KhoaHocNganhs
            .Include(k => k.NganhHoc)
            .FirstOrDefaultAsync(k => k.MaKhoaHocNganh == request.MaKhoaHocNganh);
        if (khoaHocNganh is null)
            return BadRequest(new { message = "Khoá học ngành không tồn tại" });

        if (request.MaNhomLop.HasValue)
        {
            var nhomLop = await _db.NhomLopNganhs.FindAsync(request.MaNhomLop.Value);
            if (nhomLop is null)
                return BadRequest(new { message = "Nhóm lớp không tồn tại" });
            if (nhomLop.MaKhoaHocNganh != request.MaKhoaHocNganh)
                return BadRequest(new { message = "Nhóm lớp không thuộc khoá học ngành đã chọn" });
        }

        var maSoSVTonTai = await _db.SinhViens.AnyAsync(s => s.MaSoSV == maSoSV);
        if (maSoSVTonTai)
            return Conflict(new { message = "Mã số sinh viên này đã tồn tại" });

        var taiKhoanTonTai = await _db.TaiKhoans.AnyAsync(t => t.TenDangNhap == maSoSV);
        if (taiKhoanTonTai)
            return Conflict(new { message = "Mã số sinh viên này đã được dùng làm tên đăng nhập cho 1 tài khoản khác" });

        var quyenSinhVien = await _db.Quyens.FirstOrDefaultAsync(q => q.TenQuyen == "SinhVien");
        if (quyenSinhVien is null)
        {
            quyenSinhVien = new Quyen { TenQuyen = "SinhVien" };
            _db.Quyens.Add(quyenSinhVien);
            await _db.SaveChangesAsync();
        }

        var taiKhoan = new TaiKhoan
        {
            TenDangNhap = maSoSV,
            MatKhauHash = BCrypt.Net.BCrypt.HashPassword(MatKhauMacDinh),
            MaQuyen = quyenSinhVien.MaQuyen,
            TrangThai = true
        };
        _db.TaiKhoans.Add(taiKhoan);
        await _db.SaveChangesAsync();

        var entity = new Domain.Entities.SinhVien
        {
            MaSoSV = maSoSV,
            HoTen = hoTen,
            NgaySinh = request.NgaySinh,
            GioiTinh = request.GioiTinh?.Trim(),
            MaKhoaHocNganh = request.MaKhoaHocNganh,
            MaNhomLop = request.MaNhomLop,
            MaTaiKhoan = taiKhoan.MaTaiKhoan,
        };
        _db.SinhViens.Add(entity);
        await _db.SaveChangesAsync();

        await _db.Entry(entity).Reference(s => s.KhoaHocNganh).LoadAsync();
        await _db.Entry(entity.KhoaHocNganh!).Reference(k => k.NganhHoc).LoadAsync();
        await _db.Entry(entity.KhoaHocNganh!.NganhHoc!).Reference(n => n.KhoaVien).LoadAsync();
        if (entity.MaNhomLop.HasValue)
            await _db.Entry(entity).Reference(s => s.NhomLopNganh).LoadAsync();
        await _db.Entry(entity).Reference(s => s.TaiKhoan).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.MaSinhVien }, ToDto(entity));
    }

    [HttpPost("import")]
    public async Task<ActionResult<ImportSinhVienResultDto>> Import(ImportSinhVienRequest request)
    {
        var khoaHocNganh = await _db.KhoaHocNganhs.FindAsync(request.MaKhoaHocNganh);
        if (khoaHocNganh is null)
            return BadRequest(new { message = "Khoá học ngành không tồn tại" });

        var quyenSinhVien = await _db.Quyens.FirstOrDefaultAsync(q => q.TenQuyen == "SinhVien");
        if (quyenSinhVien is null)
        {
            quyenSinhVien = new Quyen { TenQuyen = "SinhVien" };
            _db.Quyens.Add(quyenSinhVien);
            await _db.SaveChangesAsync();
        }

        var maSoSVHienCo = (await _db.SinhViens.Select(s => s.MaSoSV).ToListAsync()).ToHashSet();
        var tenDangNhapHienCo = (await _db.TaiKhoans.Select(t => t.TenDangNhap).ToListAsync()).ToHashSet();
        var maSoSVTrongFile = new HashSet<string>();

        var loi = new List<ImportSinhVienErrorDto>();
        var thanhCong = 0;

        for (var i = 0; i < request.SinhViens.Count; i++)
        {
            var dong = i + 2; // dòng 1 là tiêu đề
            var row = request.SinhViens[i];
            var maSoSV = row.MaSoSV?.Trim() ?? "";
            var hoTen = row.HoTen?.Trim() ?? "";
            var gioiTinh = row.GioiTinh?.Trim();

            if (string.IsNullOrWhiteSpace(maSoSV) && string.IsNullOrWhiteSpace(hoTen))
                continue; // bỏ qua dòng trống

            if (string.IsNullOrWhiteSpace(maSoSV))
            {
                loi.Add(new ImportSinhVienErrorDto(dong, maSoSV, "Thiếu mã số sinh viên"));
                continue;
            }
            if (string.IsNullOrWhiteSpace(hoTen))
            {
                loi.Add(new ImportSinhVienErrorDto(dong, maSoSV, "Thiếu họ tên"));
                continue;
            }
            if (maSoSVHienCo.Contains(maSoSV) || maSoSVTrongFile.Contains(maSoSV))
            {
                loi.Add(new ImportSinhVienErrorDto(dong, maSoSV, "Mã số sinh viên đã tồn tại"));
                continue;
            }
            if (tenDangNhapHienCo.Contains(maSoSV))
            {
                loi.Add(new ImportSinhVienErrorDto(dong, maSoSV, "Mã số sinh viên đã được dùng làm tên đăng nhập cho 1 tài khoản khác"));
                continue;
            }

            var taiKhoan = new TaiKhoan
            {
                TenDangNhap = maSoSV,
                MatKhauHash = BCrypt.Net.BCrypt.HashPassword(MatKhauMacDinh),
                MaQuyen = quyenSinhVien.MaQuyen,
                TrangThai = true
            };
            _db.TaiKhoans.Add(taiKhoan);

            var sinhVien = new Domain.Entities.SinhVien
            {
                MaSoSV = maSoSV,
                HoTen = hoTen,
                GioiTinh = string.IsNullOrWhiteSpace(gioiTinh) ? null : gioiTinh,
                MaKhoaHocNganh = request.MaKhoaHocNganh,
                TaiKhoan = taiKhoan,
            };
            _db.SinhViens.Add(sinhVien);

            maSoSVTrongFile.Add(maSoSV);
            tenDangNhapHienCo.Add(maSoSV);
            thanhCong++;
        }

        await _db.SaveChangesAsync();

        return Ok(new ImportSinhVienResultDto(thanhCong, loi.Count, loi));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateSinhVienRequest request)
    {
        var entity = await _db.SinhViens.FindAsync(id);
        if (entity is null) return NotFound();

        var hoTen = request.HoTen.Trim();
        if (string.IsNullOrWhiteSpace(hoTen))
            return BadRequest(new { message = "Họ tên không được để trống" });

        var khoaHocNganhExists = await _db.KhoaHocNganhs.AnyAsync(k => k.MaKhoaHocNganh == request.MaKhoaHocNganh);
        if (!khoaHocNganhExists)
            return BadRequest(new { message = "Khoá học ngành không tồn tại" });

        if (request.MaNhomLop.HasValue)
        {
            var nhomLop = await _db.NhomLopNganhs.FindAsync(request.MaNhomLop.Value);
            if (nhomLop is null)
                return BadRequest(new { message = "Nhóm lớp không tồn tại" });
            if (nhomLop.MaKhoaHocNganh != request.MaKhoaHocNganh)
                return BadRequest(new { message = "Nhóm lớp không thuộc khoá học ngành đã chọn" });
        }

        entity.HoTen = hoTen;
        entity.NgaySinh = request.NgaySinh;
        entity.GioiTinh = request.GioiTinh?.Trim();
        entity.MaKhoaHocNganh = request.MaKhoaHocNganh;
        entity.MaNhomLop = request.MaNhomLop;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.SinhViens
            .Include(s => s.DangKyLopHocs)
            .Include(s => s.KetQuaHocTapKys)
            .FirstOrDefaultAsync(s => s.MaSinhVien == id);

        if (entity is null) return NotFound();

        if (entity.DangKyLopHocs.Count > 0 || entity.KetQuaHocTapKys.Count > 0)
            return Conflict(new { message = "Không thể xoá: sinh viên đang có dữ liệu đăng ký học phần hoặc kết quả học tập" });

        _db.SinhViens.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
