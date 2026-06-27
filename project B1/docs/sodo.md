# Sơ đồ kiến trúc hệ thống — QuanLyTruongHoc (VMU)

> Vẽ lại theo kiến trúc **thực tế đang triển khai** trong repo (xem [ARCHITECTURE.md](ARCHITECTURE.md)):
> **3 tầng (Frontend / Backend / Database) + tích hợp AI bên ngoài qua API**, không phải 4 lớp ngang hàng độc lập.

## 1. Sơ đồ tổng quan

```mermaid
flowchart TB
    subgraph CLIENT["Lớp Giao diện — Frontend"]
        FE["React 19 + Vite + TS<br/>(Admin UI · Sinh viên UI · ChatbotWidget)"]
    end

    subgraph SERVER["Lớp Xử lý nghiệp vụ — Backend (ASP.NET Core 8)"]
        API["Api — Controllers (mỏng)"]
        APP["Application — DTO / Interface / Rules"]
        DOM["Domain — Entities"]
        INFRA["Infrastructure — DbContext, Auth, AI Services"]
        API --> APP --> DOM
        INFRA -. hiện thực interface .-> APP
        API --> INFRA
    end

    subgraph DATA["Lớp Dữ liệu — PostgreSQL"]
        DB["Bảng quan hệ: KhoaVien, MonHoc, SinhVien,<br/>DangKyLopHoc, DiemHocPhan...<br/>+ TaiLieuChunk (cột Embedding dạng text)"]
    end

    subgraph AIEXT["Dịch vụ AI bên ngoài — NVIDIA NIM (OpenAI-compatible API)"]
        LLM["Chat: openai/gpt-oss-120b"]
        EMB["Embedding: nvidia/nv-embedqa-e5-v5"]
    end

    FE -- "HTTP/JSON + JWT (REST API)" --> API
    INFRA -- "EF Core" --> DB
    INFRA -- "HTTPS (chat completion)" --> LLM
    INFRA -- "HTTPS (embed query)" --> EMB
```

## 2. Luồng xử lý chatbot RAG (chi tiết)

```mermaid
sequenceDiagram
    participant SV as Sinh viên (Frontend)
    participant CTL as ChatbotController (Api)
    participant SVC as NvidiaAiChatService (Infrastructure)
    participant VEC as VectorMath (RAM cache)
    participant DB as PostgreSQL (TaiLieuChunk)
    participant NIM as NVIDIA NIM (LLM + Embedding)

    SV->>CTL: POST /api/chatbot/hoi {CauHoi, MaMonHoc?, LichSu?}
    CTL->>SVC: ChuanBiHoiThoaiAsync(...)
    SVC->>NIM: EmbedQueryAsync(CauHoi)
    NIM-->>SVC: vector embedding câu hỏi
    SVC->>VEC: cosine similarity với ChunkVec (cache RAM)
    VEC->>DB: (đã preload) TaiLieuChunk.Embedding
    SVC->>SVC: ghép ngữ cảnh DB (cơ cấu tổ chức, độ khó môn...)
    SVC->>NIM: chat completion (system prompt + context + câu hỏi)
    NIM-->>SVC: câu trả lời (token stream / JSON)
    SVC->>SVC: lọc nguồn trích dẫn (ngưỡng NguongHienNguon=0.46)
    SVC-->>CTL: câu trả lời + nguồn
    CTL-->>SV: response (JSON hoặc SSE stream)
```

## 3. Đối chiếu với mô tả "4 lớp"

| Mô tả 4 lớp (báo cáo) | Thực tế trong repo |
|---|---|
| Lớp Giao diện (Frontend) | ✅ Đúng — React gọi REST API qua `services/*` (axios), đính JWT |
| Lớp Xử lý nghiệp vụ (Backend) | ✅ Đúng — ASP.NET Core, layered Api→Application→Domain, Infrastructure hiện thực |
| Lớp Dữ liệu (quan hệ + vector riêng) | ⚠️ PostgreSQL chứa **cả hai trong cùng schema quan hệ** — không có vector DB tách biệt; cosine similarity tính trong RAM ở Backend, không phải trong DB |
| Lớp Trí tuệ nhân tạo (AI Engine riêng) | ⚠️ Không phải layer tự vận hành — là **dịch vụ ngoài** (NVIDIA NIM) được gọi từ tầng Infrastructure của Backend qua HTTPS |

**Kết luận**: nên trình bày là **"3 tầng + tích hợp AI ngoài"** thay vì 4 lớp ngang hàng, để khớp với cách hệ thống được triển khai thực tế.
