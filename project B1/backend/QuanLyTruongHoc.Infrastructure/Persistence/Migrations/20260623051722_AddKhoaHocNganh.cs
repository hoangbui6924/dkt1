using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace QuanLyTruongHoc.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddKhoaHocNganh : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NhomLopNganhs_NganhHocs_MaNganh",
                table: "NhomLopNganhs");

            migrationBuilder.DropColumn(
                name: "KhoaHoc",
                table: "NhomLopNganhs");

            migrationBuilder.RenameColumn(
                name: "MaNganh",
                table: "NhomLopNganhs",
                newName: "MaKhoaHocNganh");

            migrationBuilder.RenameIndex(
                name: "IX_NhomLopNganhs_MaNganh",
                table: "NhomLopNganhs",
                newName: "IX_NhomLopNganhs_MaKhoaHocNganh");

            migrationBuilder.CreateTable(
                name: "KhoaHocNganhs",
                columns: table => new
                {
                    MaKhoaHocNganh = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenKhoaHoc = table.Column<string>(type: "text", nullable: false),
                    MaNganhHoc = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhoaHocNganhs", x => x.MaKhoaHocNganh);
                    table.ForeignKey(
                        name: "FK_KhoaHocNganhs_NganhHocs_MaNganhHoc",
                        column: x => x.MaNganhHoc,
                        principalTable: "NganhHocs",
                        principalColumn: "MaNganh",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KhoaHocNganhs_MaNganhHoc",
                table: "KhoaHocNganhs",
                column: "MaNganhHoc");

            migrationBuilder.AddForeignKey(
                name: "FK_NhomLopNganhs_KhoaHocNganhs_MaKhoaHocNganh",
                table: "NhomLopNganhs",
                column: "MaKhoaHocNganh",
                principalTable: "KhoaHocNganhs",
                principalColumn: "MaKhoaHocNganh",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NhomLopNganhs_KhoaHocNganhs_MaKhoaHocNganh",
                table: "NhomLopNganhs");

            migrationBuilder.DropTable(
                name: "KhoaHocNganhs");

            migrationBuilder.RenameColumn(
                name: "MaKhoaHocNganh",
                table: "NhomLopNganhs",
                newName: "MaNganh");

            migrationBuilder.RenameIndex(
                name: "IX_NhomLopNganhs_MaKhoaHocNganh",
                table: "NhomLopNganhs",
                newName: "IX_NhomLopNganhs_MaNganh");

            migrationBuilder.AddColumn<string>(
                name: "KhoaHoc",
                table: "NhomLopNganhs",
                type: "text",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NhomLopNganhs_NganhHocs_MaNganh",
                table: "NhomLopNganhs",
                column: "MaNganh",
                principalTable: "NganhHocs",
                principalColumn: "MaNganh",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
