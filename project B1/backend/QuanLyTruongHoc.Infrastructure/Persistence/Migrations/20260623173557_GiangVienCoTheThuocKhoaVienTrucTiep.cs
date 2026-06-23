using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class GiangVienCoTheThuocKhoaVienTrucTiep : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GiangViens_BoMons_MaBoMon",
                table: "GiangViens");

            migrationBuilder.AlterColumn<int>(
                name: "MaBoMon",
                table: "GiangViens",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "MaKhoaVien",
                table: "GiangViens",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GiangViens_MaKhoaVien",
                table: "GiangViens",
                column: "MaKhoaVien");

            migrationBuilder.AddForeignKey(
                name: "FK_GiangViens_BoMons_MaBoMon",
                table: "GiangViens",
                column: "MaBoMon",
                principalTable: "BoMons",
                principalColumn: "MaBoMon",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GiangViens_KhoaViens_MaKhoaVien",
                table: "GiangViens",
                column: "MaKhoaVien",
                principalTable: "KhoaViens",
                principalColumn: "MaKhoaVien",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GiangViens_BoMons_MaBoMon",
                table: "GiangViens");

            migrationBuilder.DropForeignKey(
                name: "FK_GiangViens_KhoaViens_MaKhoaVien",
                table: "GiangViens");

            migrationBuilder.DropIndex(
                name: "IX_GiangViens_MaKhoaVien",
                table: "GiangViens");

            migrationBuilder.DropColumn(
                name: "MaKhoaVien",
                table: "GiangViens");

            migrationBuilder.AlterColumn<int>(
                name: "MaBoMon",
                table: "GiangViens",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_GiangViens_BoMons_MaBoMon",
                table: "GiangViens",
                column: "MaBoMon",
                principalTable: "BoMons",
                principalColumn: "MaBoMon",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
