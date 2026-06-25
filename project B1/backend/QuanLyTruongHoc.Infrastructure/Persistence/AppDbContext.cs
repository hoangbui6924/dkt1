using Microsoft.EntityFrameworkCore;
using QuanLyTruongHoc.Domain.Entities;

namespace QuanLyTruongHoc.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Quyen> Quyens => Set<Quyen>();
    public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
    public DbSet<NamHoc> NamHocs => Set<NamHoc>();
    public DbSet<HocKy> HocKys => Set<HocKy>();
    public DbSet<DotDangKy> DotDangKys => Set<DotDangKy>();
    public DbSet<KhoaVien> KhoaViens => Set<KhoaVien>();
    public DbSet<NganhHoc> NganhHocs => Set<NganhHoc>();
    public DbSet<KhoaHocNganh> KhoaHocNganhs => Set<KhoaHocNganh>();
    public DbSet<BoMon> BoMons => Set<BoMon>();
    public DbSet<MonHoc> MonHocs => Set<MonHoc>();
    public DbSet<KhungChuongTrinh> KhungChuongTrinhs => Set<KhungChuongTrinh>();
    public DbSet<MonHocThuocKhungChuongTrinh> MonHocThuocKhungChuongTrinhs => Set<MonHocThuocKhungChuongTrinh>();
    public DbSet<GiangVien> GiangViens => Set<GiangVien>();
    public DbSet<NhomLopNganh> NhomLopNganhs => Set<NhomLopNganh>();
    public DbSet<SinhVien> SinhViens => Set<SinhVien>();
    public DbSet<LopHocTrongKy> LopHocTrongKys => Set<LopHocTrongKy>();
    public DbSet<LichHocLopHocKy> LichHocLopHocKys => Set<LichHocLopHocKy>();
    public DbSet<LopHocKyGiangVien> LopHocKyGiangViens => Set<LopHocKyGiangVien>();
    public DbSet<DangKyLopHoc> DangKyLopHocs => Set<DangKyLopHoc>();
    public DbSet<DiemHocPhan> DiemHocPhans => Set<DiemHocPhan>();
    public DbSet<KetQuaHocTapKy> KetQuaHocTapKys => Set<KetQuaHocTapKy>();
    public DbSet<TaiLieu> TaiLieus => Set<TaiLieu>();
    public DbSet<TaiLieuChunk> TaiLieuChunks => Set<TaiLieuChunk>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Quyen>(e =>
        {
            e.HasKey(x => x.MaQuyen);
            e.HasIndex(x => x.TenQuyen).IsUnique();
        });

        b.Entity<TaiKhoan>(e =>
        {
            e.HasKey(x => x.MaTaiKhoan);
            e.HasIndex(x => x.TenDangNhap).IsUnique();
            e.HasOne(x => x.Quyen).WithMany(q => q.TaiKhoans).HasForeignKey(x => x.MaQuyen);
        });

        b.Entity<NamHoc>(e =>
        {
            e.HasKey(x => x.MaNamHoc);
            e.HasIndex(x => x.TenNamHoc).IsUnique();
        });

        b.Entity<HocKy>(e =>
        {
            e.HasKey(x => x.MaHocKy);
            e.HasOne(x => x.NamHoc).WithMany(n => n.HocKys).HasForeignKey(x => x.MaNamHoc);
            e.HasIndex(x => new { x.MaNamHoc, x.TenHocKy }).IsUnique();
            e.Property(x => x.HanDangKyTu).HasColumnType("timestamp without time zone");
            e.Property(x => x.HanDangKyDen).HasColumnType("timestamp without time zone");
            e.Property(x => x.HanRutDangKyTu).HasColumnType("timestamp without time zone");
            e.Property(x => x.HanRutDangKyDen).HasColumnType("timestamp without time zone");
        });

        b.Entity<DotDangKy>(e =>
        {
            e.HasKey(x => x.MaDot);
            e.HasOne(x => x.HocKy).WithMany().HasForeignKey(x => x.MaHocKy);
            e.HasOne(x => x.KhoaVien)
                .WithMany()
                .HasForeignKey(x => x.MaKhoaVien)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            e.Property(x => x.ThoiGianBatDau).HasColumnType("timestamp without time zone");
            e.Property(x => x.ThoiGianKetThuc).HasColumnType("timestamp without time zone");
        });

        b.Entity<KhoaVien>(e =>
        {
            e.HasKey(x => x.MaKhoaVien);
            e.HasIndex(x => x.TenKhoaVien).IsUnique();
        });

        b.Entity<NganhHoc>(e =>
        {
            e.HasKey(x => x.MaNganh);
            e.HasOne(x => x.KhoaVien).WithMany(k => k.NganhHocs).HasForeignKey(x => x.MaKhoaVien);
        });

        b.Entity<KhoaHocNganh>(e =>
        {
            e.HasKey(x => x.MaKhoaHocNganh);
            e.HasOne(x => x.NganhHoc).WithMany(n => n.KhoaHocNganhs).HasForeignKey(x => x.MaNganhHoc);
        });

        b.Entity<BoMon>(e =>
        {
            e.HasKey(x => x.MaBoMon);
            e.HasOne(x => x.KhoaVien)
                .WithMany(k => k.BoMons)
                .HasForeignKey(x => x.MaKhoaVien)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<MonHoc>(e =>
        {
            e.HasKey(x => x.MaMonHoc);
            e.HasOne(x => x.BoMon)
                .WithMany(m => m.MonHocs)
                .HasForeignKey(x => x.MaBoMon)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.KhoaVien)
                .WithMany()
                .HasForeignKey(x => x.MaKhoaVien)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.MonHocTienQuyet)
                .WithMany()
                .HasForeignKey(x => x.MaMonHocTienQuyet)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<KhungChuongTrinh>(e =>
        {
            e.HasKey(x => x.MaKhungChuongTrinh);
            e.HasOne(x => x.NganhHoc)
                .WithOne(n => n.KhungChuongTrinh)
                .HasForeignKey<KhungChuongTrinh>(x => x.MaNganhHoc);
            e.HasIndex(x => x.MaNganhHoc).IsUnique();
        });

        b.Entity<MonHocThuocKhungChuongTrinh>(e =>
        {
            e.HasKey(x => x.Ma);
            e.HasOne(x => x.KhungChuongTrinh)
                .WithMany(k => k.MonHocThuocKhungChuongTrinhs)
                .HasForeignKey(x => x.MaKhungChuongTrinh);
            e.HasOne(x => x.MonHoc)
                .WithMany(m => m.MonHocThuocKhungChuongTrinhs)
                .HasForeignKey(x => x.MaMonHoc);
            e.HasIndex(x => new { x.MaKhungChuongTrinh, x.MaMonHoc }).IsUnique();
        });

        b.Entity<GiangVien>(e =>
        {
            e.HasKey(x => x.MaGiangVien);
            e.HasOne(x => x.BoMon)
                .WithMany(m => m.GiangViens)
                .HasForeignKey(x => x.MaBoMon)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.KhoaVien)
                .WithMany()
                .HasForeignKey(x => x.MaKhoaVien)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.TaiKhoan).WithMany().HasForeignKey(x => x.MaTaiKhoan);
        });

        b.Entity<NhomLopNganh>(e =>
        {
            e.HasKey(x => x.MaNhomLop);
            e.HasOne(x => x.KhoaHocNganh).WithMany(k => k.NhomLopNganhs).HasForeignKey(x => x.MaKhoaHocNganh);
            e.HasOne(x => x.CoVanHocTap)
                .WithMany()
                .HasForeignKey(x => x.MaCoVanHocTap)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<SinhVien>(e =>
        {
            e.HasKey(x => x.MaSinhVien);
            e.HasIndex(x => x.MaSoSV).IsUnique();
            e.HasIndex(x => x.MaTaiKhoan).IsUnique();
            e.HasOne(x => x.KhoaHocNganh).WithMany().HasForeignKey(x => x.MaKhoaHocNganh).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.NhomLopNganh)
                .WithMany(n => n.SinhViens)
                .HasForeignKey(x => x.MaNhomLop)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.TaiKhoan).WithMany().HasForeignKey(x => x.MaTaiKhoan);
            e.Property(x => x.GPATichLuy).HasPrecision(4, 2);
        });

        b.Entity<LopHocTrongKy>(e =>
        {
            e.HasKey(x => x.MaLopHocKy);
            e.HasOne(x => x.MonHoc).WithMany(m => m.LopHocTrongKys).HasForeignKey(x => x.MaMonHoc);
            e.HasOne(x => x.HocKy).WithMany(h => h.LopHocTrongKys).HasForeignKey(x => x.MaHocKy);
            e.HasIndex(x => new { x.MaMonHoc, x.MaHocKy, x.TenLop }).IsUnique();
        });

        b.Entity<LichHocLopHocKy>(e =>
        {
            e.HasKey(x => x.MaLich);
            e.HasOne(x => x.LopHocTrongKy).WithMany(l => l.LichHocs).HasForeignKey(x => x.MaLopHocKy);
        });

        b.Entity<LopHocKyGiangVien>(e =>
        {
            e.HasKey(x => new { x.MaLopHocKy, x.MaGiangVien });
            e.HasOne(x => x.LopHocTrongKy).WithMany(l => l.LopHocKyGiangViens).HasForeignKey(x => x.MaLopHocKy);
            e.HasOne(x => x.GiangVien).WithMany(g => g.LopHocKyGiangViens).HasForeignKey(x => x.MaGiangVien);
        });

        b.Entity<DangKyLopHoc>(e =>
        {
            e.HasKey(x => x.MaDangKy);
            e.HasOne(x => x.SinhVien).WithMany(s => s.DangKyLopHocs).HasForeignKey(x => x.MaSinhVien);
            e.HasOne(x => x.LopHocTrongKy).WithMany(l => l.DangKyLopHocs).HasForeignKey(x => x.MaLopHocKy);
            e.HasIndex(x => new { x.MaSinhVien, x.MaLopHocKy }).IsUnique();
        });

        b.Entity<DiemHocPhan>(e =>
        {
            e.HasKey(x => x.MaDangKy);
            e.HasOne(x => x.DangKyLopHoc).WithOne(d => d.DiemHocPhan).HasForeignKey<DiemHocPhan>(x => x.MaDangKy);
            e.Property(x => x.DiemX).HasPrecision(4, 2);
            e.Property(x => x.DiemY).HasPrecision(4, 2);
            e.Property(x => x.DiemZ).HasPrecision(4, 2);
        });

        b.Entity<KetQuaHocTapKy>(e =>
        {
            e.HasKey(x => new { x.MaSinhVien, x.MaHocKy });
            e.HasOne(x => x.SinhVien).WithMany(s => s.KetQuaHocTapKys).HasForeignKey(x => x.MaSinhVien);
            e.HasOne(x => x.HocKy).WithMany().HasForeignKey(x => x.MaHocKy);
            e.Property(x => x.GPAKy).HasPrecision(4, 2);
            e.Property(x => x.GPATichLuyDenKy).HasPrecision(4, 2);
        });

        b.Entity<TaiLieu>(e =>
        {
            e.HasKey(x => x.MaTaiLieu);
            e.HasOne(x => x.MonHoc)
                .WithMany()
                .HasForeignKey(x => x.MaMonHoc)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(x => x.NgayTaiLen).HasColumnType("timestamp without time zone");
        });

        b.Entity<TaiLieuChunk>(e =>
        {
            e.HasKey(x => x.MaChunk);
            e.HasOne(x => x.TaiLieu).WithMany(t => t.Chunks).HasForeignKey(x => x.MaTaiLieu).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.MaTaiLieu);
        });
    }
}
