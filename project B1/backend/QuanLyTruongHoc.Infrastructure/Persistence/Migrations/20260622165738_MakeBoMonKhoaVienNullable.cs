using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeBoMonKhoaVienNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BoMons_KhoaViens_MaKhoaVien",
                table: "BoMons");

            migrationBuilder.AlterColumn<int>(
                name: "MaKhoaVien",
                table: "BoMons",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_BoMons_KhoaViens_MaKhoaVien",
                table: "BoMons",
                column: "MaKhoaVien",
                principalTable: "KhoaViens",
                principalColumn: "MaKhoaVien",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BoMons_KhoaViens_MaKhoaVien",
                table: "BoMons");

            migrationBuilder.AlterColumn<int>(
                name: "MaKhoaVien",
                table: "BoMons",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BoMons_KhoaViens_MaKhoaVien",
                table: "BoMons",
                column: "MaKhoaVien",
                principalTable: "KhoaViens",
                principalColumn: "MaKhoaVien",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
