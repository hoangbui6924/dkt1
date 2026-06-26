import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Bot, Copy, Check, RotateCcw, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { hoiChatbotStream, type NguonTraLoi } from '../services/chatbotService';
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
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copyMessage(i: number, text: string) {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500);
      })
      .catch(() => {});
  }

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

  // Gửi 1 câu hỏi, dựng ngữ cảnh từ `base` (cho phép regenerate dùng lịch sử đã cắt).
  async function sendQuestion(cauHoi: string, base: ChatMessage[]) {
    if (!cauHoi || loading) return;
    // Lịch sử = các lượt trước (bỏ lời chào tĩnh đầu tiên), gửi kèm để bot nhớ ngữ cảnh
    const lichSu = base
      .slice(1)
      .slice(-8)
      .map((m) => ({ vaiTro: m.role, noiDung: m.text }));
    setInput('');
    // base + lượt người dùng + 1 bong bóng bot rỗng để token stream điền dần vào.
    setMessages([...base, { role: 'user', text: cauHoi }, { role: 'bot', text: '' }]);
    setLoading(true);
    try {
      const nguon = await hoiChatbotStream(
        cauHoi,
        maMonHoc === '' ? null : Number(maMonHoc),
        lichSu,
        (delta) =>
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, text: last.text + delta };
            return copy;
          }),
      );
      // Gắn nguồn trích dẫn (nếu có) vào lượt bot vừa stream xong.
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], nguon };
        return copy;
      });
    } catch (err: any) {
      const msg = err?.message ?? 'Xin lỗi, mình chưa trả lời được lúc này. Vui lòng thử lại sau.';
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'bot', text: msg };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    sendQuestion(input.trim(), messages);
  }

  // Hỏi lại câu hỏi gần nhất (bỏ câu trả lời cũ) — micro-UX "tạo lại".
  function regenerate() {
    if (loading) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { idx = i; break; }
    }
    if (idx >= 0) sendQuestion(messages[idx].text, messages.slice(0, idx));
  }

  function clearChat() {
    if (!loading) setMessages([LOI_CHAO]);
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                disabled={loading || messages.length <= 1}
                aria-label="Xoá hội thoại"
                title="Hội thoại mới"
                className="rounded p-1 transition hover:bg-white/20 disabled:opacity-40"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded p-1 transition hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>
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
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="flex-1 space-y-3 overflow-y-auto p-3"
          >
            {messages.map((m, i) => {
              // Ẩn bong bóng bot rỗng (đang chờ token đầu) — đã có typing indicator thay thế.
              if (m.role === 'bot' && m.text === '') return null;
              return (
                <div key={i} className={`group flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-[14.5px] ${
                      m.role === 'user'
                        ? 'whitespace-pre-wrap rounded-br-sm bg-blue-600 text-white'
                        : 'rounded-bl-sm bg-gray-100 text-gray-800'
                    }`}
                  >
                    {m.role === 'user' ? (
                      m.text
                    ) : (
                      <div className="prose prose-sm max-w-none text-gray-800 prose-headings:my-1.5 prose-headings:text-[15px] prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-table:my-1.5 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-code:text-[13px] prose-pre:my-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                      </div>
                    )}
                    {m.nguon && m.nguon.length > 0 && (
                      <div className="mt-2 border-t border-gray-200 pt-1.5 text-xs text-gray-500">
                        Nguồn:{' '}
                        {Array.from(new Map(m.nguon.map((n) => [n.tenFile, n])).values())
                          .map((n) => `${n.tenFile} (tr.${n.trang})`)
                          .join(', ')}
                      </div>
                    )}
                    {m.role === 'bot' && m.text && (
                      <button
                        type="button"
                        onClick={() => copyMessage(i, m.text)}
                        aria-label="Sao chép câu trả lời"
                        title="Sao chép"
                        className="absolute -right-1.5 -top-1.5 rounded-full border border-gray-200 bg-white p-1 text-gray-400 opacity-0 shadow-sm transition hover:text-blue-600 focus:opacity-100 group-hover:opacity-100"
                      >
                        {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && messages[messages.length - 1]?.text === '' && (
              <div className="flex justify-start" aria-label="Trợ lý đang soạn câu trả lời">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Ô nhập */}
          <div className="flex items-end gap-2 border-t border-gray-200 p-3">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={regenerate}
                disabled={loading}
                aria-label="Tạo lại câu trả lời gần nhất"
                title="Tạo lại câu trả lời"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
            )}
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
