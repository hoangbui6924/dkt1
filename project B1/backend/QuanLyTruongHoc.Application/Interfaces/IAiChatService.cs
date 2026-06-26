namespace QuanLyTruongHoc.Application.Interfaces;

// Một lượt hội thoại. Role: "user" | "assistant"
public record ChatTurn(string Role, string Content);

// Định nghĩa 1 công cụ (function) cho LLM gọi (agentic). ThamSo = JSON schema của tham số.
public record ChatTool(string Name, string MoTa, object ThamSo);

public interface IAiChatService
{
    Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct = default);

    // Hội thoại nhiều lượt (giữ ngữ cảnh các tin nhắn trước)
    Task<string> ChatAsync(string systemPrompt, IReadOnlyList<ChatTurn> messages, CancellationToken ct = default);

    // Streaming + tool-calling (agentic): trả từng mảnh nội dung khi mô hình sinh ra.
    // tools rỗng = chat thường. Nếu mô hình gọi tool -> chạy executeTool(tenTool, thamSoJson) rồi tổng hợp.
    IAsyncEnumerable<string> ChatStreamAsync(
        string systemPrompt, IReadOnlyList<ChatTurn> messages,
        IReadOnlyList<ChatTool> tools, Func<string, string, Task<string>> executeTool,
        CancellationToken ct = default);
}
