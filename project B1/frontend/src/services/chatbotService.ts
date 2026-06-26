import api from './api';

export interface NguonTraLoi {
  maTaiLieu: number;
  tenFile: string;
  trang: number;
}

export interface ChatbotResponse {
  traLoi: string;
  nguon: NguonTraLoi[];
}

export interface ChatLichSuItem {
  vaiTro: 'user' | 'bot';
  noiDung: string;
}

// Hành động GHI mà chatbot đề xuất (chưa thực thi). FE xác nhận (human-in-loop) hoặc tự chạy theo chế độ.
export interface HanhDongCho {
  loai: string; // hiện có: "dang_ky_lop_hoc"
  maLopHocKy: number;
  moTa: string;
}

export interface ChatbotStreamKetQua {
  nguon: NguonTraLoi[];
  hanhDong: HanhDongCho | null;
}

export async function hoiChatbot(
  cauHoi: string,
  maMonHoc: number | null,
  lichSu: ChatLichSuItem[],
): Promise<ChatbotResponse> {
  const res = await api.post<ChatbotResponse>('/chatbot/hoi', { cauHoi, maMonHoc, lichSu });
  return res.data;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// Streaming (SSE): gọi /chatbot/hoi-stream, gọi onDelta cho mỗi mảnh trả lời ngay khi tới,
// trả về danh sách nguồn khi luồng kết thúc. Dùng fetch vì axios không stream được trong trình duyệt.
export async function hoiChatbotStream(
  cauHoi: string,
  maMonHoc: number | null,
  lichSu: ChatLichSuItem[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<ChatbotStreamKetQua> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/chatbot/hoi-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ cauHoi, maMonHoc, lichSu }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = 'Xin lỗi, mình chưa trả lời được lúc này. Vui lòng thử lại sau.';
    try {
      const err = await res.json();
      if (err?.message) message = err.message;
    } catch {
      // body không phải JSON -> giữ thông báo mặc định
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let nguon: NguonTraLoi[] = [];
  let hanhDong: HanhDongCho | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Mỗi sự kiện SSE phân tách bằng dòng trống; phần dư cuối giữ lại cho lần đọc sau.
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      const payload = JSON.parse(data) as {
        delta?: string;
        done?: boolean;
        nguon?: NguonTraLoi[];
        hanhDong?: HanhDongCho | null;
      };
      if (payload.delta) onDelta(payload.delta);
      if (payload.done) {
        nguon = payload.nguon ?? [];
        hanhDong = payload.hanhDong ?? null;
      }
    }
  }

  return { nguon, hanhDong };
}
