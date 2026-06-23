import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react';
import {
  type KhungChuongTrinh,
  type MonHocTrongKhung,
  getKhungChuongTrinh,
  getMonHocsTrongKhung,
  addMonHocVaoKhung,
  updateKyHoc,
  removeMonHocKhoiKhung,
} from '../../../services/khungChuongTrinhService';
import { type MonHoc, getMonHocs } from '../../../services/monHocService';
import { type BoMon, getBoMons } from '../../../services/boMonService';
import { type KhoaVien, getKhoaViens } from '../../../services/khoaVienService';
import Modal from '../../../components/Modal';

const MIN_KY_HOC_COLUMNS = 8;

export default function KhungChuongTrinhDetailPage() {
  const { id } = useParams<{ id: string }>();
  const maKhungChuongTrinh = Number(id);
  const navigate = useNavigate();

  const [khung, setKhung] = useState<KhungChuongTrinh | null>(null);
  const [monHocsTrongKhung, setMonHocsTrongKhung] = useState<MonHocTrongKhung[]>([]);
  const [allMonHocs, setAllMonHocs] = useState<MonHoc[]>([]);
  const [boMons, setBoMons] = useState<BoMon[]>([]);
  const [khoaViens, setKhoaViens] = useState<KhoaVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKyHoc, setModalKyHoc] = useState(1);
  const [filterKhoaVien, setFilterKhoaVien] = useState<number | ''>('');
  const [filterBoMon, setFilterBoMon] = useState<number | ''>('');
  const [selectedMonHoc, setSelectedMonHoc] = useState<number | ''>('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [khungData, monHocsKhungData, monHocData, boMonData, khoaVienData] = await Promise.all([
        getKhungChuongTrinh(maKhungChuongTrinh),
        getMonHocsTrongKhung(maKhungChuongTrinh),
        getMonHocs(),
        getBoMons(),
        getKhoaViens(),
      ]);
      setKhung(khungData);
      setMonHocsTrongKhung(monHocsKhungData);
      setAllMonHocs(monHocData);
      setBoMons(boMonData);
      setKhoaViens(khoaVienData);
    } catch {
      setError('Không thể tải dữ liệu khung chương trình');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maKhungChuongTrinh]);

  const soKyHoc = useMemo(() => {
    const maxKy = monHocsTrongKhung.reduce((max, m) => Math.max(max, m.kyHoc), 0);
    return Math.max(MIN_KY_HOC_COLUMNS, maxKy);
  }, [monHocsTrongKhung]);

  const monHocTheoKy = useMemo(() => {
    const map = new Map<number, MonHocTrongKhung[]>();
    for (let ky = 1; ky <= soKyHoc; ky++) map.set(ky, []);
    monHocsTrongKhung.forEach((m) => {
      const list = map.get(m.kyHoc) ?? [];
      list.push(m);
      map.set(m.kyHoc, list);
    });
    return map;
  }, [monHocsTrongKhung, soKyHoc]);

  const idsDaTrongKhung = useMemo(() => new Set(monHocsTrongKhung.map((m) => m.maMonHoc)), [monHocsTrongKhung]);

  const boMonsForFilter = useMemo(
    () => (filterKhoaVien ? boMons.filter((b) => b.maKhoaVien === filterKhoaVien) : boMons),
    [boMons, filterKhoaVien],
  );

  const monHocOptions = useMemo(() => {
    return allMonHocs.filter((m) => {
      if (idsDaTrongKhung.has(m.maMonHoc)) return false;
      if (filterBoMon && m.maBoMon !== filterBoMon) return false;
      if (!filterBoMon && filterKhoaVien) {
        const khoaVienHieuLuc = m.maBoMon
          ? boMons.find((b) => b.maBoMon === m.maBoMon)?.maKhoaVien
          : m.maKhoaVien;
        if (khoaVienHieuLuc !== filterKhoaVien) return false;
      }
      return true;
    });
  }, [allMonHocs, idsDaTrongKhung, filterBoMon, filterKhoaVien, boMons]);

  function openAddModal(kyHoc: number) {
    setModalKyHoc(kyHoc);
    setFilterKhoaVien('');
    setFilterBoMon('');
    setSelectedMonHoc('');
    setFormError('');
    setModalOpen(true);
  }

  async function handleAdd() {
    if (!selectedMonHoc) {
      setFormError('Vui lòng chọn môn học');
      return;
    }
    if (modalKyHoc <= 0) {
      setFormError('Kỳ học không hợp lệ');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await addMonHocVaoKhung(maKhungChuongTrinh, Number(selectedMonHoc), modalKyHoc);
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(m: MonHocTrongKhung) {
    const confirmed = window.confirm(`Bỏ môn "${m.tenMonHoc}" khỏi khung chương trình?`);
    if (!confirmed) return;
    try {
      await removeMonHocKhoiKhung(m.ma);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá môn học này khỏi khung');
    }
  }

  async function handleChangeKy(m: MonHocTrongKhung, kyHocMoi: number) {
    if (kyHocMoi <= 0 || kyHocMoi === m.kyHoc) return;
    try {
      await updateKyHoc(m.ma, kyHocMoi);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể đổi kỳ học');
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Đang tải...</div>;
  }

  if (error || !khung) {
    return <div className="p-8 text-center text-red-600">{error || 'Không tìm thấy khung chương trình'}</div>;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/danh-muc/khung-chuong-trinh')}
            className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
          <span className="text-base font-semibold text-gray-700">
            Thiết kế chương trình: {khung.tenNganh}
          </span>
          <span className="text-sm text-gray-400">({khung.tenKhoaVien})</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            Tổng tín chỉ: <strong className="text-gray-900">{khung.tongTinChi}</strong>
          </span>
          <span>
            Bắt buộc: <strong className="text-gray-900">{khung.soTinChiBatBuoc}</strong>
          </span>
          <span>
            Tự chọn tối thiểu: <strong className="text-gray-900">{khung.soTinChiTuChonToiThieu}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: soKyHoc }, (_, i) => i + 1).map((ky) => {
            const monHocs = monHocTheoKy.get(ky) ?? [];
            const batBuoc = monHocs.filter((m) => m.loaiMonHoc === 'Bắt buộc');
            const tuChon = monHocs.filter((m) => m.loaiMonHoc !== 'Bắt buộc');
            const tinChiBatBuocKy = batBuoc.reduce((sum, m) => sum + m.soTinChi, 0);

            const renderRow = (m: MonHocTrongKhung) => (
              <div key={m.ma} className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{m.tenMonHoc}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        m.loaiMonHoc === 'Bắt buộc' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {m.loaiMonHoc}
                    </span>
                    <span className="text-xs text-gray-500">{m.soTinChi} TC</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {m.tenBoMon ?? (m.tenKhoaVien ? `${m.tenKhoaVien} (trực thuộc)` : '-')}
                  </p>
                  {m.tenMonHocTienQuyet && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">Tiên quyết: {m.tenMonHocTienQuyet}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <select
                    value={m.kyHoc}
                    onChange={(e) => handleChangeKy(m, Number(e.target.value))}
                    className="rounded border border-gray-200 px-1 py-0.5 text-[11px] outline-none"
                  >
                    {Array.from({ length: soKyHoc }, (_, i) => i + 1).map((k) => (
                      <option key={k} value={k}>
                        Kỳ {k}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Bỏ khỏi khung"
                    onClick={() => handleRemove(m)}
                    className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );

            return (
              <div key={ky} className="rounded border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-3 py-2">
                  <span className="text-sm font-semibold text-gray-700">Học kỳ {ky}</span>  
                </div>

                {monHocs.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-gray-400">Chưa có môn học</p>
                )}

                {batBuoc.length > 0 && (
                  <>
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-1">
                      <span className="text-xs font-semibold text-gray-600">I. Bắt buộc</span>
                      <span className="text-xs text-gray-500">{tinChiBatBuocKy} TC</span>
                    </div>
                    <div className="divide-y divide-gray-100">{batBuoc.map(renderRow)}</div>
                  </>
                )}

                {tuChon.length > 0 && (
                  <>
                    <div className="bg-gray-50 px-3 py-1">
                      <span className="text-xs font-semibold text-gray-600">II. Tự chọn</span>
                    </div>
                    <div className="divide-y divide-gray-100">{tuChon.map(renderRow)}</div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => openAddModal(ky)}
                  className="flex w-full items-center justify-center gap-1 border-t border-gray-200 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm môn học
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <Modal title={`Thêm môn học vào Kỳ ${modalKyHoc}`} onClose={() => setModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="modalKyHoc">
            Kỳ học
          </label>
          <input
            id="modalKyHoc"
            type="number"
            min={1}
            value={modalKyHoc}
            onChange={(e) => setModalKyHoc(Number(e.target.value))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="filterKhoaVien">
            Lọc theo Khoa viện (không bắt buộc)
          </label>
          <select
            id="filterKhoaVien"
            value={filterKhoaVien}
            onChange={(e) => {
              setFilterKhoaVien(e.target.value ? Number(e.target.value) : '');
              setFilterBoMon('');
              setSelectedMonHoc('');
            }}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Tất cả khoa viện --</option>
            {khoaViens.map((k) => (
              <option key={k.maKhoaVien} value={k.maKhoaVien}>
                {k.tenKhoaVien}
              </option>
            ))}
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="filterBoMon">
            Lọc theo Bộ môn (không bắt buộc)
          </label>
          <select
            id="filterBoMon"
            value={filterBoMon}
            onChange={(e) => {
              setFilterBoMon(e.target.value ? Number(e.target.value) : '');
              setSelectedMonHoc('');
            }}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Tất cả bộ môn --</option>
            {boMonsForFilter.map((b) => (
              <option key={b.maBoMon} value={b.maBoMon}>
                {b.tenBoMon}
              </option>
            ))}
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="selectedMonHoc">
            Môn học
          </label>
          <select
            id="selectedMonHoc"
            value={selectedMonHoc}
            onChange={(e) => setSelectedMonHoc(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn môn học --</option>
            {monHocOptions.map((m) => (
              <option key={m.maMonHoc} value={m.maMonHoc}>
                {m.tenMonHoc} ({m.loaiMonHoc} - {m.soTinChi}TC)
              </option>
            ))}
          </select>
          {monHocOptions.length === 0 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
              <BookOpen className="h-3.5 w-3.5" /> Không còn môn học phù hợp với bộ lọc này (hoặc đã có trong khung).
            </p>
          )}

          {formError && <div className="mt-1.5 text-sm text-red-600">{formError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Thêm vào khung'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
