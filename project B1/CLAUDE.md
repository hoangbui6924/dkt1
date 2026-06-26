# CLAUDE.md — QuanLyTruongHoc (VMU) · ghi chú cho Claude Code

> **Hệ thống Quản lý Trường học** (mô phỏng ĐH Hàng hải VN): trang Admin + trang Sinh viên,
> kèm **trợ lý AI** (gợi ý lịch học + chatbot RAG). Full-stack, chạy bằng Docker Compose.
> File này **chỉ giữ pointer + gotcha quan trọng** — chi tiết nằm trong `docs/` và các CLAUDE.md con.

## Bản đồ codebase (lean)
| Thư mục | Vai trò |
|---|---|
| `backend/` | **ASP.NET Core 8 Web API**, layered: `Api` (controllers) · `Application` (DTO/interface/helper) · `Domain` (entities) · `Infrastructure` (DbContext, migrations, services AI/Auth). Xem `backend/CLAUDE.md`. |
| `frontend/` | **React 19 + Vite + TypeScript + Tailwind v4**. Xem `frontend/CLAUDE.md`. |
| `database/QuanLyTruongHoc.sql` | `pg_dump` đầy đủ (schema + dữ liệu mẫu: 68 môn, 24 GV, 218 SV, tài liệu + embedding). |
| `docs/` | Tài liệu nghiên cứu/cải tiến — **đọc trước khi sửa**: [ARCHITECTURE](docs/ARCHITECTURE.md) · [RAG](docs/ARCHITECTURE.md#rag) · [IMPROVEMENTS](docs/IMPROVEMENTS.md). |
| `eval/` | **Bộ eval RAG** (`run_eval.py` + `cases.json`, stdlib Python). Chạy: stack đang chạy → `cd eval && python run_eval.py` (17 ca, exit≠0 nếu fail). Chạy lại sau khi đổi prompt/threshold/retrieval. |
| `docker-compose.yml` | 4 service: `postgres` · `backend` (:5000→8080) · `frontend` (:5173→80) · `pgadmin` (:5050). |

## Lệnh (chạy ở thư mục `project B1/`)
```bash
docker compose up -d --build        # dựng + chạy cả 4 container
docker exec -i qlth-postgres psql -U postgres -d QuanLyTruongHoc < database/QuanLyTruongHoc.sql   # nạp dữ liệu (DB ban đầu trống!)
docker compose logs -f backend      # xem log backend
docker compose down                 # dừng (thêm -v để xoá luôn volume dữ liệu)
# Build/test backend riêng (không Docker — cần .NET 8 SDK):
cd backend && dotnet build QuanLyTruongHoc.sln
# Build frontend riêng (cần Node 20+):
cd frontend && npm ci && npm run build      # = tsc -b && vite build (TS strict!)
```

## ⚠️ GOTCHAS quan trọng (đọc kỹ trước khi đụng code)
- **TS strict `noUnusedLocals`/`noUnusedParameters`** → frontend **`npm run build` FAIL nếu có import/biến thừa** (vd `error TS6133`). `vite dev` không báo, nhưng `docker compose up --build` thì sập. **Luôn `npm run build` trước khi commit frontend.**
- **Route API dùng kebab-case**: `/api/khoa-vien`, `/api/ket-qua-hoc-tap`, `/api/auth/login`, `/api/chatbot/hoi` (KHÔNG phải `khoavien`).
- **DB ban đầu RỖNG** — phải nạp `database/QuanLyTruongHoc.sql` sau khi `up`, nếu không mọi thứ trống.
- **Tính năng AI cần `NVIDIA_API_KEY`** trong `.env` (lấy free tại build.nvidia.com). Bỏ trống → hệ thống vẫn chạy, chỉ 2 tính năng AI tắt. Key đọc qua `${NVIDIA_API_KEY}` trong compose — **KHÔNG commit `.env`**.
- **Đừng commit `bin/`, `obj/`, `node_modules/`** — đã có trong `.gitignore` nhưng repo lỡ track 1 số (xem [IMPROVEMENTS](docs/IMPROVEMENTS.md#dọn-build-artifacts)).
- **Tiếng Việt = UTF-8**: khi test API bằng curl trên Windows, ghi JSON ra file UTF-8 rồi `--data @file` (gửi inline dễ hỏng mã đa-byte → 400).
- **JWT SecretKey** trong `appsettings.json`/compose còn là **placeholder** — đổi chuỗi ngẫu nhiên dài trước khi deploy thật.

## Quy ước
- **Đặt tên bằng tiếng Việt không dấu** theo nghiệp vụ (entity `MonHoc`, `SinhVien`, controller `KhoaVienController`, cột `MaMonHoc`...). Giữ nhất quán.
- Kiến trúc **dependencies hướng vào trong**: `Api → Application → Domain`; `Infrastructure` hiện thực interface của `Application`. Đừng để `Domain` phụ thuộc tầng ngoài.
- Endpoint sửa dữ liệu **phải `[Authorize]`**; phân quyền theo role (`SinhVien` / `GiangVien` / `Admin`) trong JWT.

## Khi bắt đầu một task
1. Đọc `docs/ARCHITECTURE.md` (luồng dữ liệu) + CLAUDE.md con của tầng liên quan.
2. Sửa nhỏ nhất, đúng tầng. Backend: build `dotnet build`; Frontend: **`npm run build`** (bắt lỗi TS strict).
3. Verify chạy thật: `docker compose up -d --build` → nạp DB → test endpoint (login lấy token → gọi API).
4. Ghi lại bài học/việc còn lại vào `docs/IMPROVEMENTS.md`.
