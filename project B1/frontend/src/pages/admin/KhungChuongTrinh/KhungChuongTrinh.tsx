import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Pencil, Trash2, Settings2, Search } from 'lucide-react';
import {
  type KhungChuongTrinh as KhungModel,
  type KhungChuongTrinhInput,
  getKhungChuongTrinhs,
  createKhungChuongTrinh,
  updateKhungChuongTrinh,
  deleteKhungChuongTrinh,
} from '../../../services/khungChuongTrinhService';
import { type NganhHoc, getNganhHocs } from '../../../services/nganhHocService';
import Modal from '../../../components/Modal';
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';

const ITEMS_PER_PAGE = 15;

const EMPTY_INPUT: KhungChuongTrinhInput = { tongTinChi: 0, soTinChiBatBuoc: 0, soTinChiTuChonToiThieu: 0 };

interface Row {
  maNganh: number;
  tenNganh: string;
  tenKhoaVien: string;
  khung: KhungModel | null;
}

type SortField = 'tenNganh' | 'khoaVien' | 'tongTinChi' | 'batBuoc' | 'tuChon' | 'soMon';

export default function KhungChuongTrinhPage() {
  const navigate = useNavigate();
  const [nganhHocs, setNganhHocs] = useState<NganhHoc[]>([]);
  const [khungs, setKhungs] = useState<KhungModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('tenNganh');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const [filterTenNganh, setFilterTenNganh] = useState<Set<string> | null>(null);
  const [filterKhoaVien, setFilterKhoaVien] = useState<Set<string> | null>(null);
  const [filterTongTinChi, setFilterTongTinChi] = useState<Set<string> | null>(null);
  const [filterBatBuoc, setFilterBatBuoc] = useState<Set<string> | null>(null);
  const [filterTuChon, setFilterTuChon] = useState<Set<string> | null>(null);
  const [filterSoMon, setFilterSoMon] = useState<Set<string> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [form, setForm] = useState<KhungChuongTrinhInput>(EMPTY_INPUT);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nganhData, khungData] = await Promise.all([getNganhHocs(), getKhungChuongTrinhs()]);
      setNganhHocs(nganhData);
      setKhungs(khungData);
    } catch {
      setError('Không thể tải danh sách khung chương trình');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows: Row[] = useMemo(() => {
    return nganhHocs.map((n) => ({
      maNganh: n.maNganh,
      tenNganh: n.tenNganh,
      tenKhoaVien: n.tenKhoaVien,
      khung: khungs.find((k) => k.maNganhHoc === n.maNganh) ?? null,
    }));
  }, [nganhHocs, khungs]);

  const optionsTenNganh = useMemo(
    () => [...new Set(rows.map((r) => r.tenNganh))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [rows],
  );
  const optionsKhoaVien = useMemo(
    () => [...new Set(rows.map((r) => r.tenKhoaVien))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [rows],
  );
  const optionsTongTinChi = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.khung ? String(r.khung.tongTinChi) : '-')))]
        .sort((a, b) => (a === '-' ? -1 : b === '-' ? 1 : Number(a) - Number(b)))
        .map((v) => ({ value: v, label: v })),
    [rows],
  );
  const optionsBatBuoc = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.khung ? String(r.khung.soTinChiBatBuoc) : '-')))]
        .sort((a, b) => (a === '-' ? -1 : b === '-' ? 1 : Number(a) - Number(b)))
        .map((v) => ({ value: v, label: v })),
    [rows],
  );
  const optionsTuChon = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.khung ? String(r.khung.soTinChiTuChonToiThieu) : '-')))]
        .sort((a, b) => (a === '-' ? -1 : b === '-' ? 1 : Number(a) - Number(b)))
        .map((v) => ({ value: v, label: v })),
    [rows],
  );
  const optionsSoMon = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.khung ? String(r.khung.soMonHoc) : '-')))]
        .sort((a, b) => (a === '-' ? -1 : b === '-' ? 1 : Number(a) - Number(b)))
        .map((v) => ({ value: v, label: v })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) result = result.filter((r) => r.tenNganh.toLowerCase().includes(q));
    if (filterTenNganh) result = result.filter((r) => filterTenNganh.has(r.tenNganh));
    if (filterKhoaVien) result = result.filter((r) => filterKhoaVien.has(r.tenKhoaVien));
    if (filterTongTinChi) result = result.filter((r) => filterTongTinChi.has(r.khung ? String(r.khung.tongTinChi) : '-'));
    if (filterBatBuoc) result = result.filter((r) => filterBatBuoc.has(r.khung ? String(r.khung.soTinChiBatBuoc) : '-'));
    if (filterTuChon)
      result = result.filter((r) => filterTuChon.has(r.khung ? String(r.khung.soTinChiTuChonToiThieu) : '-'));
    if (filterSoMon) result = result.filter((r) => filterSoMon.has(r.khung ? String(r.khung.soMonHoc) : '-'));

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'tenNganh':
          cmp = a.tenNganh.localeCompare(b.tenNganh);
          break;
        case 'khoaVien':
          cmp = a.tenKhoaVien.localeCompare(b.tenKhoaVien);
          break;
        case 'tongTinChi':
          cmp = (a.khung?.tongTinChi ?? -1) - (b.khung?.tongTinChi ?? -1);
          break;
        case 'batBuoc':
          cmp = (a.khung?.soTinChiBatBuoc ?? -1) - (b.khung?.soTinChiBatBuoc ?? -1);
          break;
        case 'tuChon':
          cmp = (a.khung?.soTinChiTuChonToiThieu ?? -1) - (b.khung?.soTinChiTuChonToiThieu ?? -1);
          break;
        case 'soMon':
          cmp = (a.khung?.soMonHoc ?? -1) - (b.khung?.soMonHoc ?? -1);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [rows, search, sortField, sortDir, filterTenNganh, filterKhoaVien, filterTongTinChi, filterBatBuoc, filterTuChon, filterSoMon]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function setSort(field: SortField, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

  function openCreateModal(row: Row) {
    setEditingRow(row);
    setForm(EMPTY_INPUT);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(row: Row) {
    if (!row.khung) return;
    setEditingRow(row);
    setForm({
      tongTinChi: row.khung.tongTinChi,
      soTinChiBatBuoc: row.khung.soTinChiBatBuoc,
      soTinChiTuChonToiThieu: row.khung.soTinChiTuChonToiThieu,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!editingRow) return;
    if (form.tongTinChi <= 0) {
      setFormError('Tổng tín chỉ phải lớn hơn 0');
      return;
    }
    if (form.soTinChiBatBuoc < 0 || form.soTinChiTuChonToiThieu < 0) {
      setFormError('Số tín chỉ không hợp lệ');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingRow.khung) {
        await updateKhungChuongTrinh(editingRow.khung.maKhungChuongTrinh, form);
      } else {
        await createKhungChuongTrinh(editingRow.maNganh, form);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Row) {
    if (!row.khung) return;
    const confirmed = window.confirm(
      `Xoá khung chương trình của ngành "${row.tenNganh}"? Toàn bộ môn học đã gán vào khung sẽ bị xoá.`,
    );
    if (!confirmed) return;
    try {
      await deleteKhungChuongTrinh(row.khung.maKhungChuongTrinh);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá khung chương trình này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý Khung chương trình</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {khungs.length} / {nganhHocs.length} ngành đã có khung
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm nhanh theo tên ngành học"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

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
                  <span className="text-sm font-semibold text-gray-600">Ngành học</span>
                  <ExcelColumnFilter
                    options={optionsTenNganh}
                    selected={filterTenNganh}
                    onChange={(s) => {
                      setFilterTenNganh(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'tenNganh' ? sortDir : null}
                    onSort={(dir) => setSort('tenNganh', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-48 border-b border-r border-gray-200 px-3 py-2 text-left">
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
              <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tổng TC</span>
                  <ExcelColumnFilter
                    options={optionsTongTinChi}
                    selected={filterTongTinChi}
                    onChange={(s) => {
                      setFilterTongTinChi(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'tongTinChi' ? sortDir : null}
                    onSort={(dir) => setSort('tongTinChi', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Bắt buộc (yêu cầu/đã gán)</span>
                  <ExcelColumnFilter
                    options={optionsBatBuoc}
                    selected={filterBatBuoc}
                    onChange={(s) => {
                      setFilterBatBuoc(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'batBuoc' ? sortDir : null}
                    onSort={(dir) => setSort('batBuoc', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tự chọn (tối thiểu/pool)</span>
                  <ExcelColumnFilter
                    options={optionsTuChon}
                    selected={filterTuChon}
                    onChange={(s) => {
                      setFilterTuChon(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'tuChon' ? sortDir : null}
                    onSort={(dir) => setSort('tuChon', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Số môn</span>
                  <ExcelColumnFilter
                    options={optionsSoMon}
                    selected={filterSoMon}
                    onChange={(s) => {
                      setFilterSoMon(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'soMon' ? sortDir : null}
                    onSort={(dir) => setSort('soMon', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-52 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Hành động
              </th>
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
                  <ClipboardList className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Không có dữ liệu</p>
                </td>
              </tr>
            )}

            {!loading &&
              paginated.map((row, idx) => {
                const globalIndex = startIndex + idx;
                const k = row.khung;
                return (
                  <tr key={row.maNganh} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {row.tenNganh}
                    </td>
                    <td className="w-48 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {row.tenKhoaVien}
                    </td>
                    <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {k ? k.tongTinChi : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm">
                      {k ? (
                        <span
                          className={
                            k.soTinChiBatBuocThucTe >= k.soTinChiBatBuoc ? 'text-green-700' : 'text-amber-600'
                          }
                        >
                          {k.soTinChiBatBuoc}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm">
                      {k ? (
                        <span
                          className={
                            k.soTinChiTuChonThucTe >= k.soTinChiTuChonToiThieu ? 'text-green-700' : 'text-amber-600'
                          }
                        >
                          {k.soTinChiTuChonToiThieu}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {k ? k.soMonHoc : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="w-52 px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {k ? (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/danh-muc/khung-chuong-trinh/${k.maKhungChuongTrinh}`)}
                              className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                            >
                              <Settings2 className="h-3.5 w-3.5" /> Thiết kế
                            </button>
                            <button
                              type="button"
                              title="Sửa chỉ tiêu"
                              onClick={() => openEditModal(row)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Xoá"
                              onClick={() => handleDelete(row)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCreateModal(row)}
                            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            <Plus className="h-3.5 w-3.5" /> Tạo khung
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
        <span>
          Trang {page} / {totalPages} ({filtered.length} ngành)
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            &lsaquo;
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
          >
            &rsaquo;
          </button>
        </div>
      </div>

      {modalOpen && editingRow && (
        <Modal
          title={editingRow.khung ? 'Sửa chỉ tiêu khung chương trình' : 'Tạo khung chương trình'}
          onClose={() => setModalOpen(false)}
        >
          <p className="mb-3 text-sm text-gray-600">
            Ngành: <strong>{editingRow.tenNganh}</strong>
          </p>

          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tongTinChi">
            Tổng tín chỉ toàn khoá
          </label>
          <input
            id="tongTinChi"
            type="number"
            min={1}
            value={form.tongTinChi}
            onChange={(e) => setForm((f) => ({ ...f, tongTinChi: Number(e.target.value) }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="soTinChiBatBuoc">
            Số tín chỉ bắt buộc
          </label>
          <input
            id="soTinChiBatBuoc"
            type="number"
            min={0}
            value={form.soTinChiBatBuoc}
            onChange={(e) => setForm((f) => ({ ...f, soTinChiBatBuoc: Number(e.target.value) }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="soTinChiTuChonToiThieu">
            Số tín chỉ tự chọn tối thiểu
          </label>
          <input
            id="soTinChiTuChonToiThieu"
            type="number"
            min={0}
            value={form.soTinChiTuChonToiThieu}
            onChange={(e) => setForm((f) => ({ ...f, soTinChiTuChonToiThieu: Number(e.target.value) }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

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
