using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KhoaViens",
                columns: table => new
                {
                    MaKhoaVien = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenKhoaVien = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhoaViens", x => x.MaKhoaVien);
                });

            migrationBuilder.CreateTable(
                name: "NamHocs",
                columns: table => new
                {
                    MaNamHoc = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenNamHoc = table.Column<string>(type: "text", nullable: false),
                    NgayBatDau = table.Column<DateOnly>(type: "date", nullable: false),
                    NgayKetThuc = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NamHocs", x => x.MaNamHoc);
                });

            migrationBuilder.CreateTable(
                name: "Quyens",
                columns: table => new
                {
                    MaQuyen = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenQuyen = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quyens", x => x.MaQuyen);
                });

            migrationBuilder.CreateTable(
                name: "BoMons",
                columns: table => new
                {
                    MaBoMon = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenBoMon = table.Column<string>(type: "text", nullable: false),
                    MaKhoaVien = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoMons", x => x.MaBoMon);
                    table.ForeignKey(
                        name: "FK_BoMons_KhoaViens_MaKhoaVien",
                        column: x => x.MaKhoaVien,
                        principalTable: "KhoaViens",
                        principalColumn: "MaKhoaVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NganhHocs",
                columns: table => new
                {
                    MaNganh = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenNganh = table.Column<string>(type: "text", nullable: false),
                    MaKhoaVien = table.Column<int>(type: "integer", nullable: false),
                    SoTinChiToanKhoa = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NganhHocs", x => x.MaNganh);
                    table.ForeignKey(
                        name: "FK_NganhHocs_KhoaViens_MaKhoaVien",
                        column: x => x.MaKhoaVien,
                        principalTable: "KhoaViens",
                        principalColumn: "MaKhoaVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HocKys",
                columns: table => new
                {
                    MaHocKy = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenHocKy = table.Column<string>(type: "text", nullable: false),
                    MaNamHoc = table.Column<int>(type: "integer", nullable: false),
                    NgayBatDau = table.Column<DateOnly>(type: "date", nullable: false),
                    NgayKetThuc = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HocKys", x => x.MaHocKy);
                    table.ForeignKey(
                        name: "FK_HocKys_NamHocs_MaNamHoc",
                        column: x => x.MaNamHoc,
                        principalTable: "NamHocs",
                        principalColumn: "MaNamHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaiKhoans",
                columns: table => new
                {
                    MaTaiKhoan = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenDangNhap = table.Column<string>(type: "text", nullable: false),
                    MatKhauHash = table.Column<string>(type: "text", nullable: false),
                    MaQuyen = table.Column<int>(type: "integer", nullable: false),
                    TrangThai = table.Column<bool>(type: "boolean", nullable: false),
                    NgayTao = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaiKhoans", x => x.MaTaiKhoan);
                    table.ForeignKey(
                        name: "FK_TaiKhoans_Quyens_MaQuyen",
                        column: x => x.MaQuyen,
                        principalTable: "Quyens",
                        principalColumn: "MaQuyen",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MonHocs",
                columns: table => new
                {
                    MaMonHoc = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenMonHoc = table.Column<string>(type: "text", nullable: false),
                    SoTinChi = table.Column<int>(type: "integer", nullable: false),
                    MaBoMon = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonHocs", x => x.MaMonHoc);
                    table.ForeignKey(
                        name: "FK_MonHocs_BoMons_MaBoMon",
                        column: x => x.MaBoMon,
                        principalTable: "BoMons",
                        principalColumn: "MaBoMon",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NhomLopNganhs",
                columns: table => new
                {
                    MaNhomLop = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenNhomLop = table.Column<string>(type: "text", nullable: false),
                    MaNganh = table.Column<int>(type: "integer", nullable: false),
                    KhoaHoc = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhomLopNganhs", x => x.MaNhomLop);
                    table.ForeignKey(
                        name: "FK_NhomLopNganhs_NganhHocs_MaNganh",
                        column: x => x.MaNganh,
                        principalTable: "NganhHocs",
                        principalColumn: "MaNganh",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GiangViens",
                columns: table => new
                {
                    MaGiangVien = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    HoTen = table.Column<string>(type: "text", nullable: false),
                    MaBoMon = table.Column<int>(type: "integer", nullable: false),
                    MaTaiKhoan = table.Column<int>(type: "integer", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    SoDienThoai = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GiangViens", x => x.MaGiangVien);
                    table.ForeignKey(
                        name: "FK_GiangViens_BoMons_MaBoMon",
                        column: x => x.MaBoMon,
                        principalTable: "BoMons",
                        principalColumn: "MaBoMon",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GiangViens_TaiKhoans_MaTaiKhoan",
                        column: x => x.MaTaiKhoan,
                        principalTable: "TaiKhoans",
                        principalColumn: "MaTaiKhoan");
                });

            migrationBuilder.CreateTable(
                name: "KhungChuongTrinhs",
                columns: table => new
                {
                    MaKhungCT = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaNganh = table.Column<int>(type: "integer", nullable: false),
                    MaMonHoc = table.Column<int>(type: "integer", nullable: false),
                    LoaiMon = table.Column<string>(type: "text", nullable: false),
                    NhomTuChon = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhungChuongTrinhs", x => x.MaKhungCT);
                    table.ForeignKey(
                        name: "FK_KhungChuongTrinhs_MonHocs_MaMonHoc",
                        column: x => x.MaMonHoc,
                        principalTable: "MonHocs",
                        principalColumn: "MaMonHoc",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KhungChuongTrinhs_NganhHocs_MaNganh",
                        column: x => x.MaNganh,
                        principalTable: "NganhHocs",
                        principalColumn: "MaNganh",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LopHocTrongKys",
                columns: table => new
                {
                    MaLopHocKy = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaMonHoc = table.Column<int>(type: "integer", nullable: false),
                    MaHocKy = table.Column<int>(type: "integer", nullable: false),
                    TenLop = table.Column<string>(type: "text", nullable: false),
                    SiSoToiDa = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LopHocTrongKys", x => x.MaLopHocKy);
                    table.ForeignKey(
                        name: "FK_LopHocTrongKys_HocKys_MaHocKy",
                        column: x => x.MaHocKy,
                        principalTable: "HocKys",
                        principalColumn: "MaHocKy",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LopHocTrongKys_MonHocs_MaMonHoc",
                        column: x => x.MaMonHoc,
                        principalTable: "MonHocs",
                        principalColumn: "MaMonHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SinhViens",
                columns: table => new
                {
                    MaSinhVien = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaSoSV = table.Column<string>(type: "text", nullable: false),
                    HoTen = table.Column<string>(type: "text", nullable: false),
                    NgaySinh = table.Column<DateOnly>(type: "date", nullable: true),
                    GioiTinh = table.Column<string>(type: "text", nullable: true),
                    MaNhomLop = table.Column<int>(type: "integer", nullable: false),
                    MaTaiKhoan = table.Column<int>(type: "integer", nullable: true),
                    TongTinChiTichLuy = table.Column<int>(type: "integer", nullable: false),
                    GPATichLuy = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SinhViens", x => x.MaSinhVien);
                    table.ForeignKey(
                        name: "FK_SinhViens_NhomLopNganhs_MaNhomLop",
                        column: x => x.MaNhomLop,
                        principalTable: "NhomLopNganhs",
                        principalColumn: "MaNhomLop",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SinhViens_TaiKhoans_MaTaiKhoan",
                        column: x => x.MaTaiKhoan,
                        principalTable: "TaiKhoans",
                        principalColumn: "MaTaiKhoan");
                });

            migrationBuilder.CreateTable(
                name: "LopHocKyGiangViens",
                columns: table => new
                {
                    MaLopHocKy = table.Column<int>(type: "integer", nullable: false),
                    MaGiangVien = table.Column<int>(type: "integer", nullable: false),
                    VaiTro = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LopHocKyGiangViens", x => new { x.MaLopHocKy, x.MaGiangVien });
                    table.ForeignKey(
                        name: "FK_LopHocKyGiangViens_GiangViens_MaGiangVien",
                        column: x => x.MaGiangVien,
                        principalTable: "GiangViens",
                        principalColumn: "MaGiangVien",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LopHocKyGiangViens_LopHocTrongKys_MaLopHocKy",
                        column: x => x.MaLopHocKy,
                        principalTable: "LopHocTrongKys",
                        principalColumn: "MaLopHocKy",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DangKyLopHocs",
                columns: table => new
                {
                    MaDangKy = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaSinhVien = table.Column<int>(type: "integer", nullable: false),
                    MaLopHocKy = table.Column<int>(type: "integer", nullable: false),
                    NgayDangKy = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TrangThai = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DangKyLopHocs", x => x.MaDangKy);
                    table.ForeignKey(
                        name: "FK_DangKyLopHocs_LopHocTrongKys_MaLopHocKy",
                        column: x => x.MaLopHocKy,
                        principalTable: "LopHocTrongKys",
                        principalColumn: "MaLopHocKy",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DangKyLopHocs_SinhViens_MaSinhVien",
                        column: x => x.MaSinhVien,
                        principalTable: "SinhViens",
                        principalColumn: "MaSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KetQuaHocTapKys",
                columns: table => new
                {
                    MaSinhVien = table.Column<int>(type: "integer", nullable: false),
                    MaHocKy = table.Column<int>(type: "integer", nullable: false),
                    TinChiDangKyKy = table.Column<int>(type: "integer", nullable: false),
                    TinChiDatKy = table.Column<int>(type: "integer", nullable: false),
                    GPAKy = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    TinChiTichLuyDenKy = table.Column<int>(type: "integer", nullable: false),
                    GPATichLuyDenKy = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KetQuaHocTapKys", x => new { x.MaSinhVien, x.MaHocKy });
                    table.ForeignKey(
                        name: "FK_KetQuaHocTapKys_HocKys_MaHocKy",
                        column: x => x.MaHocKy,
                        principalTable: "HocKys",
                        principalColumn: "MaHocKy",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KetQuaHocTapKys_SinhViens_MaSinhVien",
                        column: x => x.MaSinhVien,
                        principalTable: "SinhViens",
                        principalColumn: "MaSinhVien",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DiemHocPhans",
                columns: table => new
                {
                    MaDangKy = table.Column<int>(type: "integer", nullable: false),
                    DiemX = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    DiemY = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    DiemZ = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    NgayNhapDiem = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiemHocPhans", x => x.MaDangKy);
                    table.ForeignKey(
                        name: "FK_DiemHocPhans_DangKyLopHocs_MaDangKy",
                        column: x => x.MaDangKy,
                        principalTable: "DangKyLopHocs",
                        principalColumn: "MaDangKy",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BoMons_MaKhoaVien",
                table: "BoMons",
                column: "MaKhoaVien");

            migrationBuilder.CreateIndex(
                name: "IX_DangKyLopHocs_MaLopHocKy",
                table: "DangKyLopHocs",
                column: "MaLopHocKy");

            migrationBuilder.CreateIndex(
                name: "IX_DangKyLopHocs_MaSinhVien_MaLopHocKy",
                table: "DangKyLopHocs",
                columns: new[] { "MaSinhVien", "MaLopHocKy" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GiangViens_MaBoMon",
                table: "GiangViens",
                column: "MaBoMon");

            migrationBuilder.CreateIndex(
                name: "IX_GiangViens_MaTaiKhoan",
                table: "GiangViens",
                column: "MaTaiKhoan");

            migrationBuilder.CreateIndex(
                name: "IX_HocKys_MaNamHoc_TenHocKy",
                table: "HocKys",
                columns: new[] { "MaNamHoc", "TenHocKy" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KetQuaHocTapKys_MaHocKy",
                table: "KetQuaHocTapKys",
                column: "MaHocKy");

            migrationBuilder.CreateIndex(
                name: "IX_KhoaViens_TenKhoaVien",
                table: "KhoaViens",
                column: "TenKhoaVien",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KhungChuongTrinhs_MaMonHoc",
                table: "KhungChuongTrinhs",
                column: "MaMonHoc");

            migrationBuilder.CreateIndex(
                name: "IX_KhungChuongTrinhs_MaNganh_MaMonHoc",
                table: "KhungChuongTrinhs",
                columns: new[] { "MaNganh", "MaMonHoc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LopHocKyGiangViens_MaGiangVien",
                table: "LopHocKyGiangViens",
                column: "MaGiangVien");

            migrationBuilder.CreateIndex(
                name: "IX_LopHocTrongKys_MaHocKy",
                table: "LopHocTrongKys",
                column: "MaHocKy");

            migrationBuilder.CreateIndex(
                name: "IX_LopHocTrongKys_MaMonHoc_MaHocKy_TenLop",
                table: "LopHocTrongKys",
                columns: new[] { "MaMonHoc", "MaHocKy", "TenLop" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonHocs_MaBoMon",
                table: "MonHocs",
                column: "MaBoMon");

            migrationBuilder.CreateIndex(
                name: "IX_NamHocs_TenNamHoc",
                table: "NamHocs",
                column: "TenNamHoc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NganhHocs_MaKhoaVien",
                table: "NganhHocs",
                column: "MaKhoaVien");

            migrationBuilder.CreateIndex(
                name: "IX_NhomLopNganhs_MaNganh",
                table: "NhomLopNganhs",
                column: "MaNganh");

            migrationBuilder.CreateIndex(
                name: "IX_Quyens_TenQuyen",
                table: "Quyens",
                column: "TenQuyen",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SinhViens_MaNhomLop",
                table: "SinhViens",
                column: "MaNhomLop");

            migrationBuilder.CreateIndex(
                name: "IX_SinhViens_MaSoSV",
                table: "SinhViens",
                column: "MaSoSV",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SinhViens_MaTaiKhoan",
                table: "SinhViens",
                column: "MaTaiKhoan",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaiKhoans_MaQuyen",
                table: "TaiKhoans",
                column: "MaQuyen");

            migrationBuilder.CreateIndex(
                name: "IX_TaiKhoans_TenDangNhap",
                table: "TaiKhoans",
                column: "TenDangNhap",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiemHocPhans");

            migrationBuilder.DropTable(
                name: "KetQuaHocTapKys");

            migrationBuilder.DropTable(
                name: "KhungChuongTrinhs");

            migrationBuilder.DropTable(
                name: "LopHocKyGiangViens");

            migrationBuilder.DropTable(
                name: "DangKyLopHocs");

            migrationBuilder.DropTable(
                name: "GiangViens");

            migrationBuilder.DropTable(
                name: "LopHocTrongKys");

            migrationBuilder.DropTable(
                name: "SinhViens");

            migrationBuilder.DropTable(
                name: "HocKys");

            migrationBuilder.DropTable(
                name: "MonHocs");

            migrationBuilder.DropTable(
                name: "NhomLopNganhs");

            migrationBuilder.DropTable(
                name: "TaiKhoans");

            migrationBuilder.DropTable(
                name: "NamHocs");

            migrationBuilder.DropTable(
                name: "BoMons");

            migrationBuilder.DropTable(
                name: "NganhHocs");

            migrationBuilder.DropTable(
                name: "Quyens");

            migrationBuilder.DropTable(
                name: "KhoaViens");
        }
    }
}
