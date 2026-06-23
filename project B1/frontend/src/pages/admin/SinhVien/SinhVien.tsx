import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Search, ChevronsUpDown, KeyRound, FileUp } from 'lucide-react';
import {
  type SinhVien as SinhVienModel,
  type CreateSinhVienInput,
  type UpdateSinhVienInput,
  getSinhViens,
  createSinhVien,
  updateSinhVien,
  deleteSinhVien,
} from '../../../services/sinhVienService';
import { type KhoaHocNganh, getKhoaHocNganhs } from '../../../services/khoaHocNganhService';
import { type NhomLopNganh, getNhomLopNganhs } from '../../../services/nhomLopNganhService';
import { type KhoaVien, getKhoaViens } from '../../../services/khoaVienService';
import { type NganhHoc, getNganhHocs } from '../../../services/nganhHocService';
import Modal from '../../../components/Modal';
import ImportSinhVienModal from './ImportSinhVienModal';

const ITEMS_PER_PAGE = 15;

type SortDir = 'asc' | 'desc';

const EMPTY_CREATE_FORM: CreateSinhVienInput = {
  maSoSV: '',
  hoTen: '',
  ngaySinh: '',
  gioiTinh: '',
  maKhoaHocNganh: 0,
  maNhomLop: null,
};

export default function SinhVienPage() {
  const [items, setItems] = useState<SinhVienModel[]>([]);
  const [khoaHocs, setKhoaHocs] = useState<KhoaHocNganh[]>([]);
  const [nhomLops, setNhomLops] = useState<NhomLopNganh[]>([]);
  const [khoaViens, setKhoaViens] = useState<KhoaVien[]>([]);
  const [nganhHocs, setNganhHocs] = useState<NganhHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SinhVienModel | null>(null);
  const [form, setForm] = useState<CreateSinhVienInput>(EMPTY_CREATE_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newAccountInfo, setNewAccountInfo] = useState<{ tenDangNhap: string } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sinhVienData, khoaHocData, nhomLopData, khoaVienData, nganhHocData] = await Promise.all([
        getSinhViens(),
        getKhoaHocNganhs(),
        getNhomLopNganhs(),
        getKhoaViens(),
        getNganhHocs(),
      ]);
      setItems(sinhVienData);
      setKhoaHocs(khoaHocData);
      setNhomLops(nhomLopData);
      setKhoaViens(khoaVienData);
      setNganhHocs(nganhHocData);
    } catch {
      setError('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const close = () => setSortMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const nhomLopsTrongKhoaHoc = useMemo(
    () => (form.maKhoaHocNganh ? nhomLops.filter((n) => n.maKhoaHocNganh === form.maKhoaHocNganh) : []),
    [nhomLops, form.maKhoaHocNganh],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) {
      result = result.filter(
        (i) => i.hoTen.toLowerCase().includes(q) || i.maSoSV.toLowerCase().includes(q),
      );
    }
    result = [...result].sort((a, b) =>
      sortDir === 'asc' ? a.hoTen.localeCompare(b.hoTen) : b.hoTen.localeCompare(a.hoTen),
    );
    return result;
  }, [items, search, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function openAddModal() {
    setEditing(null);
    setForm({ ...EMPTY_CREATE_FORM, maKhoaHocNganh: khoaHocs[0]?.maKhoaHocNganh ?? 0 });
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: SinhVienModel) {
    setEditing(item);
    setForm({
      maSoSV: item.maSoSV,
      hoTen: item.hoTen,
      ngaySinh: item.ngaySinh ?? '',
      gioiTinh: item.gioiTinh ?? '',
      maKhoaHocNganh: item.maKhoaHocNganh,
      maNhomLop: item.maNhomLop,
    });
    setFormError('');
    setModalOpen(true);
  }

  function handleKhoaHocChange(value: string) {
    const maKhoaHocNganh = value ? Number(value) : 0;
    setForm((f) => ({ ...f, maKhoaHocNganh, maNhomLop: null }));
  }

  async function handleSave() {
    const hoTen = form.hoTen.trim();
    if (!hoTen) {
      setFormError('Họ tên không được để trống');
      return;
    }
    if (!form.maKhoaHocNganh) {
      setFormError('Vui lòng chọn khoá học ngành');
      return;
    }
    if (!editing) {
      const maSoSV = form.maSoSV.trim();
      if (!maSoSV) {
        setFormError('Mã số sinh viên không được để trống (dùng làm tên đăng nhập tài khoản)');
        return;
      }
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const payload: UpdateSinhVienInput = {
          hoTen,
          ngaySinh: form.ngaySinh || null,
          gioiTinh: form.gioiTinh || null,
          maKhoaHocNganh: form.maKhoaHocNganh,
          maNhomLop: form.maNhomLop,
        };
        await updateSinhVien(editing.maSinhVien, payload);
        setModalOpen(false);
      } else {
        const payload: CreateSinhVienInput = {
          ...form,
          maSoSV: form.maSoSV.trim(),
          hoTen,
          ngaySinh: form.ngaySinh || null,
          gioiTinh: form.gioiTinh || null,
        };
        const created = await createSinhVien(payload);
        setModalOpen(false);
        if (created.tenDangNhapTaiKhoan) {
          setNewAccountInfo({ tenDangNhap: created.tenDangNhapTaiKhoan });
        }
      }
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SinhVienModel) {
    const confirmed = window.confirm(`Xoá sinh viên "${item.hoTen}" (${item.maSoSV})?`);
    if (!confirmed) return;
    try {
      await deleteSinhVien(item.maSinhVien);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá sinh viên này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER ROW: Title + actions === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý Sinh viên</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} Sinh viên
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            disabled={khoaHocs.length === 0}
            className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" /> Import Excel
          </button>
          <button
            type="button"
            onClick={openAddModal}
            disabled={khoaHocs.length === 0}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Thêm sinh viên
          </button>
        </div>
      </div>

      {/* === TABLE === */}
      <div className="flex-1 overflow-auto">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        {!loading && khoaHocs.length === 0 && (
          <div className="px-4 py-2 text-sm text-amber-600">
            Chưa có khoá học ngành nào. Vui lòng thêm khoá học ngành trước khi tạo sinh viên.
          </div>
        )}

        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-blue-50">
              <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                No.
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Mã SV
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Họ tên</span>
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
              <th className="w-44 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Khoá học ngành
              </th>
              <th className="w-44 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Nhóm lớp
              </th>
              <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Tài khoản
              </th>
              <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                GPA
              </th>
              <th className="w-28 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Hành động
              </th>
            </tr>

            <tr className="border-b border-gray-200 bg-white">
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200"></th>
              <th className="border-r border-gray-200 px-2 py-1">
                <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0.5">
                  <input
                    type="text"
                    placeholder="→ Tìm theo tên hoặc mã SV"
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
                  <GraduationCap className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Không có dữ liệu</p>
                </td>
              </tr>
            )}

            {!loading &&
              paginated.map((item, idx) => {
                const globalIndex = startIndex + idx;
                return (
                  <tr key={item.maSinhVien} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{item.maSoSV}</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.hoTen}
                    </td>
                    <td className="w-44 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenKhoaHoc} ({item.tenNganh})
                    </td>
                    <td className="w-44 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenNhomLop ?? <span className="text-gray-400">Chưa có</span>}
                    </td>
                    <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenDangNhapTaiKhoan ?? <span className="text-gray-400">-</span>}
                    </td>
                    <td className="w-24 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.gpaTichLuy.toFixed(2)}
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
            Trang {page} / {totalPages} ({filtered.length} sinh viên)
          </span>
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

      {modalOpen && (
        <Modal title={editing ? 'Sửa sinh viên' : 'Thêm sinh viên'} onClose={() => setModalOpen(false)}>
          {!editing && (
            <>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="maSoSV">
                Mã số sinh viên <span className="text-red-500">* (dùng làm tên đăng nhập tài khoản)</span>
              </label>
              <input
                id="maSoSV"
                type="text"
                value={form.maSoSV}
                onChange={(e) => setForm((f) => ({ ...f, maSoSV: e.target.value }))}
                placeholder="VD: SV2025001"
                autoFocus
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </>
          )}

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="hoTen">
            Họ tên
          </label>
          <input
            id="hoTen"
            type="text"
            value={form.hoTen}
            onChange={(e) => setForm((f) => ({ ...f, hoTen: e.target.value }))}
            placeholder="VD: Nguyễn Văn A"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="ngaySinh">
            Ngày sinh
          </label>
          <input
            id="ngaySinh"
            type="date"
            value={form.ngaySinh ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, ngaySinh: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="gioiTinh">
            Giới tính
          </label>
          <select
            id="gioiTinh"
            value={form.gioiTinh ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, gioiTinh: e.target.value }))}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Không chọn --</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maKhoaHocNganh">
            Khoá học ngành
          </label>
          <select
            id="maKhoaHocNganh"
            value={form.maKhoaHocNganh || ''}
            onChange={(e) => handleKhoaHocChange(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn khoá học ngành --</option>
            {khoaHocs.map((k) => (
              <option key={k.maKhoaHocNganh} value={k.maKhoaHocNganh}>
                {k.tenKhoaHoc} ({k.tenNganh})
              </option>
            ))}
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="maNhomLop">
            Nhóm lớp (không bắt buộc, có thể bổ sung sau)
          </label>
          <select
            id="maNhomLop"
            value={form.maNhomLop ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, maNhomLop: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chưa có nhóm lớp --</option>
            {nhomLopsTrongKhoaHoc.map((n) => (
              <option key={n.maNhomLop} value={n.maNhomLop}>
                {n.tenNhomLop}
              </option>
            ))}
          </select>
          {form.maKhoaHocNganh > 0 && nhomLopsTrongKhoaHoc.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600">Khoá học ngành này chưa có nhóm lớp nào.</p>
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
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}

      {newAccountInfo && (
        <Modal title="Đã tạo tài khoản sinh viên" onClose={() => setNewAccountInfo(null)}>
          <div className="flex items-start gap-3 rounded border border-green-200 bg-green-50 p-3">
            <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="text-sm text-gray-700">
              <p className="mb-2">Tài khoản đăng nhập đã được tạo tự động cho sinh viên này:</p>
              <p>
                Tên đăng nhập: <strong className="text-gray-900">{newAccountInfo.tenDangNhap}</strong>
              </p>
              <p>
                Mật khẩu mặc định: <strong className="text-gray-900">123456a@B</strong>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Vui lòng thông báo cho sinh viên đổi mật khẩu sau khi đăng nhập lần đầu.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setNewAccountInfo(null)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Đã hiểu
            </button>
          </div>
        </Modal>
      )}

      {importModalOpen && (
        <ImportSinhVienModal
          khoaViens={khoaViens}
          nganhHocs={nganhHocs}
          khoaHocs={khoaHocs}
          onClose={() => setImportModalOpen(false)}
          onImported={load}
        />
      )}
    </div>
  );
}
