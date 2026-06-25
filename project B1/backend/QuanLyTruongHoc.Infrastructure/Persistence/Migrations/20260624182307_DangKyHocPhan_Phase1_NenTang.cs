using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DangKyHocPhan_Phase1_NenTang : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "NgayBatDau",
                table: "LichHocLopHocKys",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<DateOnly>(
                name: "NgayKetThuc",
                table: "LichHocLopHocKys",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<int>(
                name: "NamNhapHoc",
                table: "KhoaHocNganhs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "HanDangKyDen",
                table: "HocKys",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HanDangKyTu",
                table: "HocKys",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HanRutDangKyDen",
                table: "HocKys",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HanRutDangKyTu",
                table: "HocKys",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LoaiHocKy",
                table: "HocKys",
                type: "text",
                nullable: false,
                defaultValue: "Chính");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NgayBatDau",
                table: "LichHocLopHocKys");

            migrationBuilder.DropColumn(
                name: "NgayKetThuc",
                table: "LichHocLopHocKys");

            migrationBuilder.DropColumn(
                name: "NamNhapHoc",
                table: "KhoaHocNganhs");

            migrationBuilder.DropColumn(
                name: "HanDangKyDen",
                table: "HocKys");

            migrationBuilder.DropColumn(
                name: "HanDangKyTu",
                table: "HocKys");

            migrationBuilder.DropColumn(
                name: "HanRutDangKyDen",
                table: "HocKys");

            migrationBuilder.DropColumn(
                name: "HanRutDangKyTu",
                table: "HocKys");

            migrationBuilder.DropColumn(
                name: "LoaiHocKy",
                table: "HocKys");
        }
    }
}
