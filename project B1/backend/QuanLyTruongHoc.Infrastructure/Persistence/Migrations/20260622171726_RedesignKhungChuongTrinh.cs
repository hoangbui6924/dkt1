using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RedesignKhungChuongTrinh : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KhungChuongTrinhs_MonHocs_MaMonHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropForeignKey(
                name: "FK_KhungChuongTrinhs_NganhHocs_MaNganh",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_KhungChuongTrinhs",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropIndex(
                name: "IX_KhungChuongTrinhs_MaMonHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropIndex(
                name: "IX_KhungChuongTrinhs_MaNganh_MaMonHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropColumn(
                name: "SoTinChiToanKhoa",
                table: "NganhHocs");

            migrationBuilder.DropColumn(
                name: "LoaiMon",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropColumn(
                name: "NhomTuChon",
                table: "KhungChuongTrinhs");

            migrationBuilder.RenameColumn(
                name: "MaNganh",
                table: "KhungChuongTrinhs",
                newName: "TongTinChi");

            migrationBuilder.RenameColumn(
                name: "MaMonHoc",
                table: "KhungChuongTrinhs",
                newName: "SoTinChiTuChonToiThieu");

            migrationBuilder.RenameColumn(
                name: "MaKhungCT",
                table: "KhungChuongTrinhs",
                newName: "SoTinChiBatBuoc");

            migrationBuilder.AddColumn<int>(
                name: "MaMonHocTienQuyet",
                table: "MonHocs",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "SoTinChiBatBuoc",
                table: "KhungChuongTrinhs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<int>(
                name: "MaKhungChuongTrinh",
                table: "KhungChuongTrinhs",
                type: "integer",
                nullable: false,
                defaultValue: 0)
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<int>(
                name: "MaNganhHoc",
                table: "KhungChuongTrinhs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_KhungChuongTrinhs",
                table: "KhungChuongTrinhs",
                column: "MaKhungChuongTrinh");

            migrationBuilder.CreateTable(
                name: "MonHocThuocKhungChuongTrinhs",
                columns: table => new
                {
                    Ma = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaKhungChuongTrinh = table.Column<int>(type: "integer", nullable: false),
                    MaMonHoc = table.Column<int>(type: "integer", nullable: false),
                    KyHoc = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MonHocThuocKhungChuongTrinhs", x => x.Ma);
                    table.ForeignKey(
                        name: "FK_MonHocThuocKhungChuongTrinhs_KhungChuongTrinhs_MaKhungChuon~",
                        column: x => x.MaKhungChuongTrinh,
                        principalTable: "KhungChuongTrinhs",
                        principalColumn: "MaKhungChuongTrinh",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MonHocThuocKhungChuongTrinhs_MonHocs_MaMonHoc",
                        column: x => x.MaMonHoc,
                        principalTable: "MonHocs",
                        principalColumn: "MaMonHoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MonHocs_MaMonHocTienQuyet",
                table: "MonHocs",
                column: "MaMonHocTienQuyet");

            migrationBuilder.CreateIndex(
                name: "IX_KhungChuongTrinhs_MaNganhHoc",
                table: "KhungChuongTrinhs",
                column: "MaNganhHoc",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonHocThuocKhungChuongTrinhs_MaKhungChuongTrinh_MaMonHoc",
                table: "MonHocThuocKhungChuongTrinhs",
                columns: new[] { "MaKhungChuongTrinh", "MaMonHoc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonHocThuocKhungChuongTrinhs_MaMonHoc",
                table: "MonHocThuocKhungChuongTrinhs",
                column: "MaMonHoc");

            migrationBuilder.AddForeignKey(
                name: "FK_KhungChuongTrinhs_NganhHocs_MaNganhHoc",
                table: "KhungChuongTrinhs",
                column: "MaNganhHoc",
                principalTable: "NganhHocs",
                principalColumn: "MaNganh",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_MonHocs_MonHocs_MaMonHocTienQuyet",
                table: "MonHocs",
                column: "MaMonHocTienQuyet",
                principalTable: "MonHocs",
                principalColumn: "MaMonHoc",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_KhungChuongTrinhs_NganhHocs_MaNganhHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropForeignKey(
                name: "FK_MonHocs_MonHocs_MaMonHocTienQuyet",
                table: "MonHocs");

            migrationBuilder.DropTable(
                name: "MonHocThuocKhungChuongTrinhs");

            migrationBuilder.DropIndex(
                name: "IX_MonHocs_MaMonHocTienQuyet",
                table: "MonHocs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_KhungChuongTrinhs",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropIndex(
                name: "IX_KhungChuongTrinhs_MaNganhHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropColumn(
                name: "MaMonHocTienQuyet",
                table: "MonHocs");

            migrationBuilder.DropColumn(
                name: "MaKhungChuongTrinh",
                table: "KhungChuongTrinhs");

            migrationBuilder.DropColumn(
                name: "MaNganhHoc",
                table: "KhungChuongTrinhs");

            migrationBuilder.RenameColumn(
                name: "TongTinChi",
                table: "KhungChuongTrinhs",
                newName: "MaNganh");

            migrationBuilder.RenameColumn(
                name: "SoTinChiTuChonToiThieu",
                table: "KhungChuongTrinhs",
                newName: "MaMonHoc");

            migrationBuilder.RenameColumn(
                name: "SoTinChiBatBuoc",
                table: "KhungChuongTrinhs",
                newName: "MaKhungCT");

            migrationBuilder.AddColumn<int>(
                name: "SoTinChiToanKhoa",
                table: "NganhHocs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "MaKhungCT",
                table: "KhungChuongTrinhs",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<string>(
                name: "LoaiMon",
                table: "KhungChuongTrinhs",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NhomTuChon",
                table: "KhungChuongTrinhs",
                type: "text",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_KhungChuongTrinhs",
                table: "KhungChuongTrinhs",
                column: "MaKhungCT");

            migrationBuilder.CreateIndex(
                name: "IX_KhungChuongTrinhs_MaMonHoc",
                table: "KhungChuongTrinhs",
                column: "MaMonHoc");

            migrationBuilder.CreateIndex(
                name: "IX_KhungChuongTrinhs_MaNganh_MaMonHoc",
                table: "KhungChuongTrinhs",
                columns: new[] { "MaNganh", "MaMonHoc" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_KhungChuongTrinhs_MonHocs_MaMonHoc",
                table: "KhungChuongTrinhs",
                column: "MaMonHoc",
                principalTable: "MonHocs",
                principalColumn: "MaMonHoc",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_KhungChuongTrinhs_NganhHocs_MaNganh",
                table: "KhungChuongTrinhs",
                column: "MaNganh",
                principalTable: "NganhHocs",
                principalColumn: "MaNganh",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
