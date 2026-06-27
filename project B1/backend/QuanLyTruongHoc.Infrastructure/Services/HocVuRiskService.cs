using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.ML;
using Microsoft.ML.Data;
using QuanLyTruongHoc.Application.Common;
using QuanLyTruongHoc.Application.Interfaces;
using QuanLyTruongHoc.Domain.Entities;
using QuanLyTruongHoc.Infrastructure.Persistence;

namespace QuanLyTruongHoc.Infrastructure.Services;

// Đánh giá rủi ro học vụ: huấn luyện 1 model ML.NET (logistic regression) trên TOÀN BỘ lượt-học đã có điểm
// trong hệ thống để dự báo xác suất trượt môn; khi chưa đủ dữ liệu (cold-start) thì dùng công thức
// thống kê thay thế (tỉ lệ đạt lịch sử của môn + GPA + có đang học lại + tải tín chỉ). Model cache 15'
// (giống pattern cache context DB ở ChatbotController), tự huấn luyện lại khi có thêm điểm.
public class HocVuRiskService : IHocVuRiskService
{
    private const int NguongDuLieuToiThieu = 30; // số lượt-học có nhãn tối thiểu để tin model ML
    private const string CacheKeyModel = "hocvu-risk:model";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IGoiYLichService _goiYLich;

    public HocVuRiskService(AppDbContext db, IMemoryCache cache, IGoiYLichService goiYLich)
    {
        _db = db;
        _cache = cache;
        _goiYLich = goiYLich;
    }

    private sealed class LuotHoc
    {
        public int MaSinhVien { get; set; }
        public int MaMonHoc { get; set; }
        public int SoTinChi { get; set; }
        public bool TuChon { get; set; }
        public int MaHocKy { get; set; }
        public DateOnly NgayBatDauKy { get; set; }
        public decimal DiemZ { get; set; }
    }

    private sealed class GpaKyDiem
    {
        public DateOnly NgayBatDau { get; set; }
        public decimal GpaKy { get; set; }
    }

    // Đặc trưng cho 1 lượt học 1 môn — dùng cả khi huấn luyện (có Truot) và khi suy luận (Truot bỏ qua).
    private sealed class RiskInput
    {
        public float SoTinChi { get; set; }
        public float LaTuChon { get; set; }
        public float LanHocThu { get; set; }
        public float GpaTruocKy { get; set; }
        public float TyLeDatLichSuMon { get; set; }
        public float TongTinChiDangKyKy { get; set; }
        public bool Truot { get; set; }
    }

    private sealed class RiskPrediction
    {
        [ColumnName("PredictedLabel")]
        public bool DuDoanTruot { get; set; }
        public float Probability { get; set; }
    }

    public async Task<string> TomTatRuiRoAsync(int maSinhVien)
    {
        var sv = await _db.SinhViens.FindAsync(maSinhVien);
        if (sv is null) return "Không tìm thấy thông tin sinh viên.";

        var lichSuToanTruong = await LayLichSuToanTruongAsync();
        var gpaTheoKy = TinhGpaTheoKy(lichSuToanTruong, maSinhVien);
        var coLichSuCaNhan = gpaTheoKy.Count > 0;

        var hocKyHienTai = await _goiYLich.ResolveHocKyHienTaiAsync(sv);
        var dangHoc = new List<DangKyLopHoc>();
        if (hocKyHienTai != null)
        {
            dangHoc = await _db.DangKyLopHocs
                .Include(d => d.LopHocTrongKy).ThenInclude(l => l!.MonHoc)
                .Where(d => d.MaSinhVien == maSinhVien && d.LopHocTrongKy!.MaHocKy == hocKyHienTai.MaHocKy)
                .ToListAsync();
        }

        if (!coLichSuCaNhan && dangHoc.Count == 0)
            return "Sinh viên chưa có lịch sử học tập và chưa đăng ký học phần nào trong kỳ này — chưa đủ dữ liệu để đánh giá rủi ro.";

        var (modelDaTrain, mlContext, duDieuKienHuanLuyen) = LayHoacHuanLuyenModel(lichSuToanTruong);
        PredictionEngine<RiskInput, RiskPrediction>? engine = null;
        if (duDieuKienHuanLuyen && modelDaTrain != null && mlContext != null)
            engine = mlContext.Model.CreatePredictionEngine<RiskInput, RiskPrediction>(modelDaTrain);

        var tyLeDatTheoMon = lichSuToanTruong
            .GroupBy(l => l.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.Count(x => x.DiemZ >= DiemQuyDoi.DiemDat) / (double)g.Count());
        var soLanHocByMon = lichSuToanTruong
            .Where(l => l.MaSinhVien == maSinhVien)
            .GroupBy(l => l.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.Count());

        var sb = new StringBuilder();

        // 1) Xu hướng GPA qua các kỳ đã hoàn tất
        if (coLichSuCaNhan)
        {
            sb.AppendLine($"GPA tích lũy hiện tại: {sv.GPATichLuy:0.00}/4.0 ({sv.TongTinChiTichLuy} tín chỉ đã đạt).");
            if (gpaTheoKy.Count >= 2)
            {
                var kyGanNhat = gpaTheoKy[^1];
                var kyTruoc = gpaTheoKy[^2];
                var doLech = kyGanNhat.GpaKy - kyTruoc.GpaKy;
                var xuHuong = doLech <= -0.5m ? "GIẢM RÕ RỆT" : doLech < 0 ? "giảm nhẹ" : doLech == 0 ? "giữ nguyên" : "tăng";
                sb.AppendLine($"Xu hướng: GPA kỳ gần nhất {kyGanNhat.GpaKy:0.00} so với kỳ trước {kyTruoc.GpaKy:0.00} → {xuHuong}.");
            }
        }
        else
        {
            sb.AppendLine("Sinh viên chưa có kỳ học nào hoàn tất với điểm (có thể là sinh viên mới).");
        }

        // 2) Đánh giá từng lớp đang học ở kỳ hiện tại (các lớp chưa có điểm)
        if (dangHoc.Count == 0)
        {
            sb.AppendLine("Hiện sinh viên chưa đăng ký học phần nào ở kỳ này nên chưa thể đánh giá rủi ro theo môn cụ thể.");
        }
        else
        {
            var tongTinChiKyNay = dangHoc.Sum(d => d.LopHocTrongKy!.MonHoc!.SoTinChi);
            var gpaThamChieu = coLichSuCaNhan ? (float)sv.GPATichLuy : 2.5f; // chưa có lịch sử cá nhân -> coi là trung tính

            sb.AppendLine($"Đang đăng ký {dangHoc.Count} học phần, tổng {tongTinChiKyNay} tín chỉ ở kỳ này.");

            var monNguyCo = new List<(string Ten, double XacSuat, string LyDo)>();
            foreach (var d in dangHoc)
            {
                var mon = d.LopHocTrongKy!.MonHoc!;
                var soLanHocTruoc = soLanHocByMon.GetValueOrDefault(mon.MaMonHoc, 0);
                var tyLeDat = tyLeDatTheoMon.GetValueOrDefault(mon.MaMonHoc, 0.75); // chưa có lịch sử môn -> giả định trung bình

                double xacSuatTruot;
                if (engine != null)
                {
                    var input = new RiskInput
                    {
                        SoTinChi = mon.SoTinChi,
                        LaTuChon = mon.LoaiMonHoc == "Tự chọn" ? 1 : 0,
                        LanHocThu = soLanHocTruoc + 1,
                        GpaTruocKy = gpaThamChieu,
                        TyLeDatLichSuMon = (float)tyLeDat,
                        TongTinChiDangKyKy = tongTinChiKyNay,
                    };
                    xacSuatTruot = engine.Predict(input).Probability;
                }
                else
                {
                    xacSuatTruot = DuDoanBangCongThuc(gpaThamChieu, tyLeDat, soLanHocTruoc + 1, tongTinChiKyNay);
                }

                var lyDo = new List<string>();
                if (soLanHocTruoc > 0) lyDo.Add("đang học lại");
                if (tyLeDat < 0.6) lyDo.Add($"môn có tỉ lệ sinh viên khác đạt thấp (~{tyLeDat * 100:0}%)");
                if (coLichSuCaNhan && sv.GPATichLuy < 2.0m) lyDo.Add("GPA tích lũy đang ở mức yếu");
                if (tongTinChiKyNay > 18) lyDo.Add("tải tín chỉ kỳ này khá nặng");

                if (xacSuatTruot >= 0.4)
                    monNguyCo.Add((mon.TenMonHoc, xacSuatTruot, lyDo.Count > 0 ? string.Join(", ", lyDo) : "điểm dự báo thấp so với mặt bằng chung"));
            }

            if (monNguyCo.Count == 0)
            {
                sb.AppendLine("Không có môn nào ở mức rủi ro đáng lo trong kỳ này.");
            }
            else
            {
                sb.AppendLine("Các môn đang có nguy cơ (xác suất trượt ước tính):");
                foreach (var m in monNguyCo.OrderByDescending(x => x.XacSuat))
                    sb.AppendLine($"- {m.Ten}: ~{m.XacSuat * 100:0}% nguy cơ — lý do: {m.LyDo}.");
            }

            sb.AppendLine("Gợi ý lộ trình khắc phục:");
            if (monNguyCo.Count > 0)
            {
                sb.AppendLine("- Ưu tiên ôn lại kiến thức nền và dành thêm thời gian cho các môn nguy cơ cao nêu trên.");
                sb.AppendLine("- Liên hệ giảng viên/cố vấn học tập để được hỗ trợ sớm, đừng để dồn đến cuối kỳ.");
                if (tongTinChiKyNay > 18)
                    sb.AppendLine("- Xem xét giảm tải tín chỉ ở các kỳ tiếp theo nếu kết quả không cải thiện.");
            }
            else
            {
                sb.AppendLine("- Duy trì nhịp học hiện tại, chưa thấy dấu hiệu rủi ro rõ rệt.");
            }
        }

        sb.AppendLine(engine != null
            ? "(Đánh giá dựa trên mô hình học máy huấn luyện từ lịch sử điểm toàn trường.)"
            : "(Chưa đủ dữ liệu lịch sử toàn trường để huấn luyện mô hình học máy — đang dùng công thức ước lượng thay thế, sẽ tự nâng cấp khi có thêm điểm.)");

        return sb.ToString();
    }

    private async Task<List<LuotHoc>> LayLichSuToanTruongAsync()
    {
        return await _db.DangKyLopHocs
            .Where(d => d.DiemHocPhan != null && d.DiemHocPhan.DiemZ != null)
            .Select(d => new LuotHoc
            {
                MaSinhVien = d.MaSinhVien,
                MaMonHoc = d.LopHocTrongKy!.MaMonHoc,
                SoTinChi = d.LopHocTrongKy.MonHoc!.SoTinChi,
                TuChon = d.LopHocTrongKy.MonHoc.LoaiMonHoc == "Tự chọn",
                MaHocKy = d.LopHocTrongKy.MaHocKy,
                NgayBatDauKy = d.LopHocTrongKy.HocKy!.NgayBatDau,
                DiemZ = d.DiemHocPhan!.DiemZ!.Value,
            })
            .ToListAsync();
    }

    // GPA của TỪNG kỳ (không phải tích lũy) cho 1 sinh viên, sắp theo thời gian — dùng để xem xu hướng.
    private static List<GpaKyDiem> TinhGpaTheoKy(List<LuotHoc> lichSuToanTruong, int maSinhVien)
    {
        var ketQua = new List<GpaKyDiem>();
        var cuaSv = lichSuToanTruong.Where(l => l.MaSinhVien == maSinhVien);
        foreach (var nhomKy in cuaSv.GroupBy(l => new { l.MaHocKy, l.NgayBatDauKy }).OrderBy(g => g.Key.NgayBatDauKy))
        {
            var monTotNhat = nhomKy.GroupBy(x => x.MaMonHoc).Select(g => g.OrderByDescending(x => x.DiemZ).First()).ToList();
            var dat = monTotNhat.Where(x => x.DiemZ >= DiemQuyDoi.DiemDat).ToList();
            var tinChi = dat.Sum(x => x.SoTinChi);
            decimal tongDiem = 0;
            foreach (var d in dat)
            {
                var (_, thang4) = DiemQuyDoi.TinhDiemChuVaThang4(d.DiemZ);
                tongDiem += thang4 * d.SoTinChi;
            }
            ketQua.Add(new GpaKyDiem { NgayBatDau = nhomKy.Key.NgayBatDauKy, GpaKy = tinChi > 0 ? Math.Round(tongDiem / tinChi, 2) : 0 });
        }
        return ketQua;
    }

    // Dựng tập huấn luyện: mỗi lượt-học (đã có điểm) của MỌI sinh viên thành 1 dòng đặc trưng + nhãn Truot.
    // GPA "trước kỳ" được tính bằng cách đi qua các kỳ của từng SV theo thứ tự thời gian và tích lũy dần
    // (đúng quy tắc: mỗi môn chỉ tính theo điểm cao nhất, chỉ môn đạt mới cộng vào tích lũy).
    private static List<RiskInput> XayDungTapHuanLuyen(List<LuotHoc> lichSuToanTruong)
    {
        var tyLeDatTheoMon = lichSuToanTruong
            .GroupBy(l => l.MaMonHoc)
            .ToDictionary(g => g.Key, g => g.Count(x => x.DiemZ >= DiemQuyDoi.DiemDat) / (double)g.Count());

        var tongTinChiTheoKy = lichSuToanTruong
            .GroupBy(l => (l.MaSinhVien, l.MaHocKy))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.SoTinChi));

        var ketQua = new List<RiskInput>();

        foreach (var nhomSv in lichSuToanTruong.GroupBy(l => l.MaSinhVien))
        {
            var cacKy = nhomSv.Select(l => new { l.MaHocKy, l.NgayBatDauKy }).Distinct().OrderBy(x => x.NgayBatDauKy).ToList();
            var tinChiTichLuy = 0;
            var diemTichLuy = 0m;
            var soLanHocMon = new Dictionary<int, int>();

            foreach (var ky in cacKy)
            {
                var gpaTruocKyNay = tinChiTichLuy > 0 ? diemTichLuy / tinChiTichLuy : 0m;
                var cacMonKyNay = nhomSv.Where(l => l.MaHocKy == ky.MaHocKy).ToList();
                var tongTinChiKy = tongTinChiTheoKy[(nhomSv.Key, ky.MaHocKy)];

                foreach (var luot in cacMonKyNay)
                {
                    var soLanTruoc = soLanHocMon.GetValueOrDefault(luot.MaMonHoc, 0);
                    ketQua.Add(new RiskInput
                    {
                        SoTinChi = luot.SoTinChi,
                        LaTuChon = luot.TuChon ? 1 : 0,
                        LanHocThu = soLanTruoc + 1,
                        GpaTruocKy = (float)gpaTruocKyNay,
                        TyLeDatLichSuMon = (float)tyLeDatTheoMon.GetValueOrDefault(luot.MaMonHoc, 0.75),
                        TongTinChiDangKyKy = tongTinChiKy,
                        Truot = luot.DiemZ < DiemQuyDoi.DiemDat,
                    });
                    soLanHocMon[luot.MaMonHoc] = soLanTruoc + 1;
                }

                var monTotNhatKyNay = cacMonKyNay.GroupBy(x => x.MaMonHoc).Select(g => g.OrderByDescending(x => x.DiemZ).First());
                foreach (var m in monTotNhatKyNay.Where(x => x.DiemZ >= DiemQuyDoi.DiemDat))
                {
                    var (_, thang4) = DiemQuyDoi.TinhDiemChuVaThang4(m.DiemZ);
                    tinChiTichLuy += m.SoTinChi;
                    diemTichLuy += thang4 * m.SoTinChi;
                }
            }
        }

        return ketQua;
    }

    // Huấn luyện (hoặc lấy từ cache) model ML.NET. Trả về null nếu chưa đủ dữ liệu — gọi nơi dùng sẽ fallback.
    private (ITransformer? Model, MLContext? Context, bool DuDieuKien) LayHoacHuanLuyenModel(List<LuotHoc> lichSuToanTruong)
    {
        if (lichSuToanTruong.Count < NguongDuLieuToiThieu) return (null, null, false);

        return _cache.GetOrCreate(CacheKeyModel, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;
            entry.Size = 1;
            var tapHuanLuyen = XayDungTapHuanLuyen(lichSuToanTruong);
            if (tapHuanLuyen.Count < NguongDuLieuToiThieu)
                return (Model: (ITransformer?)null, Context: (MLContext?)null, DuDieuKien: false);

            var mlContext = new MLContext(seed: 0);
            var data = mlContext.Data.LoadFromEnumerable(tapHuanLuyen);
            var pipeline = mlContext.Transforms
                .Concatenate("Features",
                    nameof(RiskInput.SoTinChi), nameof(RiskInput.LaTuChon), nameof(RiskInput.LanHocThu),
                    nameof(RiskInput.GpaTruocKy), nameof(RiskInput.TyLeDatLichSuMon), nameof(RiskInput.TongTinChiDangKyKy))
                .Append(mlContext.Transforms.NormalizeMinMax("Features"))
                .Append(mlContext.BinaryClassification.Trainers.SdcaLogisticRegression(
                    labelColumnName: nameof(RiskInput.Truot), featureColumnName: "Features"));

            var modelDaTrain = pipeline.Fit(data);
            return (Model: (ITransformer?)modelDaTrain, Context: mlContext, DuDieuKien: true);
        });
    }

    // Công thức thay thế khi chưa đủ dữ liệu để tin model ML — vẫn trả về 1 xác suất rủi ro trong [0,1].
    private static double DuDoanBangCongThuc(float gpaTruocKy, double tyLeDatLichSuMon, int lanHocThu, float tongTinChiKy)
    {
        var diem = 0.0;
        diem += (1 - tyLeDatLichSuMon) * 0.45;
        diem += gpaTruocKy < 2.0f ? 0.30 : gpaTruocKy < 2.8f ? 0.15 : 0;
        diem += lanHocThu > 1 ? 0.20 : 0;
        diem += tongTinChiKy > 18 ? 0.10 : 0;
        return Math.Clamp(diem, 0, 1);
    }
}
