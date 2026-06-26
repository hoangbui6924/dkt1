namespace QuanLyTruongHoc.Application.Interfaces;

// Một lượt hội thoại. Role: "user" | "assistant"
public record ChatTurn(string Role, string Content);

// Định nghĩa một công cụ (function) mà mô hình có thể gọi. Parameters là JSON schema (object bất kỳ).
public record ChatToolDef(string Name, string Description, object Parameters);

// Hàm thực thi công cụ: nhận tên công cụ + tham số (JSON) -> trả kết quả dạng văn bản.
public delegate Task<string> ChatToolHandler(string name, string argumentsJson, CancellationToken ct);

public interface IAiChatService
{
    Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct = default);

    // Hội thoại nhiều lượt (giữ ngữ cảnh các tin nhắn trước)
    Task<string> ChatAsync(string systemPrompt, IReadOnlyList<ChatTurn> messages, CancellationToken ct = default);

    // Hội thoại có khả năng gọi công cụ (tool/function calling). Mô hình tự quyết định khi nào gọi công cụ;
    // service sẽ chạy vòng lặp: gọi mô hình -> thực thi công cụ -> đưa kết quả lại cho mô hình -> ... -> câu trả lời cuối.
    Task<string> ChatWithToolsAsync(
        string systemPrompt,
        IReadOnlyList<ChatTurn> messages,
        IReadOnlyList<ChatToolDef> tools,
        ChatToolHandler handler,
        CancellationToken ct = default);
}
