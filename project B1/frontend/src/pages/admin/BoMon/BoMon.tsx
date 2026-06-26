import { useEffect, useMemo, useState } from 'react';
import { Layers, FileSpreadsheet, Download, Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  type BoMon as BoMonModel,
  getBoMons,
  createBoMon,
  updateBoMon,
  deleteBoMon,
} from '../../../services/boMonService';
import { type KhoaVien, getKhoaViens } from '../../../services/khoaVienService';
import Modal from '../../../components/Modal';
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';

const ITEMS_PER_PAGE = 15;

type SortField = 'tenBoMon' | 'khoaVien' | 'soMonHoc' | 'soGiangVien';
const KHONG_THUOC_KHOA_VIEN = 'Không thuộc khoa viện';

export default function BoMonPage() {
  const [items, setItems] = useState<BoMonModel[]>([]);
  const [khoaViens, setKhoaViens] = useState<KhoaVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('tenBoMon');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const [filterTenBoMon, setFilterTenBoMon] = useState<Set<string> | null>(null);
  const [filterKhoaVien, setFilterKhoaVien] = useState<Set<string> | null>(null);
  const [filterSoMonHoc, setFilterSoMonHoc] = useState<Set<string> | null>(null);
  const [filterSoGiangVien, setFilterSoGiangVien] = useState<Set<string> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BoMonModel | null>(null);
  const [formTen, setFormTen] = useState('');
  const [formMaKhoaVien, setFormMaKhoaVien] = useState<number | ''>('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [boMonData, khoaVienData] = await Promise.all([getBoMons(), getKhoaViens()]);
      setItems(boMonData);
      setKhoaViens(khoaVienData);
    } catch {
      setError('Không thể tải danh sách bộ môn');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const optionsTenBoMon = useMemo(
    () => [...new Set(items.map((i) => i.tenBoMon))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsKhoaVien = useMemo(
    () =>
      [...new Set(items.map((i) => i.tenKhoaVien ?? KHONG_THUOC_KHOA_VIEN))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsSoMonHoc = useMemo(
    () =>
      [...new Set(items.map((i) => i.soMonHoc))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: String(v) })),
    [items],
  );
  const optionsSoGiangVien = useMemo(
    () =>
      [...new Set(items.map((i) => i.soGiangVien))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: String(v) })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) {
      result = result.filter((i) => i.tenBoMon.toLowerCase().includes(q));
    }
    if (filterTenBoMon) result = result.filter((i) => filterTenBoMon.has(i.tenBoMon));
    if (filterKhoaVien) result = result.filter((i) => filterKhoaVien.has(i.tenKhoaVien ?? KHONG_THUOC_KHOA_VIEN));
    if (filterSoMonHoc) result = result.filter((i) => filterSoMonHoc.has(String(i.soMonHoc)));
    if (filterSoGiangVien) result = result.filter((i) => filterSoGiangVien.has(String(i.soGiangVien)));

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'tenBoMon':
          cmp = a.tenBoMon.localeCompare(b.tenBoMon);
          break;
        case 'khoaVien':
          cmp = (a.tenKhoaVien ?? KHONG_THUOC_KHOA_VIEN).localeCompare(b.tenKhoaVien ?? KHONG_THUOC_KHOA_VIEN);
          break;
        case 'soMonHoc':
          cmp = a.soMonHoc - b.soMonHoc;
          break;
        case 'soGiangVien':
          cmp = a.soGiangVien - b.soGiangVien;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [items, search, sortField, sortDir, filterTenBoMon, filterKhoaVien, filterSoMonHoc, filterSoGiangVien]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function setSort(field: SortField, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

  function openAddModal() {
    setEditing(null);
    setFormTen('');
    setFormMaKhoaVien('');
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: BoMonModel) {
    setEditing(item);
    setFormTen(item.tenBoMon);
    setFormMaKhoaVien(item.maKhoaVien ?? '');
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    const ten = formTen.trim();
    if (!ten) {
      setFormError('Tên bộ môn không được để trống');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const maKhoaVien = formMaKhoaVien === '' ? null : Number(formMaKhoaVien);
      if (editing) {
        await updateBoMon(editing.maBoMon, ten, maKhoaVien);
      } else {
        await createBoMon(ten, maKhoaVien);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: BoMonModel) {
    const confirmed = window.confirm(`Xoá bộ môn "${item.tenBoMon}"?`);
    if (!confirmed) return;
    try {
      await deleteBoMon(item.maBoMon);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá bộ môn này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER ROW: Title + actions === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý Bộ môn</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} Bộ môn
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm nhanh theo tên bộ môn"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-56 bg-transparent text-sm outline-none"
            />
          </div>
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
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Thêm bộ môn
          </button>
        </div>
      </div>

      {/* === TABLE === */}
      <div className="flex-1 overflow-auto">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-blue-50">
              <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                No.
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tên Bộ môn</span>
                  <ExcelColumnFilter
                    options={optionsTenBoMon}
                    selected={filterTenBoMon}
                    onChange={(s) => {
                      setFilterTenBoMon(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'tenBoMon' ? sortDir : null}
                    onSort={(dir) => setSort('tenBoMon', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-70 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Khoa viện</span>
                  <ExcelColumnFilter
                    options={optionsKhoaVien}
                    selected={filterKhoaVien}
                    onChange={(s) => {
                      setFilterKhoaVien(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'khoaVien' ? sortDir : null}
                    onSort={(dir) => setSort('khoaVien', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Số môn học</span>
                  <ExcelColumnFilter
                    options={optionsSoMonHoc}
                    selected={filterSoMonHoc}
                    onChange={(s) => {
                      setFilterSoMonHoc(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'soMonHoc' ? sortDir : null}
                    onSort={(dir) => setSort('soMonHoc', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-40 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Số giảng viên</span>
                  <ExcelColumnFilter
                    options={optionsSoGiangVien}
                    selected={filterSoGiangVien}
                    onChange={(s) => {
                      setFilterSoGiangVien(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'soGiangVien' ? sortDir : null}
                    onSort={(dir) => setSort('soGiangVien', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-28 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Hành động
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  <Layers className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Không có dữ liệu</p>
                </td>
              </tr>
            )}

            {!loading &&
              paginated.map((item, idx) => {
                const globalIndex = startIndex + idx;
                return (
                  <tr
                    key={item.maBoMon}
                    className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}
                  >
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.tenBoMon}
                    </td>
                    <td className="w-56 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenKhoaVien ?? <span className="italic text-gray-400">Không thuộc khoa viện</span>}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.soMonHoc}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.soGiangVien}
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
            Trang {page} / {totalPages} ({filtered.length} bộ môn)
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
        <Modal title={editing ? 'Sửa bộ môn' : 'Thêm bộ môn'} onClose={() => setModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenBoMon">
            Tên bộ môn
          </label>
          <input
            id="tenBoMon"
            type="text"
            value={formTen}
            onChange={(e) => setFormTen(e.target.value)}
            placeholder="VD: Bộ môn Công nghệ phần mềm"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maKhoaVien">
            Khoa viện
          </label>
          <select
            id="maKhoaVien"
            value={formMaKhoaVien}
            onChange={(e) => setFormMaKhoaVien(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Không thuộc khoa viện nào --</option>
            {khoaViens.map((k) => (
              <option key={k.maKhoaVien} value={k.maKhoaVien}>
                {k.tenKhoaVien}
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
