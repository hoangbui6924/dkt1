using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ThemDotDangKy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DotDangKys",
                columns: table => new
                {
                    MaDot = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaHocKy = table.Column<int>(type: "integer", nullable: false),
                    Ten = table.Column<string>(type: "text", nullable: false),
                    LoaiDot = table.Column<string>(type: "text", nullable: false),
                    ThoiGianBatDau = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ThoiGianKetThuc = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    ChoPhepDangKy = table.Column<bool>(type: "boolean", nullable: false),
                    ChoPhepRut = table.Column<bool>(type: "boolean", nullable: false),
                    NamNhapHoc = table.Column<int>(type: "integer", nullable: true),
                    MaKhoaVien = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DotDangKys", x => x.MaDot);
                    table.ForeignKey(
                        name: "FK_DotDangKys_HocKys_MaHocKy",
                        column: x => x.MaHocKy,
                        principalTable: "HocKys",
                        principalColumn: "MaHocKy",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DotDangKys_KhoaViens_MaKhoaVien",
                        column: x => x.MaKhoaVien,
                        principalTable: "KhoaViens",
                        principalColumn: "MaKhoaVien",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DotDangKys_MaHocKy",
                table: "DotDangKys",
                column: "MaHocKy");

            migrationBuilder.CreateIndex(
                name: "IX_DotDangKys_MaKhoaVien",
                table: "DotDangKys",
                column: "MaKhoaVien");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DotDangKys");
        }
    }
}
