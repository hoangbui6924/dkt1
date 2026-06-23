namespace QuanLyTruongHoc.Application.DTOs;

public record LoginRequest(string TenDangNhap, string MatKhau);

public record LoginResponse(string Token, string TenDangNhap, string TenQuyen, DateTime ExpiresAt);
