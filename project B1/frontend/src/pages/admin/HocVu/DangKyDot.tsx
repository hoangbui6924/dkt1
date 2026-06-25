import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  type DotDangKy,
  type DotDangKyInput,
  getDotDangKys,
  createDotDangKy,
  updateDotDangKy,
  deleteDotDangKy,
} from '../../../services/dotDangKyService';
import { type HocKy, getHocKys } from '../../../services/hocKyService';
import { type KhoaVien, getKhoaViens } from '../../../services/khoaVienService';
import { getKhoaHocNganhs } from '../../../services/khoaHocNganhService';
import Modal from '../../../components/Modal';

type PhamVi = 'all' | 'khoa' | 'khoaVien';

const EMPTY_FORM: DotDangKyInput = {
  ten: '',
  loaiDot: 'Lan1',
  thoiGianBatDau: '',
  thoiGianKetThuc: '',
  choPhepDangKy: true,
  choPhepRut: false,
  namNhapHoc: null,
  maKhoaVien: null,
};

function fmtDateTime(iso: string): string {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
}

const TRANG_THAI_BADGE: Record<string, { label: string; cls: string }> = {
  DangMo: { label: 'Đang mở', cls: 'bg-green-100 text-green-700' },
  ChuaMo: { label: 'Chưa mở', cls: 'bg-gray-100 text-gray-600' },
  DaDong: { label: 'Đã đóng', cls: 'bg-red-100 text-red-700' },
};

export default function DangKyDotPage() {
  const [hocKys, setHocKys] = useState<HocKy[]>([]);
  const [khoaViens, setKhoaViens] = useState<KhoaVien[]>([]);
  const [khoaList, setKhoaList] = useState<number[]>([]);
  const [maHocKy, setMaHocKy] = useState<number | ''>('');
  const [dots, setDots] = useState<DotDangKy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DotDangKy | null>(null);
  const [form, setForm] = useState<DotDangKyInput>(EMPTY_FORM);
  const [phamVi, setPhamVi] = useState<PhamVi>('all');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadMeta() {
    try {
      const [hkData, kvData, khncData] = await Promise.all([getHocKys(), getKhoaViens(), getKhoaHocNganhs()]);
      setHocKys(hkData);
      setKhoaViens(kvData);
      const namSet = [...new Set(khncData.map((k) => k.namNhapHoc).filter((n) => n > 0))].sort((a, b) => b - a);
      setKhoaList(namSet);
      if (hkData.length > 0) setMaHocKy(hkData[0].maHocKy);
    } catch {
      setError('Không thể tải danh mục');
    }
  }

  async function loadDots(hk: number) {
    setLoading(true);
    setError('');
    try {
      setDots(await getDotDangKys(hk));
    } catch {
      setError('Không thể tải danh sách đợt đăng ký');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (maHocKy) loadDots(Number(maHocKy));
    else setDots([]);
  }, [maHocKy]);

  const hocKyDangChon = useMemo(() => hocKys.find((h) => h.maHocKy === maHocKy) ?? null, [hocKys, maHocKy]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhamVi('all');
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(d: DotDangKy) {
    setEditing(d);
    setForm({
      ten: d.ten,
      loaiDot: d.loaiDot,
      thoiGianBatDau: d.thoiGianBatDau.slice(0, 16),
      thoiGianKetThuc: d.thoiGianKetThuc.slice(0, 16),
      choPhepDangKy: d.choPhepDangKy,
      choPhepRut: d.choPhepRut,
      namNhapHoc: d.namNhapHoc,
      maKhoaVien: d.maKhoaVien,
    });
    setPhamVi(d.namNhapHoc ? 'khoa' : d.maKhoaVien ? 'khoaVien' : 'all');
    setFormError('');
    setModalOpen(true);
  }

  function handlePhamViChange(p: PhamVi) {
    setPhamVi(p);
    if (p === 'all') setForm((f) => ({ ...f, namNhapHoc: null, maKhoaVien: null }));
    else if (p === 'khoa') setForm((f) => ({ ...f, maKhoaVien: null, namNhapHoc: khoaList[0] ?? null }));
    else setForm((f) => ({ ...f, namNhapHoc: null, maKhoaVien: khoaViens[0]?.maKhoaVien ?? null }));
  }

  async function handleSave() {
    if (!maHocKy) return;
    if (!form.ten.trim()) {
      setFormError('Tên đợt không được để trống');
      return;
    }
    if (!form.thoiGianBatDau || !form.thoiGianKetThuc) {
      setFormError('Vui lòng nhập thời gian bắt đầu và kết thúc');
      return;
    }
    if (phamVi === 'khoa' && !form.namNhapHoc) {
      setFormError('Vui lòng chọn khoá');
      return;
    }
    if (phamVi === 'khoaVien' && !form.maKhoaVien) {
      setFormError('Vui lòng chọn khoa viện');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: DotDangKyInput = {
        ...form,
        ten: form.ten.trim(),
        namNhapHoc: phamVi === 'khoa' ? form.namNhapHoc : null,
        maKhoaVien: phamVi === 'khoaVien' ? form.maKhoaVien : null,
      };
      if (editing) await updateDotDangKy(editing.maDot, payload);
      else await createDotDangKy(Number(maHocKy), payload);
      setModalOpen(false);
      await loadDots(Number(maHocKy));
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: DotDangKy) {
    if (!window.confirm(`Xoá đợt "${d.ten}"?`)) return;
    try {
      await deleteDotDangKy(d.maDot);
      await loadDots(Number(maHocKy));
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá đợt này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Đợt đăng ký học phần</span>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={!maHocKy}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Thêm đợt
        </button>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-2.5">
        <label className="text-sm font-medium text-gray-600">Học kỳ</label>
        <select
          value={maHocKy}
          onChange={(e) => setMaHocKy(e.target.value ? Number(e.target.value) : '')}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none"
        >
          <option value="">-- Chọn học kỳ --</option>
          {hocKys.map((h) => (
            <option key={h.maHocKy} value={h.maHocKy}>
              {h.tenHocKy} ({h.tenNamHoc}) · {h.loaiHocKy}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-blue-50">
              <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">No.</th>
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Tên đợt</th>
              <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Loại</th>
              <th className="w-44 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Phạm vi</th>
              <th className="w-56 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Thời gian</th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Cho phép</th>
              <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Trạng thái</th>
              <th className="w-24 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Đang tải...</td></tr>
            )}
            {!loading && dots.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chưa có đợt đăng ký nào trong học kỳ này</td></tr>
            )}
            {!loading && dots.map((d, idx) => {
              const tt = TRANG_THAI_BADGE[d.trangThai] ?? TRANG_THAI_BADGE.ChuaMo;
              return (
                <tr key={d.maDot} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                  <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">{d.ten}</td>
                  <td className="w-24 border-r border-gray-200 px-3 py-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.loaiDot === 'Lan2' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {d.loaiDot === 'Lan2' ? 'Lần 2' : 'Lần 1'}
                    </span>
                  </td>
                  <td className="w-44 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{d.phamViMoTa}</td>
                  <td className="w-56 border-r border-gray-200 px-3 py-2 text-xs text-gray-600">
                    {fmtDateTime(d.thoiGianBatDau)} → {fmtDateTime(d.thoiGianKetThuc)}
                  </td>
                  <td className="w-32 border-r border-gray-200 px-3 py-2 text-xs text-gray-600">
                    {d.choPhepDangKy && <span className="mr-1 rounded bg-green-50 px-1.5 py-0.5 text-green-700">Đăng ký</span>}
                    {d.choPhepRut && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Rút</span>}
                  </td>
                  <td className="w-24 border-r border-gray-200 px-3 py-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tt.cls}`}>{tt.label}</span>
                  </td>
                  <td className="w-24 px-3 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" title="Sửa" onClick={() => openEdit(d)} className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" title="Xoá" onClick={() => handleDelete(d)} className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Sửa đợt đăng ký' : 'Thêm đợt đăng ký'}
          onClose={() => setModalOpen(false)}
          maxWidthClassName="max-w-[520px]"
        >
          {hocKyDangChon && (
            <p className="mb-3 text-xs text-gray-400">
              Học kỳ: {hocKyDangChon.tenHocKy} ({hocKyDangChon.tenNamHoc}) · {hocKyDangChon.loaiHocKy}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên đợt</label>
              <input
                type="text"
                value={form.ten}
                onChange={(e) => setForm((f) => ({ ...f, ten: e.target.value }))}
                placeholder="VD: Đăng ký lần 1 - Khóa 2025"
                autoFocus
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Loại đợt</label>
              <select
                value={form.loaiDot}
                onChange={(e) => setForm((f) => ({ ...f, loaiDot: e.target.value }))}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Lan1">Lần 1 (đăng ký chính thức)</option>
                <option value="Lan2">Lần 2 (đăng ký lại / điều chỉnh)</option>
              </select>
            </div>
          </div>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">Phạm vi áp dụng</label>
          <div className="flex gap-2">
            {(['all', 'khoa', 'khoaVien'] as PhamVi[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePhamViChange(p)}
                className={`flex-1 rounded border px-2 py-1.5 text-sm font-medium ${
                  phamVi === p ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p === 'all' ? 'Tất cả' : p === 'khoa' ? 'Theo khoá' : 'Theo khoa viện'}
              </button>
            ))}
          </div>

          {phamVi === 'khoa' && (
            <select
              value={form.namNhapHoc ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, namNhapHoc: e.target.value ? Number(e.target.value) : null }))}
              className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-- Chọn khoá (năm nhập học) --</option>
              {khoaList.map((n) => (
                <option key={n} value={n}>Khóa {n}</option>
              ))}
            </select>
          )}
          {phamVi === 'khoaVien' && (
            <select
              value={form.maKhoaVien ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, maKhoaVien: e.target.value ? Number(e.target.value) : null }))}
              className="mt-2 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">-- Chọn khoa viện --</option>
              {khoaViens.map((k) => (
                <option key={k.maKhoaVien} value={k.maKhoaVien}>{k.tenKhoaVien}</option>
              ))}
            </select>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Mở từ</label>
              <input
                type="datetime-local"
                value={form.thoiGianBatDau}
                onChange={(e) => setForm((f) => ({ ...f, thoiGianBatDau: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Đóng lúc</label>
              <input
                type="datetime-local"
                value={form.thoiGianKetThuc}
                onChange={(e) => setForm((f) => ({ ...f, thoiGianKetThuc: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.choPhepDangKy} onChange={(e) => setForm((f) => ({ ...f, choPhepDangKy: e.target.checked }))} />
              Cho phép đăng ký mới
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.choPhepRut} onChange={(e) => setForm((f) => ({ ...f, choPhepRut: e.target.checked }))} />
              Cho phép rút đăng ký
            </label>
          </div>

          {formError && <div className="mt-2 text-sm text-red-600">{formError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="button" onClick={handleSave} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
