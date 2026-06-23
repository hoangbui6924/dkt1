using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLoaiMonHocToMonHoc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LoaiMonHoc",
                table: "MonHocs",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LoaiMonHoc",
                table: "MonHocs");
        }
    }
}
