# Backlog cải tiến + Bài học (Neko Core / Claude Code)

Danh sách việc nên làm để **liên tục cải thiện**, ưu tiên từ trên xuống. Tick khi xong, thêm khi phát hiện.

## 🆕 Nâng cấp agentic + an toàn (PR "agentic RAG")
- [x] **Tool GHI có cổng an toàn** — `dang_ky_lop_hoc(ma_lop_hoc_ky)`: chatbot CHỈ ĐỀ XUẤT (`HanhDongCho`), KHÔNG tự ghi; đăng ký thật luôn qua `POST /dang-ky-hoc-phan/{id}` (đủ validate). 2 chế độ (widget): **"Chủ động có quy tắc"** (mặc định, human-in-loop: modal xác nhận) và **"Trao quyền nguy hiểm"** (opt-in, tự đăng ký). Đúng SOTA HITL: đọc auto, GHI gated. `goi_y_lich_hoc` lộ `[ID:..]` để model nối gợi ý → đăng ký.
- [x] **Tool tìm web** `tim_kiem_web` (DuckDuckGo → Wikipedia VI, không key) — gộp từ `main` thành **tool thứ 4** trong vòng lặp streaming (chạy được cả trong stream).
- [x] **Prompt config-first** — system prompt (STATIC) override qua config `Chatbot:SystemPrompt` (env/appsettings), không build lại; ngữ cảnh ĐỘNG tách ở message user mỗi request.
- [x] **Chống OOM / loop khi dùng lâu** — `IMemoryCache` `SizeLimit=50k` + `Size` mỗi entry (chunk cache Size = số chunk → vượt ngưỡng thì re-load thay vì OOM); cap ngữ cảnh LLM (`MaxCtxChars=24k`); vòng tool cap 1, retry cap 3, lịch sử cap 6, stream cap `max_tokens` — đều bounded.
- [x] **Eval RAGAS-flavored** — judge thêm điểm **TRUNG THỰC (faithfulness)** cạnh CHẤT LƯỢNG; `--label`/`--compare` (results.jsonl) để so cấu hình (reasoning_effort/threshold).
- [x] **WebMCP** (forward-looking, Chrome 149+ origin trial) — expose tool B1 qua `navigator.modelContext` (`hoi_tro_ly_sinh_vien` + `mo_trang_sinh_vien`); feature-detect → no-op nếu trình duyệt chưa hỗ trợ; ghi vẫn qua luồng xác nhận.
- [ ] RAGAS đầy đủ (context-precision/recall) cần expose chunk đã retrieve qua endpoint debug → để dành.

## 🔴 Chất lượng build / CI (quan trọng nhất)
- [x] **Sửa lỗi build frontend** `TS6133: 'LOAI_TAI_LIEU_LABEL' unused` (`pages/student/TaiLieu/TaiLieu.tsx`). *Trước fix: `docker compose up --build` fresh SẬP.* → commit ngay.
- [x] **Thêm CI (GitHub Actions)** chạy `dotnet build` + `npm run build` mỗi push/PR. → `/.github/workflows/ci.yml` (đặt ở **gốc repo**, không phải `project B1/`, vì GitHub Actions chỉ đọc `.github/workflows` ở gốc; scope `paths: project B1/**` để không kích hoạt khi `wiii-main` đổi). Verify local: cả 2 lệnh build pass (FE không còn TS6133, BE 0 errors). **Đây là bài học #1 từ Neko Core**: Neko có `ci.yml` và chính nó bắt được một bug cross-platform mà local Windows giấu. Lỗi `TS6133` ở trên CHẮC CHẮN bị CI chặn trước khi merge. Mẫu:
  ```yaml
  # .github/workflows/ci.yml
  name: ci
  on: [push, pull_request]
  jobs:
    backend:  { runs-on: ubuntu-latest, steps: [checkout, setup-dotnet@8, "dotnet build backend/QuanLyTruongHoc.sln"] }
    frontend: { runs-on: ubuntu-latest, steps: [checkout, setup-node@20, "cd frontend && npm ci && npm run build"] }
  ```

## 🟡 Dọn repo <a id="dọn-build-artifacts"></a>
- [x] **Gỡ build-artifact đã lỡ commit** (đúng 207 file `bin/`/`obj/`) — đã `git rm --cached` (file local giữ nguyên trên đĩa, chỉ stage xoá khỏi tracking; `.gitignore` đã ignore sẵn nên không bị add lại). Chờ anh commit:
  ```bash
  git commit -m "chore: remove build artifacts from tracking"
  ```
- [ ] Thêm `.claudeignore` (loại `bin/`, `obj/`, `node_modules/`, `database/*.sql`) để Claude Code đỡ nhiễu khi đọc repo (khuyến nghị từ blog Claude Code).

## 🟠 Hiệu năng AI <a id="hiệu-năng-ai"></a>
- [x] **Latency: ~20s → ~2s** 🎯 (đo thực tế, đối chiếu TỪNG tầng — bottleneck KHÁC giả định ban đầu!).
  - **Breakdown đo được** (câu "trường có khoa nào"): NVIDIA chat **1.35s** · embedding 0.74s · **brute-force retrieval ~7.7s** ← bottleneck THẬT, KHÔNG phải LLM. Bài học: *đo trước khi tối ưu* — ban đầu tưởng 20s là do LLM reasoning, hoá ra là retrieval.
  - [x] **Vector cache (đòn bẩy lớn nhất)**: trước mỗi query load 648 chunk (~8MB chuỗi embedding) + `VectorMath.Parse` 648×1024 float + `ChuanHoa` 648 đoạn. Giờ cache `ChunkVec` (vector đã parse + text đã chuẩn hoá) trong RAM (`IMemoryCache` TTL 10') → cosine in-memory <5ms. **Retrieval 7.7s → ~0.** ponytail: KHÔNG pgvector cho 648 chunk (YAGNI; trần ghi trong code: chuyển pgvector nếu >10K chunk).
  - [x] **`reasoning_effort=low`** (`NvidiaAiSettings`, áp cho chat + stream): đo trực tiếp NVIDIA với prompt 4651 token → **default 9.4s vs low 3.9s** (reasoning 575→46 ký tự), content giữ chất lượng. gpt-oss reasoning trên prompt lớn rất tốn.
  - **Runtime sau fix**: `/hoi` 9.8s → **2.1s** (warm), câu tra tài liệu ~3s **trích nguồn đúng** (sotaysinhvien.pdf + số trang); cache cold lần đầu ~3.9s.
- [x] **Streaming SSE** ⭐ (chuẩn chat UX 2026): `POST /api/chatbot/hoi-stream` trả `text/event-stream`; FE (`ChatbotWidget` + `hoiChatbotStream` dùng `fetch`+reader) render token sống. Marker `[[DUNG_TAILIEU]]` tách bằng **tail-hold** (giữ từ `[` cuối) để không lọt giữa luồng; nguồn gửi ở event `done`. **Verify: TTFB 1.9s, 91 token stream dần, marker không leak, exit 0.** Bài học reasoning model: *streaming một mình KHÔNG cứu latency* (reasoning sinh trước content) → phải kết hợp `reasoning_effort` + vector cache. Giữ `/hoi` non-stream làm fallback.
- [x] **Retry + backoff cho `NvidiaAiChatService`/`NvidiaEmbeddingService`** — đã thêm `Services/HttpRetry.cs` (retry 429/5xx/lỗi mạng, **honor Retry-After** + exponential backoff + jitter, tối đa 3 lần). Cả 2 service dùng `HttpRetry.PostJsonWithRetryAsync`. ponytail: **tự viết ~35 dòng thay vì `AddStandardResilienceHandler`** vì per-attempt timeout mặc định 10s của handler sẽ **giết call LLM ~20s**. Verify runtime: chatbot vẫn 200 OK sau khi nối retry. *(Đường 429 không kích hoạt được theo ý muốn nên chưa unit-test — project chưa có test infra, không dựng framework chỉ cho 1 helper.)*
- [x] **gpt-oss-120b là model reasoning** — ✅ **gọi NVIDIA thật để kiểm tra**: `message.content` **sạch, KHÔNG có `<think>`**; reasoning nằm ở field **riêng `reasoning_content`** mà code không đọc → **không leak, không cần lọc** (khác Neko vì provider khác). `finish_reason=stop`, completion 141/1024 token cho câu thường. ⚠️ Lưu ý: `reasoning_content` **dùng chung budget `max_tokens=1024`** → câu dài *có thể* cụt. → **đã set `reasoning_effort=low`** (xem mục Latency) nên reasoning rất ngắn (~46 ký tự), nguy cơ cụt thấp.

## 🟢 Bảo mật
- [ ] Đổi `Jwt:SecretKey` placeholder → chuỗi ngẫu nhiên ≥32 byte (qua biến môi trường, không hardcode). **Đã làm tốt** (giống Neko): không commit key thật, AI key qua `.env` gitignored, mật khẩu BCrypt.
- [ ] DataProtection keys lưu trong container (mất khi destroy) → mount volume nếu cần JWT/antiforgery bền qua restart.

## 🔵 Đánh giá chất lượng AI (eval + benchmark định lượng)
- [x] **Bộ eval + benchmark RAG** (`eval/cases.json` + `eval/run_eval.py`, stdlib Python — `python run_eval.py` để gate; `--judge` để chấm điểm). **22 ca** phủ: tra DB, trích tài liệu + nguồn, từ chối ngoài phạm vi, không bịa số (defer), đa lượt, **đối kháng** (typo/paraphrase/môn-tài liệu không tồn tại), **prompt-injection** (ép lộ system prompt / jailbreak), và **3 tool agentic** (xếp lịch / đã đăng ký / chương trình). Assert deterministic (contains/cite/no_source/not_contains) + heuristic (refuse/defer) + latency.
- [x] **Benchmark định lượng kiểu `neko bench`**: cờ `--judge` thêm **LLM-judge** (gpt-oss tự chấm 0-10 chất lượng từng câu) → có **ĐIỂM** để so cấu hình (reasoning_effort, threshold...), không chỉ pass/fail. **Kết quả: 22/22 PASS · QUALITY 9.3/10 (min 9) · latency p50 2.6s / p95 ~5-8s.** *(Latency đo full-completion `/hoi`; UX thật là streaming TTFB ~2s.)*
- [x] **Eval bắt được bug thật → fix**: citation cũ dựa marker `[[DUNG_TAILIEU]]` do model tự phát **flaky ~33%** (cùng câu paraphrase: 4/6 cite, 2/6 không). Đo cosine cho thấy **điểm không tách được** cite/không-cite (câu "khoa nào" điểm CAO nhất 0.544 dù trả từ DB). → Thay bằng **grounded citation XÁC ĐỊNH**: cite đoạn ≥ngưỡng mà nội dung **thực sự xuất hiện trong câu trả lời** (đủ từ đặc trưng trùng). Bỏ hẳn marker → **đơn giản hoá streaming** (xoá tail-hold) + hết flaky (6/6 cite). SOTA: attribution dựa groundedness thay vì sentinel model tự phát.

## ⚪ Phát hiện thêm khi đối chiếu code thật (ưu tiên thấp)
- [ ] `CS0162 Unreachable code detected` (1 warning lúc `dotnet build`) — **KHÔNG phải bug**: là toggle test có chủ ý `const BatBuocDot = true` ở `DangKyHocPhanController` (lật `false` để mở đăng ký tự do khi test). Để nguyên.
- [ ] Bundle frontend **986 kB trong 1 chunk** (do `xlsx` nặng) — chỉ cảnh báo, không chặn build; lazy-load `xlsx` nếu muốn nhẹ hơn.
- [ ] CORS hardcode `http://localhost:5173` (`Program.cs`) — ổn cho demo, sẽ chặn origin khác khi deploy thật.
- ✅ **Đã loại (kiểm tra ra KHÔNG phải lỗi):** `EmbeddingModel` có default trong `NvidiaAiSettings.cs`; `frontend/.env` chỉ chứa `VITE_API_URL` công khai (không lộ secret — root `.env` chứa NVIDIA key thì *không* track); `AuthService` login đúng chuẩn (BCrypt + JWT claim role + check `TrangThai`).

## 🟣 AI Agentic — chatbot tự xếp lịch (tool-calling)
- [x] **Chatbot từ "từ chối xếp lịch" → agentic làm thật** (function-calling chuẩn SOTA). Cấp cho LLM tool `goi_y_lich_hoc`; khi SV nhờ xếp lịch, LLM tự trích ràng buộc + gọi tool → trả thời khoá biểu chi tiết (môn—lớp—GV—thứ/tiết), nhắc tự đăng ký. **Read-only** (không tự đăng ký — human-in-the-loop, an toàn). Verify: eval `agent-xep-lich` PASS + smoke-test 5 phương án đúng ràng buộc.
  - Hạ tầng: `IAiChatService.ChatStreamAsync(tools, executeTool)` — tool-loop trong stream, **giữ nguyên streaming** cho câu Q&A thường (TTFB ~2s), chỉ vòng tool khi LLM gọi.
- [x] **Tái dùng SẠCH (không hack)**: bộ xếp lịch đã có sẵn trong `DangKyHocPhanController` (~400 dòng). Ban đầu cho chatbot gọi qua **self-HTTP-call** (anti-pattern) → đã **tách `GoiYLichService` (Infrastructure)**, controller mỏng lại + delegate; chatbot gọi service **in-process**. Bỏ self-HTTP + hardcode loopback.
  - Logic trùng giờ → `Common/LichHoc`; quy tắc đăng ký dùng chung (đạt/cải thiện, đợt áp dụng, kỳ đạt) → `Common/DangKyRules` (`using static`) — **một nguồn sự thật**, hết trùng lặp & gọi chéo controller.
  - **Verify behavior-preserving**: golden-diff 3 endpoint đăng ký (`hoc-ky-mo`/`chuong-trinh`/`da-dang-ky`) **khớp byte-for-byte** trước/sau refactor; eval chatbot **20/20**.
- [x] **Agent học vụ đa-tool** (tham khảo `ToolRegistry` của NekoCore): tool dispatch registry (switch) + **3 tool read-only** — `goi_y_lich_hoc` (xếp lịch), `xem_lich_da_dang_ky` (lớp đã ĐK), `xem_chuong_trinh_ky_nay` (đã đạt + môn được học). Prompt ép dùng tool lấy số liệu thật (cấm hỏi ngược mã SV / bịa). Verify: 3 tool chọn đúng + eval `agent-*` PASS.

## 🟤 UX/UI chatbot (micro-UX)
- [x] **Render Markdown** (`react-markdown` + `remark-gfm` + `@tailwindcss/typography`): câu trả lời (gồm **bảng thời khoá biểu**, danh sách, in đậm) hiển thị đẹp thay vì literal `**...**`. *(Đây là lỗ hổng UX lộ nhất trước đây.)*
- [x] **Micro-UX**: nút **copy** (hover + check xác nhận) · **tạo lại** (regenerate câu hỏi gần nhất) · **xoá hội thoại** (header) · **typing indicator** 3 chấm nhún (thay spinner) · `aria-live`/`role=log`/`aria-label` (a11y) · bong bóng prose gọn.
- [x] **Code-split bundle**: `xlsx` (424KB, chỉ dùng ở 2 modal admin) chuyển **dynamic `import()`** → bundle chính **1.14MB → 722KB** (gzip 187KB), `xlsx` tách chunk chỉ tải khi admin import/xuất.
- [ ] (Truly optional) timestamp tin nhắn · audit mobile/responsive sâu · stream-to-markdown buffer.

---

## 📚 Tóm tắt: dự án này học được gì từ Neko Core & Claude Code?
| Chủ đề | Neko Core / Claude Code làm | Áp dụng cho dự án này |
|---|---|---|
| **CI bắt lỗi** | `ci.yml` chạy build+test, bắt bug local giấu | Thêm CI build BE+FE → chặn lỗi `TS6133` & tương lai |
| **Provider robustness** | retry + honor Retry-After + backoff cho 429/5xx | Thêm retry/backoff cho gọi NVIDIA (free tier hay 429) |
| **Reasoning model** | tách `<think>` khỏi câu trả lời | Kiểm tra/lọc reasoning trong content của gpt-oss-120b |
| **Đo lường (bench)** | `neko bench` pass@1/pass^3 đa-model | Bộ eval cho chatbot — đo chất lượng, so model |
| **Harness mỏng** | model lo việc nặng, harness đừng phình | Cache context DB; đừng dựng lại mỗi query |
| **Secrets** | key qua env, không commit, secret-scan | Đã làm tốt — giữ vậy, đổi JWT placeholder |
| **CLAUDE.md + docs layered** | root = pointer/gotcha, subdir = quy ước | Đã thêm `CLAUDE.md` + `backend/`+`frontend/` + `docs/` |
| **Chọn model bằng dữ liệu** | benchmark đa-model rồi mới chốt gpt-oss-120b | Dự án đã chọn đúng `gpt-oss-120b` (mạnh + free tier ổn) ✅ |

> Ngược lại, dự án này **cũng có cái Neko chưa có**: một sản phẩm full-stack thật (auth, CRUD nghiệp vụ, RAG trên dữ liệu thật) — minh hoạt rõ AI agentic *ứng dụng vào domain cụ thể*.
