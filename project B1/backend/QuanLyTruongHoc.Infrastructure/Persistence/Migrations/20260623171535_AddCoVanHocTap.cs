using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCoVanHocTap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CoVanHocTaps",
                columns: table => new
                {
                    MaCoVan = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MaNhomLop = table.Column<int>(type: "integer", nullable: false),
                    MaGiangVien = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoVanHocTaps", x => x.MaCoVan);
                    table.ForeignKey(
                        name: "FK_CoVanHocTaps_GiangViens_MaGiangVien",
                        column: x => x.MaGiangVien,
                        principalTable: "GiangViens",
                        principalColumn: "MaGiangVien",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CoVanHocTaps_NhomLopNganhs_MaNhomLop",
                        column: x => x.MaNhomLop,
                        principalTable: "NhomLopNganhs",
                        principalColumn: "MaNhomLop",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoVanHocTaps_MaGiangVien",
                table: "CoVanHocTaps",
                column: "MaGiangVien");

            migrationBuilder.CreateIndex(
                name: "IX_CoVanHocTaps_MaNhomLop",
                table: "CoVanHocTaps",
                column: "MaNhomLop",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoVanHocTaps");
        }
    }
}
