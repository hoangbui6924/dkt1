# backend/ — CLAUDE.md (quy ước tầng backend)

**ASP.NET Core 8 Web API**, kiến trúc layered (Clean-ish). Dependencies hướng vào trong.

## 4 project (`QuanLyTruongHoc.sln`)
| Project | Chứa gì | Phụ thuộc |
|---|---|---|
| `QuanLyTruongHoc.Domain` | Entities thuần (MonHoc, SinhVien, GiangVien, TaiLieu, TaiLieuChunk, DiemHocPhan...). | (không phụ thuộc gì) |
| `QuanLyTruongHoc.Application` | DTOs, Interfaces (`IAuthService`, `IAiChatService`, `IEmbeddingService`), helper `Common/` (VectorMath, TextChunker). | Domain |
| `QuanLyTruongHoc.Infrastructure` | `AppDbContext`, EF Core migrations, hiện thực service (Auth/JWT/BCrypt, `NvidiaAiChatService`, `NvidiaEmbeddingService`). | Application, Domain |
| `QuanLyTruongHoc.Api` | Controllers (19), `Program.cs` (DI, JWT, CORS), Dockerfile. | tất cả |

## Quy ước
- **Controller mỏng**: nhận DTO → gọi service/`AppDbContext` → trả DTO. Logic nặng để ở service.
- **Route kebab-case**, prefix `/api/...`. Endpoint ghi dữ liệu phải `[Authorize]` (+ check role khi cần).
- **EF Core**: query bằng LINQ; cẩn thận query dịch sang SQL (tránh `.ToList()` sớm gây load thừa, tránh N+1).
- **Auth**: mật khẩu băm **BCrypt** (`BCrypt.Net-Next`); đăng nhập trả **JWT** (claims: sub, name, role). Secret/issuer/audience lấy từ config `Jwt:*`.
- **AI**: gọi NVIDIA NIM (OpenAI-compatible) qua `NvidiaAiChatService` (chat) + `NvidiaEmbeddingService` (embedding cho RAG). Cấu hình `NvidiaAi:*` (BaseUrl/ApiKey/Model). Model mặc định `openai/gpt-oss-120b`.

## Lệnh (ở `backend/`)
```bash
dotnet build QuanLyTruongHoc.sln                         # build cả solution
dotnet ef migrations add <Ten> --project QuanLyTruongHoc.Infrastructure --startup-project QuanLyTruongHoc.Api   # thêm migration
dotnet ef database update --project QuanLyTruongHoc.Infrastructure --startup-project QuanLyTruongHoc.Api        # áp migration (tạo schema RỖNG, không có data)
```
> Migrations nằm ở `QuanLyTruongHoc.Infrastructure/Persistence/Migrations/`. Sau khi đổi entity → **thêm migration**, đừng sửa SQL tay.

## Gotcha
- DB production/demo nạp từ `../database/QuanLyTruongHoc.sql` (có cả data + embedding), KHÔNG dùng `ef database update` (chỉ tạo schema rỗng).
- `appsettings.json` đang track trong git — **không đặt secret thật vào đó** (key AI để trống, JWT là placeholder; secret thật qua biến môi trường/compose).
