# frontend/ — CLAUDE.md (quy ước tầng frontend)

**React 19 + Vite + TypeScript (strict) + Tailwind CSS v4 + React Router v7 + Axios.**

## Cấu trúc `src/`
| Thư mục | Vai trò |
|---|---|
| `pages/` | Trang theo vai trò (admin / student). Mỗi tính năng 1 thư mục. |
| `components/` | UI tái dùng. |
| `context/` | React context (auth/state toàn cục). |
| `services/` | **Tầng gọi API** (axios) — mỗi domain 1 file (`taiLieuService`, `authService`...). Component gọi service, KHÔNG gọi axios trực tiếp. |
| `App.tsx` · `main.tsx` | Router + bootstrap. |

## ⚠️ Gotcha LỚN NHẤT — TS strict
`npm run build` chạy **`tsc -b && vite build`**. `tsconfig` bật `noUnusedLocals` + `noUnusedParameters` → **import/biến/tham số thừa = LỖI BUILD** (`error TS6133`), không chỉ warning.
- `vite dev` (dev server) **không** báo lỗi này → dễ lọt.
- `docker compose up --build` build production → **sập** nếu có biến thừa.
- **Luôn chạy `npm run build` trước khi commit/PR frontend.** Gỡ mọi import không dùng.

## Quy ước
- Gọi API qua `services/*` (đã cấu hình base URL từ `VITE_API_URL`). Đính JWT vào header `Authorization: Bearer`.
- Type rõ ràng (DTO khớp backend). Dùng `type`/`interface` cho dữ liệu API.
- Tailwind v4: class utility; tránh CSS rời rạc.

## Lệnh (ở `frontend/`)
```bash
npm ci               # cài đúng theo package-lock
npm run dev          # dev server (Vite, KHÔNG bắt lỗi unused)
npm run build        # tsc -b && vite build — BẮT lỗi TS strict, chạy cái này trước khi commit
npm run preview      # xem bản build
```

## Cấu hình
- `VITE_API_URL` (file `.env`, đã track — chỉ chứa URL công khai, không secret) → mặc định `http://localhost:5000/api`. Khi build Docker, truyền qua build-arg trong compose.
