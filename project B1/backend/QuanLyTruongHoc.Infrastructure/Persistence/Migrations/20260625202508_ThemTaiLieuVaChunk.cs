using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ThemTaiLieuVaChunk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaiLieus",
                columns: table => new
                {
                    MaTaiLieu = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenFile = table.Column<string>(type: "text", nullable: false),
                    LoaiTaiLieu = table.Column<string>(type: "text", nullable: false),
                    MaMonHoc = table.Column<int>(type: "integer", nullable: true),
                    KichThuocBytes = table.Column<long>(type: "bigint", nullable: false),
                    SoTrang = table.Column<int>(type: "integer", nullable: false),
                    NoiDungFile = table.Column<byte[]>(type: "bytea", nullable: false),
                    TrangThai = table.Column<string>(type: "text", nullable: false),
                    GhiChuXuLy = table.Column<string>(type: "text", nullable: true),
                    NgayTaiLen = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    MaNguoiTaiLen = table.Column<int>(type: "integer", nullable: false),
                    TenNguoiTaiLen = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaiLieus", x => x.MaTaiLieu);
                    table.ForeignKey(
                        name: "FK_TaiLieus_MonHocs_MaMonHoc",
                        column: x => x.MaMonHoc,
                        principalTable: "MonHocs",
                        principalColumn: "MaMonHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaiLieuChunks",
                columns: table => new
                {
                    MaChunk = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaTaiLieu = table.Column<int>(type: "integer", nullable: false),
                    ChiSo = table.Column<int>(type: "integer", nullable: false),
                    Trang = table.Column<int>(type: "integer", nullable: false),
                    NoiDung = table.Column<string>(type: "text", nullable: false),
                    Embedding = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaiLieuChunks", x => x.MaChunk);
                    table.ForeignKey(
                        name: "FK_TaiLieuChunks_TaiLieus_MaTaiLieu",
                        column: x => x.MaTaiLieu,
                        principalTable: "TaiLieus",
                        principalColumn: "MaTaiLieu",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaiLieuChunks_MaTaiLieu",
                table: "TaiLieuChunks",
                column: "MaTaiLieu");

            migrationBuilder.CreateIndex(
                name: "IX_TaiLieus_MaMonHoc",
                table: "TaiLieus",
                column: "MaMonHoc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaiLieuChunks");

            migrationBuilder.DropTable(
                name: "TaiLieus");
        }
    }
}
