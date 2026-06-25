namespace QuanLyTruongHoc.Application.Interfaces;

public interface IEmbeddingService
{
    // Nhúng nhiều đoạn văn bản tài liệu (input_type = passage)
    Task<List<float[]>> EmbedPassagesAsync(IReadOnlyList<string> texts, CancellationToken ct = default);

    // Nhúng câu hỏi của người dùng (input_type = query)
    Task<float[]> EmbedQueryAsync(string text, CancellationToken ct = default);
}
