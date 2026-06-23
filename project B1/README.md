# Quản lý Trường học

## Cấu trúc
- `backend/` — ASP.NET Core 8 Web API (Clean Architecture: Api / Application / Domain / Infrastructure), EF Core 8 + PostgreSQL
- `frontend/` — React 19 + Vite + TypeScript (trang Admin)
- `docker-compose.yml` — Postgres + Backend + Frontend

## Chạy bằng Docker
```
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Postgres: localhost:5432 (user/pass: postgres/postgres)

## Chạy thủ công (dev)

### Backend
```
cd backend
dotnet ef database update --project QuanLyTruongHoc.Infrastructure --startup-project QuanLyTruongHoc.Api
dotnet run --project QuanLyTruongHoc.Api
```
Sửa connection string trong `QuanLyTruongHoc.Api/appsettings.json` nếu cần.

### Frontend
```
cd frontend
npm install
npm run dev
```

## Tạo tài khoản admin đầu tiên
Hiện chưa có endpoint seed/đăng ký. Cần insert trực tiếp vào bảng `Quyens` và `TaiKhoans`,
mật khẩu phải hash bằng BCrypt (ví dụ dùng `BCrypt.Net.BCrypt.HashPassword("matkhau")`).
