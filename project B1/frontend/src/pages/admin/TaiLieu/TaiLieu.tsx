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
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';

const ITEMS_PER_PAGE = 15;
const LOAI_OPTIONS: LoaiTaiLieu[] = ['SoTay', 'GiaoTrinh'];

const TRANG_THAI_LABEL: Record<TaiLieu['trangThai'], string> = {
  DaXuLy: 'Đã xử lý',
  DangXuLy: 'Đang xử lý',
  Loi: 'Lỗi',
};

type SortField = 'tenFile' | 'loaiMonHoc' | 'kichThuoc' | 'ngayTaiLen' | 'nguoiTaiLen' | 'trangThai';

function formatThoiGian(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function loaiMonHocLabel(t: TaiLieu): string {
  return t.tenMonHoc ? `${LOAI_TAI_LIEU_LABEL[t.loaiTaiLieu]} - ${t.tenMonHoc}` : LOAI_TAI_LIEU_LABEL[t.loaiTaiLieu];
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
  const [sortField, setSortField] = useState<SortField>('ngayTaiLen');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const [filterTenFile, setFilterTenFile] = useState<Set<string> | null>(null);
  const [filterLoaiMonHoc, setFilterLoaiMonHoc] = useState<Set<string> | null>(null);
  const [filterKichThuoc, setFilterKichThuoc] = useState<Set<string> | null>(null);
  const [filterNgayTaiLen, setFilterNgayTaiLen] = useState<Set<string> | null>(null);
  const [filterNguoiTaiLen, setFilterNguoiTaiLen] = useState<Set<string> | null>(null);
  const [filterTrangThai, setFilterTrangThai] = useState<Set<string> | null>(null);

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

  const optionsTenFile = useMemo(
    () => [...new Set(items.map((i) => i.tenFile))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsLoaiMonHoc = useMemo(
    () =>
      [...new Set(items.map(loaiMonHocLabel))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsKichThuoc = useMemo(
    () =>
      [...new Set(items.map((i) => i.kichThuocBytes))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: formatKichThuoc(v) })),
    [items],
  );
  const optionsNgayTaiLen = useMemo(
    () =>
      [...new Set(items.map((i) => i.ngayTaiLen))]
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map((v) => ({ value: v, label: formatThoiGian(v) })),
    [items],
  );
  const optionsNguoiTaiLen = useMemo(
    () =>
      [...new Set(items.map((i) => i.tenNguoiTaiLen))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsTrangThai = useMemo(
    () =>
      [...new Set(items.map((i) => i.trangThai))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: TRANG_THAI_LABEL[v] })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) {
      result = result.filter(
        (i) => i.tenFile.toLowerCase().includes(q) || (i.tenMonHoc ?? '').toLowerCase().includes(q),
      );
    }
    if (filterTenFile) result = result.filter((i) => filterTenFile.has(i.tenFile));
    if (filterLoaiMonHoc) result = result.filter((i) => filterLoaiMonHoc.has(loaiMonHocLabel(i)));
    if (filterKichThuoc) result = result.filter((i) => filterKichThuoc.has(String(i.kichThuocBytes)));
    if (filterNgayTaiLen) result = result.filter((i) => filterNgayTaiLen.has(i.ngayTaiLen));
    if (filterNguoiTaiLen) result = result.filter((i) => filterNguoiTaiLen.has(i.tenNguoiTaiLen));
    if (filterTrangThai) result = result.filter((i) => filterTrangThai.has(i.trangThai));

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'tenFile':
          cmp = a.tenFile.localeCompare(b.tenFile);
          break;
        case 'loaiMonHoc':
          cmp = loaiMonHocLabel(a).localeCompare(loaiMonHocLabel(b));
          break;
        case 'kichThuoc':
          cmp = a.kichThuocBytes - b.kichThuocBytes;
          break;
        case 'ngayTaiLen':
          cmp = new Date(a.ngayTaiLen).getTime() - new Date(b.ngayTaiLen).getTime();
          break;
        case 'nguoiTaiLen':
          cmp = a.tenNguoiTaiLen.localeCompare(b.tenNguoiTaiLen);
          break;
        case 'trangThai':
          cmp = a.trangThai.localeCompare(b.trangThai);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [
    items,
    search,
    sortField,
    sortDir,
    filterTenFile,
    filterLoaiMonHoc,
    filterKichThuoc,
    filterNgayTaiLen,
    filterNguoiTaiLen,
    filterTrangThai,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function setSort(field: SortField, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

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
      {/* === HEADER ROW: Title + search === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý tài liệu</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} tài liệu
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên file hoặc môn học"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* === UPLOAD TOOLBAR === */}
      <div className="flex flex-shrink-0 flex-wrap items-end gap-3 border-b border-gray-200 bg-gray-50/60 px-4 py-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-600">Loại tài liệu</label>
          <select
            value={loaiTaiLieu}
            onChange={(e) => setLoaiTaiLieu(e.target.value as LoaiTaiLieu)}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
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

        <div className="min-w-[260px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-600">Tệp PDF</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded border border-gray-300 bg-white text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-gray-100 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Đang xử lý...' : 'Xác nhận tải lên'}
        </button>
      </div>

      {error && <div className="flex-shrink-0 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* === TABLE === */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-blue-50">
              <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                No.
              </th>
              <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tên file</span>
                  <ExcelColumnFilter
                    options={optionsTenFile}
                    selected={filterTenFile}
                    onChange={(s) => {
                      setFilterTenFile(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'tenFile' ? sortDir : null}
                    onSort={(dir) => setSort('tenFile', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-52 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Loại / Môn học</span>
                  <ExcelColumnFilter
                    options={optionsLoaiMonHoc}
                    selected={filterLoaiMonHoc}
                    onChange={(s) => {
                      setFilterLoaiMonHoc(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'loaiMonHoc' ? sortDir : null}
                    onSort={(dir) => setSort('loaiMonHoc', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Dung lượng</span>
                  <ExcelColumnFilter
                    options={optionsKichThuoc}
                    selected={filterKichThuoc}
                    onChange={(s) => {
                      setFilterKichThuoc(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'kichThuoc' ? sortDir : null}
                    onSort={(dir) => setSort('kichThuoc', dir)}
                    sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                  />
                </div>
              </th>
              <th className="w-48 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Thời gian tải lên</span>
                  <ExcelColumnFilter
                    options={optionsNgayTaiLen}
                    selected={filterNgayTaiLen}
                    onChange={(s) => {
                      setFilterNgayTaiLen(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'ngayTaiLen' ? sortDir : null}
                    onSort={(dir) => setSort('ngayTaiLen', dir)}
                    sortLabels={['Cũ → Mới', 'Mới → Cũ']}
                  />
                </div>
              </th>
              <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Chủ đăng tải</span>
                  <ExcelColumnFilter
                    options={optionsNguoiTaiLen}
                    selected={filterNguoiTaiLen}
                    onChange={(s) => {
                      setFilterNguoiTaiLen(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'nguoiTaiLen' ? sortDir : null}
                    onSort={(dir) => setSort('nguoiTaiLen', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-gray-600">Tình trạng</span>
                  <ExcelColumnFilter
                    options={optionsTrangThai}
                    selected={filterTrangThai}
                    onChange={(s) => {
                      setFilterTrangThai(s);
                      setPage(1);
                    }}
                    sortDir={sortField === 'trangThai' ? sortDir : null}
                    onSort={(dir) => setSort('trangThai', dir)}
                    sortLabels={['A → Z', 'Z → A']}
                  />
                </div>
              </th>
              <th className="w-28 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Thao tác
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
                  <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>{items.length === 0 ? 'Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên.' : 'Không có tài liệu phù hợp.'}</p>
                </td>
              </tr>
            )}
            {!loading &&
              paginated.map((item, idx) => {
                const globalIndex = startIndex + idx;
                return (
                  <tr key={item.maTaiLieu} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                    <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                      {globalIndex + 1}
                    </td>
                    <td className="border-r border-gray-200 px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => downloadTaiLieu(item.maTaiLieu, item.tenFile)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {item.tenFile}
                      </button>
                      {item.ghiChuXuLy && <div className="mt-0.5 text-xs text-amber-600">{item.ghiChuXuLy}</div>}
                    </td>
                    <td className="w-52 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      <div>{LOAI_TAI_LIEU_LABEL[item.loaiTaiLieu]}</div>
                      {item.tenMonHoc && <div className="text-sm text-gray-400">{item.tenMonHoc}</div>}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {formatKichThuoc(item.kichThuocBytes)}
                      <span className="text-sm text-gray-400"> · {item.soTrang} tr</span>
                    </td>
                    <td className="w-48 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {formatThoiGian(item.ngayTaiLen)}
                    </td>
                    <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {item.tenNguoiTaiLen}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm">{badgeTrangThai(item.trangThai)}</td>
                    <td className="w-28 px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          title="Tải về"
                          onClick={() => downloadTaiLieu(item.maTaiLieu, item.tenFile)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                        >
                          <Download className="h-4 w-4" />
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
            Trang {page} / {totalPages} ({filtered.length} tài liệu)
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
      </div>
    </div>
  );
}
