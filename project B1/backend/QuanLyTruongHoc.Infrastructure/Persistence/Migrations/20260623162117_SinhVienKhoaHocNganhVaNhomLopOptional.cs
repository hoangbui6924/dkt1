using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SinhVienKhoaHocNganhVaNhomLopOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SinhViens_NhomLopNganhs_MaNhomLop",
                table: "SinhViens");

            migrationBuilder.AlterColumn<int>(
                name: "MaNhomLop",
                table: "SinhViens",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "MaKhoaHocNganh",
                table: "SinhViens",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_SinhViens_MaKhoaHocNganh",
                table: "SinhViens",
                column: "MaKhoaHocNganh");

            migrationBuilder.AddForeignKey(
                name: "FK_SinhViens_KhoaHocNganhs_MaKhoaHocNganh",
                table: "SinhViens",
                column: "MaKhoaHocNganh",
                principalTable: "KhoaHocNganhs",
                principalColumn: "MaKhoaHocNganh",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SinhViens_NhomLopNganhs_MaNhomLop",
                table: "SinhViens",
                column: "MaNhomLop",
                principalTable: "NhomLopNganhs",
                principalColumn: "MaNhomLop",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SinhViens_KhoaHocNganhs_MaKhoaHocNganh",
                table: "SinhViens");

            migrationBuilder.DropForeignKey(
                name: "FK_SinhViens_NhomLopNganhs_MaNhomLop",
                table: "SinhViens");

            migrationBuilder.DropIndex(
                name: "IX_SinhViens_MaKhoaHocNganh",
                table: "SinhViens");

            migrationBuilder.DropColumn(
                name: "MaKhoaHocNganh",
                table: "SinhViens");

            migrationBuilder.AlterColumn<int>(
                name: "MaNhomLop",
                table: "SinhViens",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_SinhViens_NhomLopNganhs_MaNhomLop",
                table: "SinhViens",
                column: "MaNhomLop",
                principalTable: "NhomLopNganhs",
                principalColumn: "MaNhomLop",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
