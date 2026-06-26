import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Upload, Trash2, Download, Loader2, Search } from 'lucide-react';
import {
  type TaiLieu,
  type LoaiTaiLieu,
  LOAI_TAI_LIEU_LABEL,
  getTaiLieus,
  uploadTaiLieu,
  deleteTaiLieu,
  downloadTaiLieu,
  formatKichThuoc,
} from '../../../services/taiLieuService';
import { type MonHoc, getMonHocs } from '../../../services/monHocService';
import SearchableSelect from '../../../components/SearchableSelect';

const LOAI_OPTIONS: LoaiTaiLieu[] = ['SoTay', 'GiaoTrinh'];

function formatThoiGian(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function badgeTrangThai(t: TaiLieu['trangThai']) {
  if (t === 'DaXuLy')
    return <span className="rounded-full bg-green-100 px-2.5 py-1 text-sm font-medium text-green-700">Đã xử lý</span>;
  if (t === 'DangXuLy')
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-700">Đang xử lý</span>;
  return <span className="rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700">Lỗi</span>;
}

export default function TaiLieuPage() {
  const [items, setItems] = useState<TaiLieu[]>([]);
  const [monHocs, setMonHocs] = useState<MonHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // form tải lên
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loaiTaiLieu, setLoaiTaiLieu] = useState<LoaiTaiLieu>('NoiQuy');
  const [maMonHoc, setMaMonHoc] = useState<number | ''>('');
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await getTaiLieus();
      setItems(data);
    } catch {
      setError('Không thể tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getMonHocs().then(setMonHocs).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.tenFile.toLowerCase().includes(q) || (i.tenMonHoc ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  async function handleUpload() {
    if (!file) {
      setError('Vui lòng chọn file PDF');
      return;
    }
    if (loaiTaiLieu === 'GiaoTrinh' && !maMonHoc) {
      setError('Giáo trình cần chọn môn học');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadTaiLieu(file, loaiTaiLieu, loaiTaiLieu === 'GiaoTrinh' ? Number(maMonHoc) : null);
      setFile(null);
      setMaMonHoc('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Tải lên thất bại, vui lòng thử lại');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: TaiLieu) {
    if (!window.confirm(`Xoá tài liệu "${item.tenFile}"? Hành động này không thể hoàn tác.`)) return;
    try {
      await deleteTaiLieu(item.maTaiLieu);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá tài liệu này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* HEADER */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-semibold text-gray-800">Quản lý tài liệu</span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60 bg-transparent text-[15px] outline-none"
          />
        </div>
      </div>

      {/* UPLOAD TOOLBAR */}
      <div className="flex flex-shrink-0 flex-wrap items-end gap-3 border-b border-gray-200 bg-gray-50/60 px-5 py-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Loại tài liệu</label>
          <select
            value={loaiTaiLieu}
            onChange={(e) => setLoaiTaiLieu(e.target.value as LoaiTaiLieu)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-[15px] outline-none focus:border-blue-500"
          >
            {LOAI_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {LOAI_TAI_LIEU_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        {loaiTaiLieu === 'GiaoTrinh' && (
          <div className="w-72">
            <label className="mb-1 block text-sm font-medium text-gray-600">Môn học</label>
            <SearchableSelect
              value={maMonHoc}
              onChange={(v) => setMaMonHoc(v)}
              placeholder="Gõ để tìm môn học..."
              options={monHocs.map((m) => ({ value: m.maMonHoc, label: m.tenMonHoc }))}
            />
          </div>
        )}

        <div className="flex-1 min-w-[260px]">
          <label className="mb-1 block text-sm font-medium text-gray-600">Tệp PDF</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded border border-gray-300 bg-white text-[15px] file:mr-3 file:cursor-pointer file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-[15px] font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Đang xử lý...' : 'Xác nhận tải lên'}
        </button>
      </div>

      {error && <div className="flex-shrink-0 px-5 py-2 text-sm text-red-600">{error}</div>}

      {/* TABLE */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <table className="min-w-full text-[15px]">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-500">
              <th className="px-3 py-3">Tên file</th>
              <th className="w-44 px-3 py-3">Loại / Môn học</th>
              <th className="w-28 px-3 py-3">Dung lượng</th>
              <th className="w-48 px-3 py-3">Thời gian tải lên</th>
              <th className="w-36 px-3 py-3">Chủ đăng tải</th>
              <th className="w-32 px-3 py-3">Tình trạng</th>
              <th className="w-28 px-3 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-gray-400">
                  <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên.</p>
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((item) => (
                <tr key={item.maTaiLieu} className="hover:bg-gray-50/60">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => downloadTaiLieu(item.maTaiLieu, item.tenFile)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {item.tenFile}
                    </button>
                    {item.ghiChuXuLy && <div className="mt-0.5 text-xs text-amber-600">{item.ghiChuXuLy}</div>}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    <div>{LOAI_TAI_LIEU_LABEL[item.loaiTaiLieu]}</div>
                    {item.tenMonHoc && <div className="text-sm text-gray-400">{item.tenMonHoc}</div>}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {formatKichThuoc(item.kichThuocBytes)}
                    <span className="text-sm text-gray-400"> · {item.soTrang} tr</span>
                  </td>
                  <td className="px-3 py-3 text-gray-600">{formatThoiGian(item.ngayTaiLen)}</td>
                  <td className="px-3 py-3 text-gray-600">{item.tenNguoiTaiLen}</td>
                  <td className="px-3 py-3">{badgeTrangThai(item.trangThai)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        title="Tải về"
                        onClick={() => downloadTaiLieu(item.maTaiLieu, item.tenFile)}
                        className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Xoá"
                        onClick={() => handleDelete(item)}
                        className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
