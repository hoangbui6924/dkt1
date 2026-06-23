using QuanLyTruongHoc.Application.DTOs;

namespace QuanLyTruongHoc.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
}
