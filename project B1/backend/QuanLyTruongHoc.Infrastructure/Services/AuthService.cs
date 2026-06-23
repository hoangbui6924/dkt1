using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QuanLyTruongHoc.Application.DTOs;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly JwtSettings _jwt;

    public AuthService(AppDbContext db, IOptions<JwtSettings> jwt)
    {
        _db = db;
        _jwt = jwt.Value;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var taiKhoan = await _db.TaiKhoans
            .Include(t => t.Quyen)
            .FirstOrDefaultAsync(t => t.TenDangNhap == request.TenDangNhap && t.TrangThai);

        if (taiKhoan is null || !BCrypt.Net.BCrypt.Verify(request.MatKhau, taiKhoan.MatKhauHash))
            return null;

        var expiresAt = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var tenQuyen = taiKhoan.Quyen?.TenQuyen ?? string.Empty;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, taiKhoan.MaTaiKhoan.ToString()),
            new Claim(ClaimTypes.Name, taiKhoan.TenDangNhap),
            new Claim(ClaimTypes.Role, tenQuyen)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return new LoginResponse(tokenString, taiKhoan.TenDangNhap, tenQuyen, expiresAt);
    }
}
