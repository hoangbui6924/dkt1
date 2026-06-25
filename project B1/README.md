# 🎓 Hệ thống Quản lý Trường học — QuanLyTruongHoc (VMU)

Hệ thống quản lý đào tạo đại học (mô phỏng theo Trường Đại học Hàng hải Việt Nam) gồm trang **quản trị (Admin)** và trang **sinh viên (Sinh viên)**, tích hợp **trợ lý AI** hỗ trợ xếp lịch học và chatbot hỏi–đáp.

---

## ✨ Tính năng chính

**Quản trị (Admin)**
- Quản lý danh mục: Khoa/Viện, Ngành học, Bộ môn, Môn học, Khung chương trình đào tạo.
- Quản lý người dùng: Sinh viên, Giảng viên (tự sinh tài khoản đăng nhập).
- Quản lý học vụ: Năm học – Học kỳ, Khoá học ngành, Nhóm lớp + cố vấn học tập, Lớp học theo kỳ (lịch học nhiều buổi/tuần, **tự kiểm tra trùng phòng & trùng lịch giảng viên**), Đợt đăng ký học phần, Nhập điểm (X/Y/Z → quy đổi điểm chữ & thang 4, tự cập nhật GPA).
- **Quản lý tài liệu**: tải lên PDF nội quy / sổ tay sinh viên / giáo trình môn học.

**Sinh viên**
- Xem khung chương trình, kết quả học tập (điểm, GPA).
- Đăng ký học phần: kiểm tra trùng lịch, **đổi lớp**, huỷ đăng ký theo đợt.
- Tải tài liệu môn học về máy.

**Trợ lý AI** 🤖
- **Gợi ý thời khoá biểu**: sinh viên nhập yêu cầu bằng ngôn ngữ tự nhiên (ưu tiên giảng viên, tránh ngày/tiết, môn tự chọn…) → hệ thống đề xuất **tối đa 5 phương án** lịch học không trùng giờ.
- **Chatbot hỏi–đáp (RAG)**: đọc tài liệu PDF đã tải lên **kết hợp** dữ liệu trong CSDL (cơ cấu tổ chức, môn học, giảng viên, độ khó môn học thống kê từ điểm khoá trước) để tư vấn; **có trí nhớ hội thoại** và biết từ chối câu hỏi ngoài phạm vi.

---

## 🧱 Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | ASP.NET Core 8 Web API, Entity Framework Core 8, JWT, BCrypt, PdfPig (đọc PDF) |
| Cơ sở dữ liệu | PostgreSQL 15 |
| AI | NVIDIA NIM — `openai/gpt-oss-120b` (chat) + `nvidia/nv-embedqa-e5-v5` (embeddings cho RAG) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, Axios |
| Hạ tầng | Docker & Docker Compose |

Backend tổ chức theo lớp: `Api` (controllers) · `Application` (DTO, interface, helper) · `Domain` (entities) · `Infrastructure` (DbContext, migrations, service AI/Auth).

---

## 📁 Cấu trúc thư mục

```
project B1/
├─ backend/
│  ├─ QuanLyTruongHoc.Api/             # Web API, Controllers, Program.cs, Dockerfile
│  ├─ QuanLyTruongHoc.Application/     # DTOs, Interfaces, Common (VectorMath, TextChunker…)
│  ├─ QuanLyTruongHoc.Domain/          # Entities
│  └─ QuanLyTruongHoc.Infrastructure/ # AppDbContext, Migrations, Services (AI, Embedding, Auth)
├─ frontend/                          # React + Vite + TypeScript
├─ database/
│  └─ QuanLyTruongHoc.sql             # ⭐ Bản export CSDL (schema + toàn bộ dữ liệu)
├─ docker-compose.yml
├─ .env.example                       # Mẫu cấu hình khoá API AI
└─ README.md
```

---

## 🚀 Cài đặt & chạy (khuyến nghị: Docker)

> Yêu cầu: đã cài **Docker Desktop** (Docker + Docker Compose). Không cần cài .NET/Node thủ công.

### 1. Tải mã nguồn
```bash
git clone <đường-dẫn-repo-của-bạn>
cd "project B1"
```

### 2. Cấu hình khoá API cho tính năng AI
Khoá API NVIDIA **không** được commit lên Git (vì lý do bảo mật). Hãy tạo file `.env` từ mẫu:
```bash
cp .env.example .env
```
Mở `.env` và điền khoá NVIDIA của bạn (lấy **miễn phí** tại <https://build.nvidia.com> → *API Key*):
```
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
> 💡 Nếu bỏ trống khoá, toàn bộ hệ thống vẫn chạy bình thường — chỉ riêng 2 tính năng AI (gợi ý lịch học, chatbot) sẽ không hoạt động.

### 3. Khởi động hệ thống
```bash
docker compose up -d --build
```
Lệnh này dựng 4 container: `qlth-postgres`, `qlth-backend`, `qlth-frontend`, `qlth-pgadmin`.

### 4. Nạp dữ liệu từ bản export ⭐
Lúc này CSDL còn trống. Nạp toàn bộ **schema + dữ liệu** từ file export:

```bash
# Linux / macOS / Git Bash
docker exec -i qlth-postgres psql -U postgres -d QuanLyTruongHoc < database/QuanLyTruongHoc.sql
```
```powershell
# Windows PowerShell
Get-Content -Raw database/QuanLyTruongHoc.sql | docker exec -i qlth-postgres psql -U postgres -d QuanLyTruongHoc
```

Xong! Mở trình duyệt:

| Dịch vụ | Địa chỉ |
|---|---|
| 🖥️ Giao diện web | <http://localhost:5173> |
| 🔌 API backend | <http://localhost:5000/api> |
| 🗄️ pgAdmin (xem CSDL) | <http://localhost:5050> — `admin@admin.com` / `admin` |
| 🐘 PostgreSQL | `localhost:5432` — `postgres` / `postgres` (db: `QuanLyTruongHoc`) |

Dừng hệ thống: `docker compose down` (thêm `-v` nếu muốn xoá luôn dữ liệu trong volume).

---

## 🔑 Tài khoản đăng nhập mẫu

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Sinh viên | mã sinh viên, ví dụ `106012` | `123456a@B` |
| Giảng viên | email, ví dụ `giangndt@vimaru.edu.vn` | `123456a@B` |
| Quản trị (Admin) | `admin` | *(xem ghi chú bên dưới)* |

> **Đăng nhập Admin:** mật khẩu admin do người tạo dữ liệu đặt. Nếu bạn clone từ repo và chưa biết mật khẩu, hãy đặt lại admin về `123456a@B` bằng lệnh sau:
> ```bash
> docker exec -i qlth-postgres psql -U postgres -d QuanLyTruongHoc -c "UPDATE \"TaiKhoans\" SET \"MatKhauHash\"='\$2a\$11\$00uFRcchgeYna79O54TDjeNZEACKSqkAs/my1wiPTGDDXLq0OQvVm' WHERE \"TenDangNhap\"='admin';"
> ```
> Sau đó đăng nhập `admin` / `123456a@B`.

---

## 🗃️ Về bản export cơ sở dữ liệu

- File `database/QuanLyTruongHoc.sql` là bản `pg_dump` đầy đủ: **cấu trúc bảng + toàn bộ dữ liệu** (khoa, ngành, bộ môn, 68 môn học, 24 giảng viên, 218 sinh viên, tài khoản, lớp học, **và tài liệu PDF + vector embedding** phục vụ chatbot).
- Khôi phục vào một PostgreSQL trống bất kỳ:
  ```bash
  psql -U postgres -d QuanLyTruongHoc -f database/QuanLyTruongHoc.sql
  ```
- Tạo lại bản export mới sau khi dữ liệu thay đổi:
  ```bash
  docker exec qlth-postgres pg_dump -U postgres -d QuanLyTruongHoc --no-owner --no-acl > database/QuanLyTruongHoc.sql
  ```

> ℹ️ **Phương án nâng cao (không dùng bản export):** nếu muốn tạo CSDL trống từ đầu bằng EF Core migrations:
> ```bash
> cd backend
> dotnet ef database update --project QuanLyTruongHoc.Infrastructure --startup-project QuanLyTruongHoc.Api
> ```
> Cách này chỉ tạo **schema rỗng**, không có dữ liệu mẫu.

---

## ⚠️ Lưu ý bảo mật khi đưa lên GitHub

- File `.env` (chứa khoá API thật) **đã được `.gitignore`** — sẽ không bị đẩy lên GitHub. Chỉ `.env.example` (placeholder) được commit.
- `docker-compose.yml` chỉ tham chiếu `${NVIDIA_API_KEY}` chứ không chứa khoá thật.
- `Jwt__SecretKey` trong `docker-compose.yml` đang là chuỗi mẫu — **hãy đổi sang chuỗi bí mật ngẫu nhiên dài** trước khi triển khai thật.
- Nếu trước đây bạn lỡ commit thư mục `bin/`, `obj/`, `node_modules/`, hãy gỡ khỏi Git (chúng đã có trong `.gitignore`):
  ```bash
  git rm -r --cached -- "backend/**/bin" "backend/**/obj" "frontend/node_modules"
  git commit -m "Remove build artifacts from tracking"
  ```

---

## 📜 Giấy phép
Dự án phục vụ mục đích học tập.
