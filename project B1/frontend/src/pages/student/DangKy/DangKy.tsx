import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, CalendarPlus, RefreshCw, Trash2, Info, X, Sparkles, AlertTriangle } from 'lucide-react';
import {
  type HocKyDangKy,
  type LopDaDangKy,
  type ChuongTrinhDangKy,
  type MonHocChuongTrinh,
  type LopCuaMon,
  type BuoiHoc,
  type GoiYThoiKhoaBieuResult,
  getHocKyMo,
  getDaDangKy,
  getChuongTrinh,
  getLopCuaMon,
  dangKyLop,
  huyDangKy,
  doiLop,
  goiYThoiKhoaBieu,
} from '../../../services/dangKyHocPhanService';
import Modal from '../../../components/Modal';
import ThoiKhoaBieuGrid from '../../../components/ThoiKhoaBieuGrid';

const THU_LABEL: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

function formatNgay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function dsTiet(bd: number, kt: number): string {
  const arr: number[] = [];
  for (let t = bd; t <= kt; t++) arr.push(t);
  return arr.join(', ');
}

function BuoiHocList({ buoiHocs }: { buoiHocs: BuoiHoc[] }) {
  if (buoiHocs.length === 0) return <span className="text-gray-400">Chưa có lịch</span>;
  return (
    <>
      {buoiHocs.map((b, i) => (
        <div key={i} className="mb-1.5 last:mb-0">
          <div className="text-sm text-gray-400">
            Từ ngày {formatNgay(b.ngayBatDau)} đến ngày {formatNgay(b.ngayKetThuc)}
          </div>
          <div>
            {THU_LABEL[b.thu] ?? `Thứ ${b.thu}`} - Tiết {dsTiet(b.tietBatDau, b.tietKetThuc)}
            {b.phongHoc ? (
              <>
                {' - '}
                <span className="text-blue-600">{b.phongHoc}</span>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </>
  );
}

export default function StudentDangKyPage() {
  const [hocKy, setHocKy] = useState<HocKyDangKy | null>(null);
  const [daDangKy, setDaDangKy] = useState<LopDaDangKy[]>([]);
  const [chuongTrinh, setChuongTrinh] = useState<ChuongTrinhDangKy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [hienThiToanBo, setHienThiToanBo] = useState(false);
  const [fTienDo, setFTienDo] = useState(true);
  const [fKhongDat, setFKhongDat] = useState(false);
  const [fCaiThien, setFCaiThien] = useState(false);
  const [fHocKy, setFHocKy] = useState<number | null>(null);

  // class-selection modal
  const [modalMon, setModalMon] = useState<MonHocChuongTrinh | null>(null);
  const [lopCuaMon, setLopCuaMon] = useState<LopCuaMon[]>([]);
  const [loadingLop, setLoadingLop] = useState(false);
  const [locTrungLich, setLocTrungLich] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);

  // trợ lý AI gợi ý thời khoá biểu
  const [showAi, setShowAi] = useState(false);
  const [aiYeuCau, setAiYeuCau] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<GoiYThoiKhoaBieuResult[] | null>(null);
  const [aiChonPhuongAn, setAiChonPhuongAn] = useState(0);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const hk = await getHocKyMo();
      setHocKy(hk);
      if (hk) {
        const [dk, ct] = await Promise.all([getDaDangKy(hk.maHocKy), getChuongTrinh(hk.maHocKy)]);
        setDaDangKy(dk);
        setChuongTrinh(ct);
      }
    } catch {
      setError('Không thể tải dữ liệu đăng ký học phần');
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    if (!hocKy) return;
    const [dk, ct] = await Promise.all([getDaDangKy(hocKy.maHocKy), getChuongTrinh(hocKy.maHocKy)]);
    setDaDangKy(dk);
    setChuongTrinh(ct);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const tongTinChi = daDangKy.reduce((s, l) => s + l.soTinChi, 0);

  const loaiMonHocMap = useMemo(() => {
    const map = new Map<number, string>();
    chuongTrinh?.monHocs.forEach((m) => map.set(m.maMonHoc, m.loaiMonHoc));
    return map;
  }, [chuongTrinh]);

  const daDangKySapXep = useMemo(
    () =>
      [...daDangKy].sort((a, b) => {
        const aTuChon = Number(loaiMonHocMap.get(a.maMonHoc) === 'Tự chọn');
        const bTuChon = Number(loaiMonHocMap.get(b.maMonHoc) === 'Tự chọn');
        return aTuChon - bTuChon;
      }),
    [daDangKy, loaiMonHocMap],
  );

  const monHienThi = useMemo(() => {
    if (!chuongTrinh) return [];
    if (hienThiToanBo) return chuongTrinh.monHocs;
    return chuongTrinh.monHocs.filter((m) => {
      if (fTienDo && m.kyHoc === chuongTrinh.kyDat) return true;
      if (fKhongDat && m.trangThai === 'KhongDat') return true;
      if (fCaiThien && m.caiThien) return true;
      if (fHocKy != null && m.kyHoc === fHocKy) return true;
      return false;
    });
  }, [chuongTrinh, hienThiToanBo, fTienDo, fKhongDat, fCaiThien, fHocKy]);

  const monTheoKy = useMemo(() => {
    const map = new Map<number, MonHocChuongTrinh[]>();
    monHienThi.forEach((m) => {
      const list = map.get(m.kyHoc) ?? [];
      list.push(m);
      map.set(m.kyHoc, list);
    });
    // Môn bắt buộc xếp lên trên, môn tự chọn xuống dưới trong từng học kỳ.
    for (const list of map.values()) {
      list.sort((a, b) => Number(a.loaiMonHoc === 'Tự chọn') - Number(b.loaiMonHoc === 'Tự chọn'));
    }
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
  }, [monHienThi]);

  async function openLopModal(mon: MonHocChuongTrinh) {
    if (!hocKy) return;
    setModalMon(mon);
    setLocTrungLich(true);
    setLoadingLop(true);
    setLopCuaMon([]);
    try {
      const lops = await getLopCuaMon(hocKy.maHocKy, mon.maMonHoc);
      setLopCuaMon(lops);
    } catch {
      setLopCuaMon([]);
    } finally {
      setLoadingLop(false);
    }
  }

  async function handleDangKy(maLopHocKy: number) {
    setDangXuLy(true);
    try {
      await dangKyLop(maLopHocKy);
      setModalMon(null);
      await refreshData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể đăng ký lớp này');
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleDoiLop(maDangKy: number, maLopHocKyMoi: number) {
    setDangXuLy(true);
    try {
      await doiLop(maDangKy, maLopHocKyMoi);
      setModalMon(null);
      await refreshData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể đổi sang lớp này');
    } finally {
      setDangXuLy(false);
    }
  }

  async function handleHuy(item: LopDaDangKy) {
    if (!window.confirm(`Huỷ đăng ký lớp "${item.tenMonHoc} (${item.tenLop})"?`)) return;
    try {
      await huyDangKy(item.maDangKy);
      await refreshData();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể huỷ đăng ký lớp này');
    }
  }

  function openAiModal() {
    setShowAi(true);
    setAiYeuCau('');
    setAiResults(null);
    setAiChonPhuongAn(0);
    setAiError('');
  }

  async function handleGoiYAi() {
    if (!aiYeuCau.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResults(null);
    setAiChonPhuongAn(0);
    try {
      const results = await goiYThoiKhoaBieu(aiYeuCau);
      setAiResults(results);
    } catch (err: any) {
      setAiError(err?.response?.data?.message ?? 'Không thể tạo gợi ý lúc này, vui lòng thử lại');
    } finally {
      setAiLoading(false);
    }
  }

  const lopHienThiTrongModal = useMemo(
    () => (locTrungLich ? lopCuaMon.filter((l) => !l.trungLich || l.laLopHienTai) : lopCuaMon),
    [lopCuaMon, locTrungLich],
  );

  const modalMonDaDangKy = modalMon ? daDangKy.find((d) => d.maMonHoc === modalMon.maMonHoc) : undefined;

  function badgeTrangThai(m: MonHocChuongTrinh) {
    if (m.trangThai === 'DangHoc')
      return <span className="rounded-full bg-blue-100 px-2.5 py-1 text-sm font-semibold text-blue-700">Đã đăng ký</span>;
    if (m.trangThai === 'DaDat')
      return m.caiThien ? (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700">
          Đã đạt (cải thiện)
        </span>
      ) : (
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-sm font-semibold text-green-700">Đã đạt</span>
      );
    if (m.trangThai === 'KhongDat')
      return <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-semibold text-red-700">Không đạt</span>;
    if (m.khongDuDieuKien)
      return <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-semibold text-red-700">Không đủ ĐK</span>;
    return null;
  }

  function nutDangKy(m: MonHocChuongTrinh) {
    if (m.daDangKyKyNay)
      return (
        <button
          type="button"
          onClick={() => openLopModal(m)}
          className="flex items-center gap-1.5 rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          <RefreshCw className="h-4 w-4" /> Đổi lịch
        </button>
      );
    if (m.coTheDangKy) {
      const green = m.caiThien;
      return (
        <button
          type="button"
          onClick={() => openLopModal(m)}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-white ${
            green ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <CalendarPlus className="h-4 w-4" /> {green ? 'Đăng ký cải thiện' : 'Đăng ký'}
        </button>
      );
    }
    if (m.chuaToiKy)
      return (
        <span className="cursor-not-allowed rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-400">
          Không thể đăng ký
        </span>
      );
    if (!m.coLop)
      return (
        <span
          title="Chưa có lớp mở trong kỳ này"
          className="cursor-not-allowed rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-400"
        >
          Chưa có lớp
        </span>
      );
    return null;
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!hocKy)
    return (
      <div className="p-10 text-center text-gray-400">
        Hiện chưa có học kỳ nào được mở đăng ký. Vui lòng quay lại sau.
      </div>
    );

  return (
    <div className="w-full space-y-6 p-6 text-[15px] xl:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Đăng ký học phần</h1>
            <p className="text-base text-gray-500">
              {hocKy.tenNamHoc} · {hocKy.tenHocKy} ({hocKy.loaiHocKy})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAiModal}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-[15px] font-medium text-white hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" /> Trợ lý AI gợi ý lịch học
        </button>
      </div>

      {/* Banner hạn đăng ký */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 text-[15px] ${
          hocKy.dangMoDangKy
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="space-y-0.5">
          <p>
            {hocKy.tenDotHienTai ? (
              <>
                Đợt áp dụng: <strong>{hocKy.tenDotHienTai}</strong>
              </>
            ) : (
              'Hiện chưa có đợt đăng ký nào áp dụng cho bạn ở học kỳ này'
            )}
          </p>
          <p>
            Đăng ký mới: {hocKy.dangMoDangKy ? 'đang mở' : 'đang đóng'} · Rút đăng ký:{' '}
            {hocKy.dangMoRut ? 'đang mở' : 'đang đóng'}
          </p>
        </div>
      </div>

      {/* Panel: kết quả đăng ký */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
          <span className="text-lg font-semibold text-gray-700">Kết quả đăng ký học phần</span>
          <span className="text-[15px] text-gray-600">
            Đã đăng ký: <strong className="text-blue-600">{daDangKy.length}</strong> học phần ·{' '}
            <strong className="text-blue-600">{tongTinChi}</strong> tín chỉ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[15px]">
            <thead>
              <tr className="bg-blue-50 text-left text-sm font-semibold uppercase tracking-wide text-gray-600">
                <th className="px-4 py-3">Lớp học phần</th>
                <th className="w-16 px-4 py-3">TC</th>
                <th className="w-80 px-4 py-3">Thời gian & Địa điểm</th>
                <th className="w-44 px-4 py-3">Giảng viên</th>
                <th className="w-24 px-4 py-3">Đã ĐK</th>
                <th className="w-32 px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {daDangKy.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Chưa đăng ký học phần nào
                  </td>
                </tr>
              )}
              {daDangKySapXep.map((l) => (
                <tr key={l.maDangKy} className="hover:bg-gray-50/60">
                  <td
                    className={`px-4 py-3 font-medium ${
                      loaiMonHocMap.get(l.maMonHoc) === 'Tự chọn' ? 'text-amber-600' : 'text-gray-900'
                    }`}
                  >
                    {l.tenMonHoc} ({l.tenLop})
                    <span className="ml-1.5 text-sm text-gray-400">· {l.loaiHinh}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.soTinChi}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <BuoiHocList buoiHocs={l.buoiHocs} />
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.tenGiangVien ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {l.soLuongDaDangKy}/{l.siSoToiDa}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleHuy(l)}
                      className="inline-flex items-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" /> Huỷ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters + chương trình */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_1fr]">
        <div className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-gray-800">Bộ lọc</h3>
          <div className="space-y-2.5 text-[15px]">
            <label className="flex items-center gap-2.5">
              <input className="h-4 w-4" type="checkbox" checked={fTienDo} onChange={(e) => setFTienDo(e.target.checked)} />
              Học phần theo tiến độ (kỳ {chuongTrinh?.kyDat})
            </label>
            <label className="flex items-center gap-2.5">
              <input className="h-4 w-4" type="checkbox" checked={fKhongDat} onChange={(e) => setFKhongDat(e.target.checked)} />
              Học phần không đạt
            </label>
            <label className="flex items-center gap-2.5">
              <input className="h-4 w-4" type="checkbox" checked={fCaiThien} onChange={(e) => setFCaiThien(e.target.checked)} />
              Học phần cải thiện điểm
            </label>
          </div>

          <h3 className="mb-2.5 mt-5 text-base font-semibold text-gray-800">Theo học kỳ</h3>
          <div className="grid grid-cols-2 gap-2 text-[15px]">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  className="h-4 w-4"
                  type="radio"
                  name="filterHocKy"
                  checked={fHocKy === k}
                  onChange={() => {
                    setFHocKy(k);
                    setHienThiToanBo(false);
                  }}
                />
                Học kỳ {k}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setHienThiToanBo((v) => !v);
              setFHocKy(null);
            }}
            className={`mt-5 w-full rounded-md px-4 py-2.5 text-[15px] font-medium ${
              hienThiToanBo ? 'bg-gray-200 text-gray-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {hienThiToanBo ? 'Tắt hiển thị toàn bộ' : 'Hiển thị toàn bộ'}
          </button>
          <p className="mt-2 text-sm text-gray-400">Năm thứ {chuongTrinh?.namThu}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4 text-lg font-semibold text-gray-700">
            Chương trình đào tạo
          </div>
          <div className="p-3">
            {monTheoKy.size === 0 && (
              <p className="px-2 py-10 text-center text-[15px] text-gray-400">
                Không có học phần phù hợp. Hãy chọn bộ lọc hoặc bấm "Hiển thị toàn bộ".
              </p>
            )}
            {[...monTheoKy.entries()].map(([ky, mons]) => (
              <div key={ky} className="mb-4">
                <div className="px-3 py-2 text-[15px] font-bold text-blue-700">HỌC KỲ {ky}</div>
                <table className="min-w-full text-[15px]">
                  <tbody className="divide-y divide-gray-100">
                    {mons.map((m) => (
                      <tr key={m.maMonHoc} className="hover:bg-gray-50/60">
                        <td
                          className={`px-3 py-2.5 align-middle font-medium ${
                            m.loaiMonHoc === 'Tự chọn' ? 'text-amber-600' : 'text-gray-900'
                          }`}
                        >
                          {m.tenMonHoc}
                        </td>
                        <td className="w-12 px-3 py-2.5 text-center align-middle text-gray-700">{m.soTinChi}</td>
                        <td className="w-48 px-3 py-2.5 align-middle">{badgeTrangThai(m)}</td>
                        <td className="w-44 px-3 py-2.5 text-right align-middle">{nutDangKy(m)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal chọn lớp */}
      {modalMon && (
        <Modal
          title={`${modalMon.maMonHoc} - ${modalMon.tenMonHoc}`}
          onClose={() => setModalMon(null)}
          maxWidthClassName="max-w-[760px]"
        >
          {modalMonDaDangKy && (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Bạn đang đăng ký lớp <strong>{modalMonDaDangKy.tenLop}</strong>. Chọn một lớp khác bên dưới để đổi sang
              lớp đó (lớp cũ sẽ được thay thế).
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={locTrungLich} onChange={(e) => setLocTrungLich(e.target.checked)} />
              Lọc bỏ lớp trùng thời gian với lớp đã đăng ký
            </label>
            <span className="text-xs text-gray-400">{lopHienThiTrongModal.length} lớp</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-600">
                  <th className="px-3 py-2">Lớp</th>
                  <th className="w-72 px-3 py-2">Thời gian & Địa điểm</th>
                  <th className="w-40 px-3 py-2">Giảng viên</th>
                  <th className="w-20 px-3 py-2">Đã ĐK</th>
                  <th className="w-28 px-3 py-2 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingLop && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Đang tải lớp học...
                    </td>
                  </tr>
                )}
                {!loadingLop && lopHienThiTrongModal.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      {lopCuaMon.length === 0
                        ? 'Môn này chưa có lớp nào trong học kỳ.'
                        : 'Tất cả lớp đều trùng lịch với lớp bạn đã đăng ký. Bỏ tích lọc để xem toàn bộ.'}
                    </td>
                  </tr>
                )}
                {!loadingLop &&
                  lopHienThiTrongModal.map((l) => (
                    <tr key={l.maLopHocKy} className={l.laLopHienTai ? 'bg-blue-50/40' : l.trungLich ? 'bg-red-50/40' : ''}>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {modalMon.tenMonHoc} ({l.tenLop})
                        <span className="ml-1 text-xs text-gray-400">· {l.loaiHinh}</span>
                        {l.trungLich && <div className="text-xs text-red-500">Trùng lịch đã đăng ký</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <BuoiHocList buoiHocs={l.buoiHocs} />
                      </td>
                      <td className="px-3 py-2 text-gray-700">{l.tenGiangVien ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        <span className={l.daDay ? 'text-red-500' : 'text-blue-600'}>{l.soLuongDaDangKy}</span>/
                        {l.siSoToiDa}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {l.laLopHienTai ? (
                          <span className="inline-flex items-center rounded bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Lớp hiện tại
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={l.daDay || dangXuLy}
                            onClick={() =>
                              modalMonDaDangKy
                                ? handleDoiLop(modalMonDaDangKy.maDangKy, l.maLopHocKy)
                                : handleDangKy(l.maLopHocKy)
                            }
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            title={l.daDay ? 'Lớp đã đầy' : ''}
                          >
                            <CalendarPlus className="h-3.5 w-3.5" /> {modalMonDaDangKy ? 'Đổi sang lớp này' : 'Đăng ký'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setModalMon(null)}
              className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" /> Đóng
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Trợ lý AI gợi ý thời khoá biểu */}
      {showAi && (
        <Modal
          title="Trợ lý AI gợi ý lịch học"
          onClose={() => setShowAi(false)}
          maxWidthClassName="max-w-[920px]"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Mô tả yêu cầu của bạn (ưu tiên giảng viên/lớp, buổi học, ngày muốn tránh, môn tự chọn, môn học lại...)
            </label>
            <textarea
              value={aiYeuCau}
              onChange={(e) => setAiYeuCau(e.target.value)}
              rows={4}
              placeholder='VD: "ưu tiên buổi sáng, không học thứ 7"'
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={aiLoading || !aiYeuCau.trim()}
                onClick={handleGoiYAi}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" /> {aiLoading ? 'Đang tạo gợi ý...' : 'Tạo gợi ý lịch học'}
              </button>
            </div>
          </div>

          {aiError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiResults && aiResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {aiResults.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {aiResults.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAiChonPhuongAn(i)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        i === aiChonPhuongAn
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Phương án {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <ThoiKhoaBieuGrid monHocs={aiResults[aiChonPhuongAn].monHocs} />

              {aiResults[aiChonPhuongAn].ghiChu.length > 0 && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  {aiResults[aiChonPhuongAn].ghiChu.map((g, i) => (
                    <div key={i}>• {g}</div>
                  ))}
                </div>
              )}

              {aiResults[aiChonPhuongAn].monKhongXepDuoc.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <div className="mb-1 font-semibold">Một số môn chưa thể xếp được:</div>
                  {aiResults[aiChonPhuongAn].monKhongXepDuoc.map((m, i) => (
                    <div key={i}>
                      • {m.tenMonHoc}: {m.lyDo}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Đây là gợi ý để bạn tham khảo, chưa đăng ký chính thức. Vui lòng tự đăng ký các lớp phù hợp ở mục
                  "Chương trình đào tạo" bên trên.
                </span>
                <button
                  type="button"
                  onClick={() => setAiResults(null)}
                  className="flex-shrink-0 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Thử yêu cầu khác
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
