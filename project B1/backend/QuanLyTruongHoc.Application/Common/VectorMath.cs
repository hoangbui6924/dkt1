using System.Globalization;

namespace QuanLyTruongHoc.Application.Common;

public static class VectorMath
{
    public static string Serialize(float[] vec) =>
        string.Join(",", vec.Select(v => v.ToString("R", CultureInfo.InvariantCulture)));

    public static float[] Parse(string s)
    {
        if (string.IsNullOrEmpty(s)) return Array.Empty<float>();
        var parts = s.Split(',', StringSplitOptions.RemoveEmptyEntries);
        var vec = new float[parts.Length];
        for (var i = 0; i < parts.Length; i++)
            vec[i] = float.Parse(parts[i], CultureInfo.InvariantCulture);
        return vec;
    }

    // Độ tương đồng cosine giữa hai vector (cùng số chiều)
    public static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length == 0 || b.Length != a.Length) return 0;
        double dot = 0, na = 0, nb = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return 0;
        return dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }
}
