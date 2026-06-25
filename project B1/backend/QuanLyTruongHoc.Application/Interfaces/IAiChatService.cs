namespace QuanLyTruongHoc.Application.Interfaces;

// Một lượt hội thoại. Role: "user" | "assistant"
public record ChatTurn(string Role, string Content);

public interface IAiChatService
{
    Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct = default);

    // Hội thoại nhiều lượt (giữ ngữ cảnh các tin nhắn trước)
    Task<string> ChatAsync(string systemPrompt, IReadOnlyList<ChatTurn> messages, CancellationToken ct = default);
}
