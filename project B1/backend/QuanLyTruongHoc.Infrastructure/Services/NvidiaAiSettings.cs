namespace QuanLyTruongHoc.Infrastructure.Services;

public class NvidiaAiSettings
{
    public string BaseUrl { get; set; } = "https://integrate.api.nvidia.com/v1";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "openai/gpt-oss-120b";
    public string EmbeddingModel { get; set; } = "nvidia/nv-embedqa-e5-v5";

    // gpt-oss là reasoning model: "low" cắt mạnh thời gian suy nghĩ (đo thực tế 238->35 ký tự reasoning)
    // -> giảm độ trễ rõ rệt, hợp với chatbot tra cứu/tư vấn ngắn. Tăng lên "medium"/"high" nếu cần lập luận sâu.
    public string ReasoningEffort { get; set; } = "low";
}
