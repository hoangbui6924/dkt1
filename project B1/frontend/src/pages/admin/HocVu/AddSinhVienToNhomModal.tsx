import { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import {
  type SinhVienTrongNhom,
  getSinhViensChuaCoNhom,
  addSinhVienVaoNhom,
} from '../../../services/nhomLopNganhService';
import Modal from '../../../components/Modal';

interface AddSinhVienToNhomModalProps {
  maNhomLop: number;
  tenNhomLop: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSinhVienToNhomModal({
  maNhomLop,
  tenNhomLop,
  onClose,
  onAdded,
}: AddSinhVienToNhomModalProps) {
  const [items, setItems] = useState<SinhVienTrongNhom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getSinhViensChuaCoNhom(maNhomLop);
      setItems(data);
    } catch {
      setError('Không thể tải danh sách sinh viên chưa có nhóm lớp');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maNhomLop]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.hoTen.toLowerCase().includes(q) || i.maSoSV.toLowerCase().includes(q));
  }, [items, search]);

  function toggle(maSinhVien: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(maSinhVien)) next.delete(maSinhVien);
      else next.add(maSinhVien);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => i.maSinhVien)));
    }
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    setError('');
    try {
      for (const maSinhVien of selected) {
        await addSinhVienVaoNhom(maNhomLop, maSinhVien);
      }
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Thêm sinh viên vào nhóm "${tenNhomLop}"`} onClose={onClose} maxWidthClassName="max-w-[520px]">
      <div className="flex items-center gap-0.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5">
        <input
          type="text"
          placeholder="Tìm theo tên hoặc mã số sinh viên"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </div>

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

      <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-gray-200">
        {loading && <div className="px-4 py-8 text-center text-sm text-gray-400">Đang tải...</div>}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Không có sinh viên nào chưa có nhóm lớp trong khoá học này.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-4 w-4"
                  />
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Mã SV</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Họ tên</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Giới tính</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s) => (
                <tr
                  key={s.maSinhVien}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => toggle(s.maSinhVien)}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(s.maSinhVien)}
                      onChange={() => toggle(s.maSinhVien)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{s.maSoSV}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{s.hoTen}</td>
                  <td className="px-3 py-2 text-gray-700">{s.gioiTinh ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">Đã chọn {selected.size} sinh viên</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || selected.size === 0}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" /> {saving ? 'Đang thêm...' : `Thêm ${selected.size} sinh viên`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
