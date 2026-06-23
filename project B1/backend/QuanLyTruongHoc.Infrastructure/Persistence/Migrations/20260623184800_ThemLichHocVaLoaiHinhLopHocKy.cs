using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ThemLichHocVaLoaiHinhLopHocKy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LoaiHinh",
                table: "LopHocTrongKys",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "LichHocLopHocKys",
                columns: table => new
                {
                    MaLich = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaLopHocKy = table.Column<int>(type: "integer", nullable: false),
                    Thu = table.Column<int>(type: "integer", nullable: false),
                    TietBatDau = table.Column<int>(type: "integer", nullable: false),
                    TietKetThuc = table.Column<int>(type: "integer", nullable: false),
                    PhongHoc = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LichHocLopHocKys", x => x.MaLich);
                    table.ForeignKey(
                        name: "FK_LichHocLopHocKys_LopHocTrongKys_MaLopHocKy",
                        column: x => x.MaLopHocKy,
                        principalTable: "LopHocTrongKys",
                        principalColumn: "MaLopHocKy",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LichHocLopHocKys_MaLopHocKy",
                table: "LichHocLopHocKys",
                column: "MaLopHocKy");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LichHocLopHocKys");

            migrationBuilder.DropColumn(
                name: "LoaiHinh",
                table: "LopHocTrongKys");
        }
    }
}
