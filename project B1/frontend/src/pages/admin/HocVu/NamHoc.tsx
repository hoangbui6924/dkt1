import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import {
  type NamHoc as NamHocModel,
  type NamHocInput,
  getNamHocs,
  createNamHoc,
  updateNamHoc,
  deleteNamHoc,
} from '../../../services/namHocService';
import {
  type HocKy as HocKyModel,
  type HocKyInput,
  getHocKys,
  createHocKy,
  updateHocKy,
  deleteHocKy,
} from '../../../services/hocKyService';
import Modal from '../../../components/Modal';

const EMPTY_NAM_HOC: NamHocInput = { tenNamHoc: '', ngayBatDau: '', ngayKetThuc: '' };
const EMPTY_HOC_KY: HocKyInput = {
  tenHocKy: '',
  loaiHocKy: 'Chính',
  ngayBatDau: '',
  ngayKetThuc: '',
  hanDangKyTu: null,
  hanDangKyDen: null,
  hanRutDangKyTu: null,
  hanRutDangKyDen: null,
};

export default function NamHocPage() {
  const [namHocs, setNamHocs] = useState<NamHocModel[]>([]);
  const [hocKys, setHocKys] = useState<HocKyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNamHoc, setSelectedNamHoc] = useState<number | null>(null);

  const [namHocModalOpen, setNamHocModalOpen] = useState(false);
  const [editingNamHoc, setEditingNamHoc] = useState<NamHocModel | null>(null);
  const [namHocForm, setNamHocForm] = useState<NamHocInput>(EMPTY_NAM_HOC);
  const [namHocFormError, setNamHocFormError] = useState('');
  const [savingNamHoc, setSavingNamHoc] = useState(false);

  const [hocKyModalOpen, setHocKyModalOpen] = useState(false);
  const [editingHocKy, setEditingHocKy] = useState<HocKyModel | null>(null);
  const [hocKyForm, setHocKyForm] = useState<HocKyInput>(EMPTY_HOC_KY);
  const [hocKyFormError, setHocKyFormError] = useState('');
  const [savingHocKy, setSavingHocKy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [namHocData, hocKyData] = await Promise.all([getNamHocs(), getHocKys()]);
      setNamHocs(namHocData);
      setHocKys(hocKyData);
      if (selectedNamHoc === null && namHocData.length > 0) {
        setSelectedNamHoc(namHocData[0].maNamHoc);
      }
    } catch {
      setError('Không thể tải danh sách năm học');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hocKysCuaNam = useMemo(
    () => hocKys.filter((h) => h.maNamHoc === selectedNamHoc),
    [hocKys, selectedNamHoc],
  );

  const namHocDangChon = useMemo(
    () => namHocs.find((n) => n.maNamHoc === selectedNamHoc) ?? null,
    [namHocs, selectedNamHoc],
  );

  function openAddNamHoc() {
    setEditingNamHoc(null);
    setNamHocForm(EMPTY_NAM_HOC);
    setNamHocFormError('');
    setNamHocModalOpen(true);
  }

  function openEditNamHoc(item: NamHocModel) {
    setEditingNamHoc(item);
    setNamHocForm({ tenNamHoc: item.tenNamHoc, ngayBatDau: item.ngayBatDau, ngayKetThuc: item.ngayKetThuc });
    setNamHocFormError('');
    setNamHocModalOpen(true);
  }

  async function handleSaveNamHoc() {
    const ten = namHocForm.tenNamHoc.trim();
    if (!ten) {
      setNamHocFormError('Tên năm học không được để trống');
      return;
    }
    if (!namHocForm.ngayBatDau || !namHocForm.ngayKetThuc) {
      setNamHocFormError('Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }
    setSavingNamHoc(true);
    setNamHocFormError('');
    try {
      if (editingNamHoc) {
        await updateNamHoc(editingNamHoc.maNamHoc, { ...namHocForm, tenNamHoc: ten });
      } else {
        const created = await createNamHoc({ ...namHocForm, tenNamHoc: ten });
        setSelectedNamHoc(created.maNamHoc);
      }
      setNamHocModalOpen(false);
      await load();
    } catch (err: any) {
      setNamHocFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSavingNamHoc(false);
    }
  }

  async function handleDeleteNamHoc(item: NamHocModel) {
    const confirmed = window.confirm(`Xoá năm học "${item.tenNamHoc}"?`);
    if (!confirmed) return;
    try {
      await deleteNamHoc(item.maNamHoc);
      if (selectedNamHoc === item.maNamHoc) setSelectedNamHoc(null);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá năm học này');
    }
  }

  function openAddHocKy() {
    if (!selectedNamHoc) return;
    setEditingHocKy(null);
    setHocKyForm(EMPTY_HOC_KY);
    setHocKyFormError('');
    setHocKyModalOpen(true);
  }

  function openEditHocKy(item: HocKyModel) {
    setEditingHocKy(item);
    const toLocalInput = (v: string | null) => (v ? v.slice(0, 16) : '');
    setHocKyForm({
      tenHocKy: item.tenHocKy,
      loaiHocKy: item.loaiHocKy || 'Chính',
      ngayBatDau: item.ngayBatDau,
      ngayKetThuc: item.ngayKetThuc,
      hanDangKyTu: toLocalInput(item.hanDangKyTu) || null,
      hanDangKyDen: toLocalInput(item.hanDangKyDen) || null,
      hanRutDangKyTu: toLocalInput(item.hanRutDangKyTu) || null,
      hanRutDangKyDen: toLocalInput(item.hanRutDangKyDen) || null,
    });
    setHocKyFormError('');
    setHocKyModalOpen(true);
  }

  async function handleSaveHocKy() {
    if (!selectedNamHoc) return;
    const ten = hocKyForm.tenHocKy.trim();
    if (!ten) {
      setHocKyFormError('Tên học kỳ không được để trống');
      return;
    }
    if (!hocKyForm.ngayBatDau || !hocKyForm.ngayKetThuc) {
      setHocKyFormError('Vui lòng chọn ngày bắt đầu và kết thúc');
      return;
    }
    setSavingHocKy(true);
    setHocKyFormError('');
    try {
      if (editingHocKy) {
        await updateHocKy(editingHocKy.maHocKy, { ...hocKyForm, tenHocKy: ten });
      } else {
        await createHocKy(selectedNamHoc, { ...hocKyForm, tenHocKy: ten });
      }
      setHocKyModalOpen(false);
      await load();
    } catch (err: any) {
      setHocKyFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSavingHocKy(false);
    }
  }

  async function handleDeleteHocKy(item: HocKyModel) {
    const confirmed = window.confirm(`Xoá học kỳ "${item.tenHocKy}"?`);
    if (!confirmed) return;
    try {
      await deleteHocKy(item.maHocKy);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá học kỳ này');
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* === LEFT: Năm học === */}
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-gray-200">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Năm học</span>
          </div>
          <button
            type="button"
            onClick={openAddNamHoc}
            title="Thêm năm học"
            className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
          {loading && <div className="px-4 py-6 text-center text-sm text-gray-400">Đang tải...</div>}
          {!loading && namHocs.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Chưa có năm học nào</div>
          )}
          {!loading &&
            namHocs.map((n) => (
              <div
                key={n.maNamHoc}
                onClick={() => setSelectedNamHoc(n.maNamHoc)}
                className={`flex cursor-pointer items-center justify-between border-b border-gray-100 px-4 py-3 ${
                  selectedNamHoc === n.maNamHoc ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      selectedNamHoc === n.maNamHoc ? 'text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {n.tenNamHoc}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {n.ngayBatDau} → {n.ngayKetThuc}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{n.soHocKy} học kỳ</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Sửa"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditNamHoc(n);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Xoá"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNamHoc(n);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* === RIGHT: Học kỳ của năm học đang chọn === */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">
              Học kỳ {namHocDangChon ? `— ${namHocDangChon.tenNamHoc}` : ''}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
              {hocKysCuaNam.length} học kỳ
            </span>
          </div>
          <button
            type="button"
            onClick={openAddHocKy}
            disabled={!selectedNamHoc}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Thêm học kỳ
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedNamHoc && (
            <div className="px-4 py-12 text-center text-gray-400">Chọn một năm học để xem học kỳ</div>
          )}

          {selectedNamHoc && (
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-50">
                  <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                    No.
                  </th>
                  <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Tên học kỳ
                  </th>
                  <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Loại
                  </th>
                  <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Bắt đầu
                  </th>
                  <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Kết thúc
                  </th>
                  <th className="w-52 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Hạn đăng ký
                  </th>
                  <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                    Số lớp
                  </th>
                  <th className="w-28 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hocKysCuaNam.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <Layers className="mx-auto mb-2 h-10 w-10 opacity-40" />
                      <p>Chưa có học kỳ nào</p>
                    </td>
                  </tr>
                )}
                {hocKysCuaNam.map((h, idx) => (
                  <tr key={h.maHocKy} className={idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {idx + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {h.tenHocKy}
                    </td>
                    <td className="w-24 border-r border-gray-200 px-3 py-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          h.loaiHocKy === 'Phụ' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {h.loaiHocKy}
                      </span>
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{h.ngayBatDau}</td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{h.ngayKetThuc}</td>
                    <td className="w-52 border-r border-gray-200 px-3 py-2 text-xs text-gray-600">
                      {h.hanDangKyTu && h.hanDangKyDen ? (
                        <span>
                          {h.hanDangKyTu.slice(0, 16).replace('T', ' ')} → {h.hanDangKyDen.slice(0, 16).replace('T', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">Chưa đặt</span>
                      )}
                    </td>
                    <td className="w-24 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{h.soLopHoc}</td>
                    <td className="w-28 px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="Sửa"
                          onClick={() => openEditHocKy(h)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Xoá"
                          onClick={() => handleDeleteHocKy(h)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {namHocModalOpen && (
        <Modal title={editingNamHoc ? 'Sửa năm học' : 'Thêm năm học'} onClose={() => setNamHocModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenNamHoc">
            Tên năm học
          </label>
          <input
            id="tenNamHoc"
            type="text"
            value={namHocForm.tenNamHoc}
            onChange={(e) => setNamHocForm((f) => ({ ...f, tenNamHoc: e.target.value }))}
            placeholder="VD: 2025-2026"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="ngayBatDauNamHoc">
            Ngày bắt đầu
          </label>
          <input
            id="ngayBatDauNamHoc"
            type="date"
            value={namHocForm.ngayBatDau}
            onChange={(e) => setNamHocForm((f) => ({ ...f, ngayBatDau: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="ngayKetThucNamHoc">
            Ngày kết thúc
          </label>
          <input
            id="ngayKetThucNamHoc"
            type="date"
            value={namHocForm.ngayKetThuc}
            onChange={(e) => setNamHocForm((f) => ({ ...f, ngayKetThuc: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {namHocFormError && <div className="mt-1.5 text-sm text-red-600">{namHocFormError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNamHocModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveNamHoc}
              disabled={savingNamHoc}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingNamHoc ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}

      {hocKyModalOpen && (
        <Modal
          title={editingHocKy ? 'Sửa học kỳ' : 'Thêm học kỳ'}
          onClose={() => setHocKyModalOpen(false)}
          maxWidthClassName="max-w-[520px]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenHocKy">
                Tên học kỳ
              </label>
              <input
                id="tenHocKy"
                type="text"
                value={hocKyForm.tenHocKy}
                onChange={(e) => setHocKyForm((f) => ({ ...f, tenHocKy: e.target.value }))}
                placeholder="VD: Học kỳ 1"
                autoFocus
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="loaiHocKy">
                Loại học kỳ
              </label>
              <select
                id="loaiHocKy"
                value={hocKyForm.loaiHocKy}
                onChange={(e) => setHocKyForm((f) => ({ ...f, loaiHocKy: e.target.value }))}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Chính">Chính (15 tuần)</option>
                <option value="Phụ">Phụ (6 tuần)</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ngayBatDauHocKy">
                Ngày bắt đầu
              </label>
              <input
                id="ngayBatDauHocKy"
                type="date"
                value={hocKyForm.ngayBatDau}
                onChange={(e) => setHocKyForm((f) => ({ ...f, ngayBatDau: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="ngayKetThucHocKy">
                Ngày kết thúc
              </label>
              <input
                id="ngayKetThucHocKy"
                type="date"
                value={hocKyForm.ngayKetThuc}
                onChange={(e) => setHocKyForm((f) => ({ ...f, ngayKetThuc: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-gray-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Hạn đăng ký học phần (không bắt buộc)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Mở đăng ký từ</label>
                <input
                  type="datetime-local"
                  value={hocKyForm.hanDangKyTu ?? ''}
                  onChange={(e) => setHocKyForm((f) => ({ ...f, hanDangKyTu: e.target.value || null }))}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Đóng đăng ký lúc</label>
                <input
                  type="datetime-local"
                  value={hocKyForm.hanDangKyDen ?? ''}
                  onChange={(e) => setHocKyForm((f) => ({ ...f, hanDangKyDen: e.target.value || null }))}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Mở rút đăng ký từ</label>
                <input
                  type="datetime-local"
                  value={hocKyForm.hanRutDangKyTu ?? ''}
                  onChange={(e) => setHocKyForm((f) => ({ ...f, hanRutDangKyTu: e.target.value || null }))}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Đóng rút đăng ký lúc</label>
                <input
                  type="datetime-local"
                  value={hocKyForm.hanRutDangKyDen ?? ''}
                  onChange={(e) => setHocKyForm((f) => ({ ...f, hanRutDangKyDen: e.target.value || null }))}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {hocKyFormError && <div className="mt-1.5 text-sm text-red-600">{hocKyFormError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setHocKyModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveHocKy}
              disabled={savingHocKy}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingHocKy ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
