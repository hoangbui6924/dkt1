using Microsoft.AspNetCore.Mvc;
using QuanLyTruongHoc.Application.DTOs;
using QuanLyTruongHoc.Application.Interfaces;

namespace QuanLyTruongHoc.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result is null)
            return Unauthorized(new { message = "Sai tên đăng nhập hoặc mật khẩu" });

        return Ok(result);
    }
}
