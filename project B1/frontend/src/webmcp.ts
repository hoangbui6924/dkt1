// WebMCP (W3C `navigator.modelContext`) — expose công cụ của B1 cho AI agent TRÌNH DUYỆT điều khiển luồng web.
//
// Forward-looking: API này mới có ở Chrome 149+ (origin trial, W3C Draft 02/2026). Ta FEATURE-DETECT nên trên
// trình duyệt chưa hỗ trợ thì hàm này là no-op, không ảnh hưởng gì. Khi có agent WebMCP, nó chạy TRONG phiên đăng
// nhập của chính sinh viên (cookie/JWT của trình duyệt) — agent thao tác với đúng quyền của user, không cần OAuth.
// Hành động GHI (đăng ký lớp) vẫn đi qua luồng đề xuất + xác nhận của chatbot (xem ChatbotWidget) -> human-in-loop.
//
// ponytail: chưa test được trong CI (cần Chrome 149) -> bọc try/catch + feature-detect, tuyệt đối không để vỡ app.
import { hoiChatbot } from './services/chatbotService';

// Map "tên trang" -> route sinh viên (khớp App.tsx).
const TRANG: Record<string, string> = {
  'dang-ky': '/student/dang-ky',
  'ket-qua-hoc-tap': '/student/ket-qua-hoc-tap',
  'tai-lieu': '/student/tai-lieu',
  'khung-chuong-trinh': '/student/khung-chuong-trinh',
};

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: unknown;
  execute: (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>;
}
type ModelContext = { registerTool?: (tool: WebMcpTool) => void };

export function dangKyWebMcpTools(): void {
  const mc = (navigator as unknown as { modelContext?: ModelContext }).modelContext;
  if (!mc?.registerTool) return; // trình duyệt chưa hỗ trợ WebMCP -> bỏ qua

  try {
    mc.registerTool({
      name: 'hoi_tro_ly_sinh_vien',
      description:
        'Hỏi trợ lý ảo của Trường ĐH Hàng hải VN (nội quy, sổ tay, môn học, chương trình, lịch, gợi ý đăng ký...) ' +
        'và nhận câu trả lời bằng văn bản.',
      inputSchema: {
        type: 'object',
        properties: { cau_hoi: { type: 'string', description: 'Câu hỏi của sinh viên' } },
        required: ['cau_hoi'],
      },
      async execute(args) {
        const res = await hoiChatbot(String(args.cau_hoi ?? ''), null, []);
        return { content: [{ type: 'text', text: res.traLoi }] };
      },
    });

    mc.registerTool({
      name: 'mo_trang_sinh_vien',
      description: 'Mở một trang chức năng cho sinh viên: đăng ký học phần, kết quả học tập, tài liệu, khung chương trình.',
      inputSchema: {
        type: 'object',
        properties: { trang: { type: 'string', enum: Object.keys(TRANG) } },
        required: ['trang'],
      },
      async execute(args) {
        const path = TRANG[String(args.trang ?? '')];
        if (!path) return { content: [{ type: 'text', text: 'Tên trang không hợp lệ.' }] };
        window.location.assign(path);
        return { content: [{ type: 'text', text: 'Đã mở ' + path }] };
      },
    });
  } catch {
    // API còn ở giai đoạn thử nghiệm, shape có thể đổi -> nuốt lỗi để không ảnh hưởng app.
  }
}
