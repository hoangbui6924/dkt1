# Kiến trúc hệ thống — QuanLyTruongHoc (VMU)

Tài liệu kỹ thuật để **nghiên cứu + cải tiến chính xác**. Cập nhật khi đổi luồng/kiến trúc.

## 1. Tổng quan 3 tầng + AI
```
[React SPA :5173] --HTTP/JSON + JWT--> [ASP.NET Core API :5000] --EF Core--> [PostgreSQL :5432]
                                              |
                                              +--OpenAI-compat HTTPS--> [NVIDIA NIM: gpt-oss-120b + nv-embedqa-e5-v5]
```
- **Frontend** (React/Vite/TS): gọi API qua `services/*` (axios), đính JWT.
- **Backend** (layered: Api → Application → Domain; Infrastructure hiện thực): controllers mỏng, logic ở service, EF Core truy CSDL.
- **DB** (PostgreSQL): schema + dữ liệu mẫu + **tài liệu PDF đã chunk + vector embedding** (phục vụ RAG).
- **AI** (NVIDIA NIM): chat (`openai/gpt-oss-120b`) + embedding (`nvidia/nv-embedqa-e5-v5`).

## 2. Luồng xác thực (Auth)
`POST /api/auth/login {TenDangNhap, MatKhau}` → `AuthService.LoginAsync`:
1. Tra `TaiKhoan` theo tên đăng nhập.
2. Verify mật khẩu bằng **BCrypt**.
3. Sinh **JWT** (claims: `sub`=mã tài khoản, `name`=tên đăng nhập, `role`=SinhVien/GiangVien/Admin; exp theo `Jwt:ExpiryMinutes`).
4. Frontend lưu token, đính `Authorization: Bearer` cho các request sau. Endpoint nhạy cảm gắn `[Authorize]`.

## 3. Luồng RAG — Chatbot hỏi-đáp <a id="rag"></a>
Đây là phần lõi AI (`Api/Controllers/ChatbotController.cs` + `Infrastructure/Services/Nvidia*`). `POST /api/chatbot/hoi {CauHoi, MaMonHoc?, LichSu?}`:

1. **Nối ngữ cảnh hội thoại**: ghép lượt hỏi trước của SV vào câu tra cứu (để giải đại từ "nó", "môn đó"...).
2. **Chọn tài liệu ứng viên**: lọc `TaiLieu` đã xử lý; nếu chọn môn → ưu tiên giáo trình môn đó + nội quy/sổ tay; không thì toàn bộ.
3. **Tra cứu hybrid** trên các `TaiLieuChunk`:
   - **Ngữ nghĩa**: embed câu hỏi (`EmbedQueryAsync`) → cosine với embedding mỗi chunk (`VectorMath`).
   - **Từ vựng**: cộng nhẹ điểm cho chunk chứa từ khoá (sau khi chuẩn hoá bỏ dấu tiếng Việt).
   - Lấy top `SoChunkXet=8`, lọc ngưỡng `NguongNguCanh=0.30` để vào ngữ cảnh; chỉ chunk ≥ `NguongHienNguon=0.46` mới hiện làm "nguồn trích dẫn" (tránh nguồn ảo).
4. **Bổ sung dữ liệu DB**: cơ cấu tổ chức (khoa→bộ môn/ngành) + dữ liệu môn học (tín chỉ, GV dạy, **độ khó thống kê từ điểm khoá trước**: avg + tỉ lệ đạt).
5. **Dựng prompt** (system prompt chặt: ngắn gọn, đúng phạm vi, từ chối ngoài lề) + lịch sử (≤6 lượt) + ngữ cảnh + câu hỏi → gọi `gpt-oss-120b` (temp 0, max_tokens 1024, `reasoning_effort=low`).
6. **Trích nguồn (grounded citation, xác định)**: sau khi có câu trả lời, chỉ kèm những đoạn ≥ ngưỡng mà **nội dung thực sự xuất hiện trong câu trả lời** (đủ từ đặc trưng trùng) — tránh "nguồn ảo" khi trả lời từ DB/kiến thức chung, và **không phụ thuộc marker model tự phát** (cũ dùng `[[DUNG_TAILIEU]]` nhưng flaky ~33%).

> **Hai endpoint**: `POST /api/chatbot/hoi` (trả JSON một lần) và `POST /api/chatbot/hoi-stream` (**SSE streaming** token sống — FE dùng cái này). Cả hai chung hàm `ChuanBiHoiThoaiAsync` (retrieval + context).
>
> **Hiệu năng** (đo thực tế, đã tối ưu ~20s → ~2s): retrieval dùng **vector cache trong RAM** (`ChunkVec`, parse 1 lần) thay vì load+parse 648 chunk mỗi query; context DB cache `IMemoryCache` 10'; `reasoning_effort=low` cắt reasoning của gpt-oss. Chi tiết breakdown: [IMPROVEMENTS](IMPROVEMENTS.md#hiệu-năng-ai).

## 4. Luồng gợi ý thời khoá biểu (+ chatbot agentic) <a id="xep-lich"></a>
Logic nằm ở **`GoiYLichService`** (Infrastructure, tách khỏi controller theo quy ước "controller mỏng"): SV nhập yêu cầu ngôn ngữ tự nhiên → AI (`gpt-oss`) trích ràng buộc (ưu tiên/tránh GV, tránh thứ/tiết, môn tự chọn, học lại) → **backtracking** chọn 1 lớp/môn **không trùng giờ** (dùng `Common/LichHoc.TrungNhau`, có giới hạn nút) → tối đa 5 phương án.

**Hai lối vào, một service**:
- Trang đăng ký: `POST /api/dang-ky-hoc-phan/goi-y-thoi-khoa-bieu` (controller mỏng → `GoiYLichService.GoiYAsync`).
- **Chatbot agentic** (function-calling, in-process — không self-HTTP): registry **4 tool** trong `IAiChatService.ChatStreamAsync(tools, executeTool)`:
  - `goi_y_lich_hoc` — xếp TKB (gọi `GoiYLichService`); output lộ `[ID:..]` để nối sang đăng ký.
  - `xem_lich_da_dang_ky` / `xem_chuong_trinh_ky_nay` — tra cứu read-only của chính SV.
  - `tim_kiem_web` — tìm Internet khi thiếu dữ liệu nội bộ (`WebSearchService`: DuckDuckGo → Wikipedia VI, không key).
  - `dang_ky_lop_hoc` — **tool GHI có cổng an toàn**: chatbot CHỈ trả `HanhDongCho` (đề xuất), KHÔNG tự ghi; FE xác nhận rồi gọi `POST /dang-ky-hoc-phan/{id}` (đủ validate). 2 chế độ: **"Chủ động có quy tắc"** (mặc định — modal xác nhận, human-in-loop) / **"Trao quyền nguy hiểm"** (opt-in — tự đăng ký).

> Quy tắc nghiệp vụ dùng chung (đạt/cải thiện, đợt áp dụng, kỳ đạt, trùng giờ) ở `Application/Common/` (`DangKyRules`, `LichHoc`) — một nguồn sự thật cho cả endpoint đăng ký lẫn service xếp lịch.
>
> **WebMCP** (forward-looking, Chrome 149+ origin trial): `frontend/src/webmcp.ts` đăng ký tool B1 qua `navigator.modelContext` (hỏi trợ lý + điều hướng) để **agent trình duyệt** điều khiển trong phiên đăng nhập của SV; feature-detect → no-op nếu trình duyệt chưa hỗ trợ.

## 5. Mô hình dữ liệu (điểm chính)
- Học vụ: `KhoaVien` → `BoMon`/`NganhHoc` → `MonHoc` (loại, tín chỉ) → `KhungChuongTrinh` (môn theo kỳ).
- Lớp: `NamHoc`/`HocKy` → `LopHocTrongKy` (lịch nhiều buổi/tuần, tự kiểm trùng phòng + trùng GV) → `LopHocKyGiangVien`.
- Đăng ký + điểm: `DotDangKy` → `DangKyLopHoc` → `DiemHocPhan` (X/Y/Z → điểm chữ + thang 4 → GPA).
- Tài liệu/RAG: `TaiLieu` (PDF) → `TaiLieuChunk` (đoạn text + `Embedding` lưu dạng chuỗi).

## 6. Hạ tầng
Docker Compose 4 service (postgres + backend + frontend + pgadmin). Backend build multi-stage (.NET SDK → aspnet runtime). Frontend build (node → nginx tĩnh). Dữ liệu DB ở named volume `qlth-pgdata`.
