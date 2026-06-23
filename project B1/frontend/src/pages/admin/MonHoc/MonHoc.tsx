import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Download,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronsUpDown,
} from 'lucide-react';
import {
  type MonHoc as MonHocModel,
  type MonHocInput,
  getMonHocs,
  createMonHoc,
  updateMonHoc,
  deleteMonHoc,
} from '../../../services/monHocService';
import { type BoMon, getBoMons } from '../../../services/boMonService';
import { type KhoaVien, getKhoaViens } from '../../../services/khoaVienService';
import Modal from '../../../components/Modal';

const ITEMS_PER_PAGE = 15;

type SortDir = 'asc' | 'desc';

const LOAI_MON_HOC_OPTIONS = ['Bắt buộc', 'Tự chọn'] as const;

const EMPTY_FORM: MonHocInput = {
  tenMonHoc: '',
  loaiMonHoc: LOAI_MON_HOC_OPTIONS[0],
  soTinChi: 3,
  maBoMon: null,
  maKhoaVien: null,
  maMonHocTienQuyet: null,
};

type AttachMode = 'boMon' | 'khoaVien';

export default function MonHocPage() {
  const [items, setItems] = useState<MonHocModel[]>([]);
  const [boMons, setBoMons] = useState<BoMon[]>([]);
  const [khoaViens, setKhoaViens] = useState<KhoaVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MonHocModel | null>(null);
  const [form, setForm] = useState<MonHocInput>(EMPTY_FORM);
  const [attachMode, setAttachMode] = useState<AttachMode>('boMon');
  const [formMaKhoaVien, setFormMaKhoaVien] = useState<number | ''>('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [monHocData, boMonData, khoaVienData] = await Promise.all([
        getMonHocs(),
        getBoMons(),
        getKhoaViens(),
      ]);
      setItems(monHocData);
      setBoMons(boMonData);
      setKhoaViens(khoaVienData);
    } catch {
      setError('Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  }

  const boMonsInKhoaVien = useMemo(
    () => (formMaKhoaVien ? boMons.filter((b) => b.maKhoaVien === formMaKhoaVien) : boMons),
    [boMons, formMaKhoaVien],
  );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const close = () => setSortMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) {
      result = result.filter((i) => i.tenMonHoc.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) =>
      sortDir === 'asc' ? a.tenMonHoc.localeCompare(b.tenMonHoc) : b.tenMonHoc.localeCompare(a.tenMonHoc),
    );
    return result;
  }, [items, search, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function openAddModal() {
    setEditing(null);
    setAttachMode('boMon');
    const firstKhoaVien = khoaViens[0]?.maKhoaVien ?? '';
    setFormMaKhoaVien(firstKhoaVien);
    const firstBoMon = boMons.find((b) => b.maKhoaVien === firstKhoaVien) ?? boMons[0];
    setForm({ ...EMPTY_FORM, maBoMon: firstBoMon?.maBoMon ?? null, maKhoaVien: null });
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: MonHocModel) {
    setEditing(item);
    if (item.maBoMon) {
      setAttachMode('boMon');
      const currentBoMon = boMons.find((b) => b.maBoMon === item.maBoMon);
      setFormMaKhoaVien(currentBoMon?.maKhoaVien ?? '');
    } else {
      setAttachMode('khoaVien');
      setFormMaKhoaVien(item.maKhoaVien ?? '');
    }
    setForm({
      tenMonHoc: item.tenMonHoc,
      loaiMonHoc: item.loaiMonHoc,
      soTinChi: item.soTinChi,
      maBoMon: item.maBoMon,
      maKhoaVien: item.maKhoaVien,
      maMonHocTienQuyet: item.maMonHocTienQuyet,
    });
    setFormError('');
    setModalOpen(true);
  }

  function handleAttachModeChange(mode: AttachMode) {
    setAttachMode(mode);
    setFormError('');
    if (mode === 'khoaVien') {
      setForm((f) => ({ ...f, maBoMon: null, maKhoaVien: formMaKhoaVien || null }));
    } else {
      const firstBoMonInKhoa = boMons.find((b) => b.maKhoaVien === formMaKhoaVien) ?? boMons[0];
      setForm((f) => ({ ...f, maKhoaVien: null, maBoMon: firstBoMonInKhoa?.maBoMon ?? null }));
    }
  }

  function handleKhoaVienSelectChange(value: string) {
    const maKhoaVien = value ? Number(value) : '';
    setFormMaKhoaVien(maKhoaVien);
    if (attachMode === 'khoaVien') {
      setForm((f) => ({ ...f, maKhoaVien: maKhoaVien === '' ? null : maKhoaVien }));
    } else {
      const firstBoMonInKhoa = boMons.find((b) => b.maKhoaVien === maKhoaVien);
      setForm((f) => ({ ...f, maBoMon: firstBoMonInKhoa?.maBoMon ?? null }));
    }
  }

  async function handleSave() {
    const ten = form.tenMonHoc.trim();
    if (!ten) {
      setFormError('Tên môn học không được để trống');
      return;
    }
    if (attachMode === 'boMon' && !form.maBoMon) {
      setFormError('Vui lòng chọn bộ môn');
      return;
    }
    if (attachMode === 'khoaVien' && !form.maKhoaVien) {
      setFormError('Vui lòng chọn khoa viện');
      return;
    }
    if (!form.soTinChi || form.soTinChi <= 0) {
      setFormError('Số tín chỉ phải lớn hơn 0');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: MonHocInput = { ...form, tenMonHoc: ten, loaiMonHoc: form.loaiMonHoc.trim() };
      if (editing) {
        await updateMonHoc(editing.maMonHoc, payload);
      } else {
        await createMonHoc(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: MonHocModel) {
    const confirmed = window.confirm(`Xoá môn học "${item.tenMonHoc}"?`);
    if (!confirmed) return;
    try {
      await deleteMonHoc(item.maMonHoc);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá môn học này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER ROW: Title + actions === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý Môn học</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} Môn học
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={openAddModal}
            disabled={boMons.length === 0 && khoaViens.length === 0}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Thêm môn học
          </button>
        </div>
      </div>

      {/* === TABLE === */}
      <div className="flex-1 overflow-auto">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        {!loading && boMons.length === 0 && khoaViens.length === 0 && (
          <div className="px-4 py-2 text-sm text-amber-600">
            Chưa có bộ môn hoặc khoa viện nào. Vui lòng thêm trước khi tạo môn học.
          </div>
        )}

        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            {/* Row 1: column headers */}
            <tr className="bg-blue-50">
              <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                No.
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tên Môn học</span>
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortMenuOpen((v) => !v);
                      }}
                    >
                      <ChevronsUpDown className="h-3.5 w-3.5" />
                    </button>
                    {sortMenuOpen && (
                      <div className="absolute right-0 z-50 mt-1 w-32 rounded border border-gray-200 bg-white shadow-lg">
                        <button
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${sortDir === 'asc' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortDir('asc');
                            setSortMenuOpen(false);
                          }}
                        >
                          A → Z
                        </button>
                        <button
                          className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${sortDir === 'desc' ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortDir('desc');
                            setSortMenuOpen(false);
                          }}
                        >
                          Z → A
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="w-40 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Loại môn học
              </th>
              <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Số tín chỉ
              </th>
              <th className="w-56 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Bộ môn / Khoa viện
              </th>
              <th className="w-44 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Tiên quyết
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Số lớp đã mở
              </th>
              <th className="w-28 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Hành động
              </th>
            </tr>

            {/* Row 2: search inputs */}
            <tr className="border-b border-gray-200 bg-white">
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200 px-2 py-1">
                <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5">
                  <input
                    type="text"
                    placeholder="→ Tìm theo tên môn học"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                </div>
              </th>
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200"></th>
              <th></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <BookOpen className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Không có dữ liệu</p>
                </td>
              </tr>
            )}

            {!loading &&
              paginated.map((item, idx) => {
                const globalIndex = startIndex + idx;
                return (
                  <tr
                    key={item.maMonHoc}
                    className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}
                  >
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.tenMonHoc}
                    </td>
                    <td className="w-40 border-r border-gray-200 px-3 py-2 text-sm">
                      {item.loaiMonHoc ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.loaiMonHoc === 'Bắt buộc'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.loaiMonHoc}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.soTinChi}
                    </td>
                    <td className="w-56 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenBoMon ? (
                        item.tenBoMon
                      ) : item.tenKhoaVien ? (
                        <span>
                          {item.tenKhoaVien}{' '}
                          <span className="text-xs text-gray-400">(trực thuộc khoa viện)</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="w-44 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenMonHocTienQuyet ?? <span className="text-gray-400">-</span>}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.soLopHocKy}
                    </td>
                    <td className="w-28 px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="Sửa"
                          onClick={() => openEditModal(item)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Xoá"
                          onClick={() => handleDelete(item)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        >
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

      {/* === PAGINATION FOOTER === */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
        <div>
          <span className="rounded border border-gray-300 px-2 py-1 text-sm">{ITEMS_PER_PAGE} / trang</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2">
            Trang {page} / {totalPages} ({filtered.length} môn học)
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            &lsaquo;
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let p: number;
            if (totalPages <= 5) p = i + 1;
            else if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-7 w-7 items-center justify-center rounded border text-sm ${
                  page === p ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            &rsaquo;
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>Đến trang</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={page}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= totalPages) setPage(v);
            }}
            className="w-12 rounded border border-gray-300 px-1 py-1 text-center text-sm"
          />
        </div>
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Sửa môn học' : 'Thêm môn học'} onClose={() => setModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenMonHoc">
            Tên môn học
          </label>
          <input
            id="tenMonHoc"
            type="text"
            value={form.tenMonHoc}
            onChange={(e) => setForm((f) => ({ ...f, tenMonHoc: e.target.value }))}
            placeholder="VD: Cấu trúc dữ liệu và giải thuật"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="loaiMonHoc">
            Loại môn học
          </label>
          <select
            id="loaiMonHoc"
            value={form.loaiMonHoc}
            onChange={(e) => setForm((f) => ({ ...f, loaiMonHoc: e.target.value }))}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {LOAI_MON_HOC_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="soTinChi">
            Số tín chỉ
          </label>
          <input
            id="soTinChi"
            type="number"
            min={1}
            value={form.soTinChi}
            onChange={(e) => setForm((f) => ({ ...f, soTinChi: Number(e.target.value) }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">Môn học thuộc về</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAttachModeChange('boMon')}
              className={`flex-1 rounded border px-3 py-1.5 text-sm font-medium ${
                attachMode === 'boMon'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Một bộ môn
            </button>
            <button
              type="button"
              onClick={() => handleAttachModeChange('khoaVien')}
              className={`flex-1 rounded border px-3 py-1.5 text-sm font-medium ${
                attachMode === 'khoaVien'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Trực tiếp 1 khoa viện
            </button>
          </div>

          {attachMode === 'boMon' ? (
            <>
              <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="khoaVienFilter">
                Khoa viện (để lọc bộ môn, không bắt buộc)
              </label>
              <select
                id="khoaVienFilter"
                value={formMaKhoaVien}
                onChange={(e) => handleKhoaVienSelectChange(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- Tất cả khoa viện --</option>
                {khoaViens.map((k) => (
                  <option key={k.maKhoaVien} value={k.maKhoaVien}>
                    {k.tenKhoaVien}
                  </option>
                ))}
              </select>

              <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maBoMon">
                Bộ môn
              </label>
              <select
                id="maBoMon"
                value={form.maBoMon || ''}
                onChange={(e) => setForm((f) => ({ ...f, maBoMon: e.target.value ? Number(e.target.value) : null }))}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- Chọn bộ môn --</option>
                {boMonsInKhoaVien.map((b) => (
                  <option key={b.maBoMon} value={b.maBoMon}>
                    {b.tenBoMon}
                  </option>
                ))}
              </select>
              {formMaKhoaVien && boMonsInKhoaVien.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">Khoa viện này chưa có bộ môn nào.</p>
              )}
            </>
          ) : (
            <>
              <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maKhoaVienDirect">
                Khoa viện
              </label>
              <select
                id="maKhoaVienDirect"
                value={formMaKhoaVien}
                onChange={(e) => handleKhoaVienSelectChange(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- Chọn khoa viện --</option>
                {khoaViens.map((k) => (
                  <option key={k.maKhoaVien} value={k.maKhoaVien}>
                    {k.tenKhoaVien}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-400">
                Dùng cho môn học chung của khoa viện, không thuộc riêng bộ môn nào (VD: Đồ án tốt nghiệp, Thực tập).
              </p>
            </>
          )}

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maMonHocTienQuyet">
            Môn học tiên quyết (không bắt buộc)
          </label>
          <select
            id="maMonHocTienQuyet"
            value={form.maMonHocTienQuyet ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, maMonHocTienQuyet: e.target.value ? Number(e.target.value) : null }))
            }
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Không có môn tiên quyết --</option>
            {items
              .filter((i) => i.maMonHoc !== editing?.maMonHoc)
              .map((i) => (
                <option key={i.maMonHoc} value={i.maMonHoc}>
                  {i.tenMonHoc}
                </option>
              ))}
          </select>

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
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
