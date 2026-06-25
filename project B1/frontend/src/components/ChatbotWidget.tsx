import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react';
import { hoiChatbot, type NguonTraLoi } from '../services/chatbotService';
import { getTaiLieuSinhVien } from '../services/taiLieuService';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  nguon?: NguonTraLoi[];
}

interface MonOption {
  maMonHoc: number;
  tenMonHoc: string;
}

const LOI_CHAO: ChatMessage = {
  role: 'bot',
  text:
    'Xin chào! 👋 Mình là trợ lý ảo của trường. Mình có thể giúp bạn:\n' +
    '• Tra cứu nội quy, sổ tay sinh viên & nội dung môn học\n' +
    '• Tư vấn chọn giảng viên, đánh giá môn học khó/dễ dựa trên dữ liệu khoá trước\n' +
    '• Góp ý về cách học, kỹ năng cho sinh viên\n\n' +
    'Bạn đang băn khoăn điều gì nào?',
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([LOI_CHAO]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [monOptions, setMonOptions] = useState<MonOption[]>([]);
  const [maMonHoc, setMaMonHoc] = useState<number | ''>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lấy danh sách môn có giáo trình để cho phép hỏi theo môn cụ thể
    getTaiLieuSinhVien()
      .then((list) => {
        const map = new Map<number, string>();
        list
          .filter((t) => t.loaiTaiLieu === 'GiaoTrinh' && t.maMonHoc != null)
          .forEach((t) => map.set(t.maMonHoc!, t.tenMonHoc ?? `Môn ${t.maMonHoc}`));
        setMonOptions([...map.entries()].map(([maMonHoc, tenMonHoc]) => ({ maMonHoc, tenMonHoc })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  async function handleSend() {
    const cauHoi = input.trim();
    if (!cauHoi || loading) return;
    // Lịch sử = các lượt trước (bỏ lời chào tĩnh đầu tiên), gửi kèm để bot nhớ ngữ cảnh
    const lichSu = messages
      .slice(1)
      .slice(-8)
      .map((m) => ({ vaiTro: m.role, noiDung: m.text }));
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: cauHoi }]);
    setLoading(true);
    try {
      const res = await hoiChatbot(cauHoi, maMonHoc === '' ? null : Number(maMonHoc), lichSu);
      setMessages((m) => [...m, { role: 'bot', text: res.traLoi, nguon: res.nguon }]);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: 'bot', text: err?.response?.data?.message ?? 'Xin lỗi, mình chưa trả lời được lúc này. Vui lòng thử lại sau.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Bong bóng chat */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý ảo"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 hover:bg-blue-700"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      )}

      {/* Khung chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[80vh] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">Trợ lý ảo sinh viên</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="hover:opacity-80">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Chọn phạm vi môn học */}
          <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Hỏi về:</span>
            <select
              value={maMonHoc}
              onChange={(e) => setMaMonHoc(e.target.value === '' ? '' : Number(e.target.value))}
              className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm outline-none"
            >
              <option value="">Nội quy & sổ tay sinh viên</option>
              {monOptions.map((m) => (
                <option key={m.maMonHoc} value={m.maMonHoc}>
                  Môn: {m.tenMonHoc}
                </option>
              ))}
            </select>
          </div>

          {/* Tin nhắn */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[14.5px] ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-blue-600 text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.text}
                  {m.nguon && m.nguon.length > 0 && (
                    <div className="mt-2 border-t border-gray-200 pt-1.5 text-xs text-gray-500">
                      Nguồn:{' '}
                      {Array.from(new Map(m.nguon.map((n) => [n.tenFile, n])).values())
                        .map((n) => `${n.tenFile} (tr.${n.trang})`)
                        .join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm trong tài liệu...
                </div>
              </div>
            )}
          </div>

          {/* Ô nhập */}
          <div className="flex items-end gap-2 border-t border-gray-200 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Nhập câu hỏi của bạn..."
              className="max-h-28 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-[14.5px] outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
