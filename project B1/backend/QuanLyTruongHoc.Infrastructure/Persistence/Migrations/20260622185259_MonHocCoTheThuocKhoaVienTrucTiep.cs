using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MonHocCoTheThuocKhoaVienTrucTiep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MonHocs_BoMons_MaBoMon",
                table: "MonHocs");

            migrationBuilder.AlterColumn<int>(
                name: "MaBoMon",
                table: "MonHocs",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "MaKhoaVien",
                table: "MonHocs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MonHocs_MaKhoaVien",
                table: "MonHocs",
                column: "MaKhoaVien");

            migrationBuilder.AddForeignKey(
                name: "FK_MonHocs_BoMons_MaBoMon",
                table: "MonHocs",
                column: "MaBoMon",
                principalTable: "BoMons",
                principalColumn: "MaBoMon",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MonHocs_KhoaViens_MaKhoaVien",
                table: "MonHocs",
                column: "MaKhoaVien",
                principalTable: "KhoaViens",
                principalColumn: "MaKhoaVien",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MonHocs_BoMons_MaBoMon",
                table: "MonHocs");

            migrationBuilder.DropForeignKey(
                name: "FK_MonHocs_KhoaViens_MaKhoaVien",
                table: "MonHocs");

            migrationBuilder.DropIndex(
                name: "IX_MonHocs_MaKhoaVien",
                table: "MonHocs");

            migrationBuilder.DropColumn(
                name: "MaKhoaVien",
                table: "MonHocs");

            migrationBuilder.AlterColumn<int>(
                name: "MaBoMon",
                table: "MonHocs",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_MonHocs_BoMons_MaBoMon",
                table: "MonHocs",
                column: "MaBoMon",
                principalTable: "BoMons",
                principalColumn: "MaBoMon",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
