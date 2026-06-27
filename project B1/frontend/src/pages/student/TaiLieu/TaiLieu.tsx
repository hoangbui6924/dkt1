import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Search } from 'lucide-react';
import {
  type TaiLieuSinhVien,
  LOAI_TAI_LIEU_LABEL,
  getTaiLieuSinhVien,
  downloadTaiLieu,
  formatKichThuoc,
} from '../../../services/taiLieuService';
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';

const ITEMS_PER_PAGE = 15;

type SortField = 'tenFile' | 'loaiMonHoc' | 'kichThuoc';

function loaiMonHocLabel(t: TaiLieuSinhVien): string {
  return t.tenMonHoc ? `${LOAI_TAI_LIEU_LABEL[t.loaiTaiLieu]} - ${t.tenMonHoc}` : LOAI_TAI_LIEU_LABEL[t.loaiTaiLieu];
}

export default function StudentTaiLieuPage() {
  const [items, setItems] = useState<TaiLieuSinhVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('loaiMonHoc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const [filterTenFile, setFilterTenFile] = useState<Set<string> | null>(null);
  const [filterLoaiMonHoc, setFilterLoaiMonHoc] = useState<Set<string> | null>(null);
  const [filterKichThuoc, setFilterKichThuoc] = useState<Set<string> | null>(null);

  useEffect(() => {
    getTaiLieuSinhVien()
      .then(setItems)
      .catch(() => setError('Không thể tải danh sách tài liệu'))
      .finally(() => setLoading(false));
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
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [items, search, sortField, sortDir, filterTenFile, filterLoaiMonHoc, filterKichThuoc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  function setSort(field: SortField, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER ROW: Title + search === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Tài liệu môn học</span>
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
              <th className="w-100 border-b border-r border-gray-200 px-3 py-2 text-left">
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
              <th className="w-80 border-b border-r border-gray-200 px-3 py-2 text-left">
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
              <th className="w-50 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Đang tải...
                </td>
              </tr>
            )}

            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  <p>{items.length === 0 ? 'Hiện chưa có tài liệu nào được đăng tải.' : 'Không có tài liệu phù hợp.'}</p>
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
                    <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                      {item.tenFile}
                    </td>
                    <td className="w-64 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      <div>{LOAI_TAI_LIEU_LABEL[item.loaiTaiLieu]}</div>
                      {item.tenMonHoc && <div className="text-sm text-gray-400">{item.tenMonHoc}</div>}
                    </td>
                    <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                      {formatKichThuoc(item.kichThuocBytes)}
                      <span className="text-sm text-gray-400"> · {item.soTrang} tr</span>
                    </td>
                    <td className="w-28 px-3 py-2">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => downloadTaiLieu(item.maTaiLieu, item.tenFile)}
                          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <Download className="h-3.5 w-3.5" /> Tải về
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
