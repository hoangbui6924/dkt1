import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Lock, Pencil, Search, ShieldCheck, Unlock, Users } from 'lucide-react';
import {
  type TaiKhoan as TaiKhoanModel,
  getTaiKhoans,
  updateTaiKhoan,
  datLaiMatKhau,
} from '../../../services/taiKhoanService';
import Modal from '../../../components/Modal';

const ITEMS_PER_PAGE = 15;

const QUYEN_LABEL: Record<string, string> = {
  Admin: 'Quản trị viên',
  GiangVien: 'Giảng viên',
  SinhVien: 'Sinh viên',
};

function formatNgay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function TaiKhoanPage() {
  const [items, setItems] = useState<TaiKhoanModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterQuyen, setFilterQuyen] = useState('');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<TaiKhoanModel | null>(null);
  const [formTenDangNhap, setFormTenDangNhap] = useState('');
  const [formTrangThai, setFormTrangThai] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [resetTarget, setResetTarget] = useState<TaiKhoanModel | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ tenDangNhap: string; matKhauMoi: string } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getTaiKhoans();
      setItems(data);
    } catch {
      setError('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (filterQuyen) result = result.filter((i) => i.tenQuyen === filterQuyen);
    if (q) {
      result = result.filter(
        (i) =>
          i.tenDangNhap.toLowerCase().includes(q) ||
          (i.hoTen ?? '').toLowerCase().includes(q) ||
          (i.maSoSV ?? '').toLowerCase().includes(q) ||
          (i.email ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, search, filterQuyen]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function openEditModal(item: TaiKhoanModel) {
    setEditing(item);
    setFormTenDangNhap(item.tenDangNhap);
    setFormTrangThai(item.trangThai);
    setFormError('');
  }

  async function handleSave() {
    if (!editing) return;
    const ten = formTenDangNhap.trim();
    if (!ten) {
      setFormError('Tên đăng nhập không được để trống');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await updateTaiKhoan(editing.maTaiKhoan, { tenDangNhap: ten, trangThai: formTrangThai });
      setEditing(null);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await datLaiMatKhau(resetTarget.maTaiKhoan);
      setResetResult({ tenDangNhap: resetTarget.tenDangNhap, matKhauMoi: res.matKhauMoi });
      setResetTarget(null);
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể đặt lại mật khẩu');
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER === */}
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Tài khoản &amp; quyền</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} tài khoản
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterQuyen}
            onChange={(e) => {
              setFilterQuyen(e.target.value);
              setPage(1);
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none"
          >
            <option value="">Tất cả vai trò</option>
            <option value="Admin">Quản trị viên</option>
            <option value="GiangVien">Giảng viên</option>
            <option value="SinhVien">Sinh viên</option>
          </select>
          <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên đăng nhập, họ tên, mã SV, email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 bg-transparent text-sm outline-none"
            />
          </div>
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
              <th className="w-40 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Tên đăng nhập
              </th>
              <th className="w-150 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Liên kết
              </th>
              <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Vai trò
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Ngày tạo
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                Trạng thái
              </th>
              <th className="w-36 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Hành động
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Không có dữ liệu</p>
                </td>
              </tr>
            )}

            {!loading &&
              paginated.map((item, idx) => {
                const globalIndex = startIndex + idx;
                return (
                  <tr key={item.maTaiKhoan} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.tenDangNhap}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.hoTen ? (
                        <div>
                          <div>{item.hoTen}</div>
                          <div className="text-xs text-gray-400">{item.maSoSV ?? item.email ?? ''}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {QUYEN_LABEL[item.tenQuyen] ?? item.tenQuyen}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {formatNgay(item.ngayTao)}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2">
                      {item.trangThai ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          <Unlock className="h-3 w-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <Lock className="h-3 w-3" /> Đã khoá
                        </span>
                      )}
                    </td>
                    <td className="w-36 px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="Sửa thông tin tài khoản"
                          onClick={() => openEditModal(item)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Đặt lại mật khẩu mặc định"
                          onClick={() => setResetTarget(item)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50"
                        >
                          <KeyRound className="h-4 w-4" />
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
            Trang {page} / {totalPages} ({filtered.length} tài khoản)
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

      {/* === MODAL: Sửa tài khoản === */}
      {editing && (
        <Modal title="Sửa thông tin tài khoản" onClose={() => setEditing(null)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenDangNhap">
            Tên đăng nhập
          </label>
          <input
            id="tenDangNhap"
            type="text"
            value={formTenDangNhap}
            onChange={(e) => setFormTenDangNhap(e.target.value)}
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <div>
              Liên kết: <strong>{editing.hoTen ?? '(không có)'}</strong>
            </div>
            <div>
              Vai trò: <strong>{QUYEN_LABEL[editing.tenQuyen] ?? editing.tenQuyen}</strong>{' '}
              <span className="text-xs text-gray-400">(không thể đổi tại đây)</span>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formTrangThai}
              onChange={(e) => setFormTrangThai(e.target.checked)}
            />
            Tài khoản đang hoạt động (bỏ tích để khoá tài khoản, chặn đăng nhập)
          </label>

          {formError && <div className="mt-2 text-sm text-red-600">{formError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
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

      {/* === MODAL: Xác nhận đặt lại mật khẩu === */}
      {resetTarget && (
        <Modal title="Đặt lại mật khẩu mặc định" onClose={() => setResetTarget(null)}>
          <p className="text-sm text-gray-700">
            Đặt lại mật khẩu cho tài khoản <strong>{resetTarget.tenDangNhap}</strong>
            {resetTarget.hoTen ? ` (${resetTarget.hoTen})` : ''} về mật khẩu mặc định?
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Dùng khi sinh viên/giảng viên quên mật khẩu. Sau khi đặt lại, hãy báo họ đăng nhập bằng mật khẩu mặc định
            rồi đổi lại mật khẩu mới.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetting}
              className="rounded bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {resetting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Kết quả đặt lại mật khẩu === */}
      {resetResult && (
        <Modal title="Đã đặt lại mật khẩu" onClose={() => setResetResult(null)}>
          <div className="flex items-start gap-3 rounded border border-green-200 bg-green-50 p-3">
            <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="text-sm text-gray-700">
              <p className="mb-2">Mật khẩu đã được đặt lại cho tài khoản:</p>
              <p>
                Tên đăng nhập: <strong className="text-gray-900">{resetResult.tenDangNhap}</strong>
              </p>
              <p>
                Mật khẩu mới: <strong className="text-gray-900">{resetResult.matKhauMoi}</strong>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Vui lòng thông báo cho người dùng đổi mật khẩu sau khi đăng nhập lần đầu.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setResetResult(null)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Đã hiểu
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
