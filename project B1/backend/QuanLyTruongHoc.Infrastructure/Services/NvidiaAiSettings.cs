namespace QuanLyTruongHoc.Infrastructure.Services;

public class NvidiaAiSettings
{
    public string BaseUrl { get; set; } = "https://integrate.api.nvidia.com/v1";
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "openai/gpt-oss-120b";
    public string EmbeddingModel { get; set; } = "nvidia/nv-embedqa-e5-v5";
}
