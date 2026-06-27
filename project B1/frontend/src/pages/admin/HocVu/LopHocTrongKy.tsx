import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Pencil, Trash2, Search, X, Ban, Users } from 'lucide-react';
import {
  type LopHocTrongKy as LopHocTrongKyModel,
  type LopHocTrongKyInput,
  type LichHocInput,
  getLopHocTrongKys,
  createLopHocTrongKy,
  updateLopHocTrongKy,
  deleteLopHocTrongKy,
  huyLopHocTrongKy,
} from '../../../services/lopHocTrongKyService';
import { type HocKy, getHocKys } from '../../../services/hocKyService';
import { type MonHoc, getMonHocs } from '../../../services/monHocService';
import { type GiangVien, getGiangViens } from '../../../services/giangVienService';
import Modal from '../../../components/Modal';
import SearchableSelect from '../../../components/SearchableSelect';
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';
import { usePortalBase } from '../../../hooks/usePortalBase';

const ITEMS_PER_PAGE = 15;
const LOAI_HINH_OPTIONS = ['Lý thuyết', 'Thực hành'] as const;

type SortField = 'lopHocPhan' | 'loaiHinh' | 'soTinChi' | 'giangVien';

const THU_OPTIONS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
  { value: 8, label: 'Chủ nhật' },
];

function tenThu(thu: number): string {
  return THU_OPTIONS.find((t) => t.value === thu)?.label ?? `Thứ ${thu}`;
}

function formatNgay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function dsTiet(bd: number, kt: number): string {
  const arr: number[] = [];
  for (let t = bd; t <= kt; t++) arr.push(t);
  return arr.join(', ');
}

function lopHocPhanLabel(item: LopHocTrongKyModel): string {
  return `${item.tenMonHoc} (${item.tenLop})`;
}

// Tên lớp lưu trong DB là "TênMônHọc N01" — form chỉ cho nhập phần hậu tố (N01) để gõ nhanh hơn.
function tachHauToTenLop(tenLop: string, tenMonHoc: string): string {
  if (tenMonHoc && tenLop.startsWith(tenMonHoc + ' ')) return tenLop.slice(tenMonHoc.length + 1);
  return tenLop;
}

const EMPTY_LICH: LichHocInput = { thu: 2, tietBatDau: 1, tietKetThuc: 2, ngayBatDau: '', ngayKetThuc: '', phongHoc: '' };
const EMPTY_FORM: LopHocTrongKyInput = {
  tenLop: '',
  loaiHinh: LOAI_HINH_OPTIONS[0],
  siSoToiDa: 60,
  maGiangVien: null,
  lichHocs: [{ ...EMPTY_LICH }],
};

export default function LopHocTrongKyPage() {
  const navigate = useNavigate();
  const portalBase = usePortalBase();
  const [hocKys, setHocKys] = useState<HocKy[]>([]);
  const [monHocs, setMonHocs] = useState<MonHoc[]>([]);
  const [giangViens, setGiangViens] = useState<GiangVien[]>([]);
  const [items, setItems] = useState<LopHocTrongKyModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [maHocKy, setMaHocKy] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('lopHocPhan');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const [filterLopHocPhan, setFilterLopHocPhan] = useState<Set<string> | null>(null);
  const [filterLoaiHinh, setFilterLoaiHinh] = useState<Set<string> | null>(null);
  const [filterSoTinChi, setFilterSoTinChi] = useState<Set<string> | null>(null);
  const [filterGiangVien, setFilterGiangVien] = useState<Set<string> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LopHocTrongKyModel | null>(null);
  const [formMaMonHoc, setFormMaMonHoc] = useState<number | ''>('');
  const [form, setForm] = useState<LopHocTrongKyInput>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadMeta() {
    try {
      const [hocKyData, monHocData, giangVienData] = await Promise.all([
        getHocKys(),
        getMonHocs(),
        getGiangViens(),
      ]);
      setHocKys(hocKyData);
      setMonHocs(monHocData);
      setGiangViens(giangVienData);
      if (hocKyData.length > 0) setMaHocKy(hocKyData[0].maHocKy);
    } catch {
      setError('Không thể tải dữ liệu danh mục');
    }
  }

  async function loadLop(currentMaHocKy: number) {
    setLoading(true);
    setError('');
    try {
      const data = await getLopHocTrongKys(currentMaHocKy);
      setItems(data);
    } catch {
      setError('Không thể tải danh sách lớp học theo kỳ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    if (maHocKy) loadLop(maHocKy);
    else setItems([]);
    setPage(1);
  }, [maHocKy]);

  const optionsLopHocPhan = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.tenMonHoc.localeCompare(b.tenMonHoc) || a.tenLop.localeCompare(b.tenLop))
        .map(lopHocPhanLabel)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsLoaiHinh = useMemo(
    () => [...new Set(items.map((i) => i.loaiHinh))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [items],
  );
  const optionsSoTinChi = useMemo(
    () =>
      [...new Set(items.map((i) => i.soTinChi))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: String(v) })),
    [items],
  );
  const optionsGiangVien = useMemo(
    () =>
      [...new Set(items.map((i) => i.tenGiangVien ?? '-'))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items;
    if (q) result = result.filter((i) => i.tenLop.toLowerCase().includes(q) || i.tenMonHoc.toLowerCase().includes(q));
    if (filterLopHocPhan) result = result.filter((i) => filterLopHocPhan.has(lopHocPhanLabel(i)));
    if (filterLoaiHinh) result = result.filter((i) => filterLoaiHinh.has(i.loaiHinh));
    if (filterSoTinChi) result = result.filter((i) => filterSoTinChi.has(String(i.soTinChi)));
    if (filterGiangVien) result = result.filter((i) => filterGiangVien.has(i.tenGiangVien ?? '-'));

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lopHocPhan':
          cmp = a.tenMonHoc.localeCompare(b.tenMonHoc) || a.tenLop.localeCompare(b.tenLop);
          break;
        case 'loaiHinh':
          cmp = a.loaiHinh.localeCompare(b.loaiHinh);
          break;
        case 'soTinChi':
          cmp = a.soTinChi - b.soTinChi;
          break;
        case 'giangVien':
          cmp = (a.tenGiangVien ?? '-').localeCompare(b.tenGiangVien ?? '-');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, search, sortField, sortDir, filterLopHocPhan, filterLoaiHinh, filterSoTinChi, filterGiangVien]);

  function setSort(field: SortField, dir: SortDir) {
    setSortField(field);
    setSortDir(dir);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Buổi học mới mặc định khoảng ngày bằng khoảng ngày của học kỳ đang chọn cho tiện.
  function taoLichMoi(): LichHocInput {
    const hk = hocKys.find((h) => h.maHocKy === maHocKy);
    return { ...EMPTY_LICH, ngayBatDau: hk?.ngayBatDau ?? '', ngayKetThuc: hk?.ngayKetThuc ?? '' };
  }

  function openAddModal() {
    setEditing(null);
    setFormMaMonHoc(monHocs[0]?.maMonHoc ?? '');
    setForm({ ...EMPTY_FORM, lichHocs: [taoLichMoi()] });
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(item: LopHocTrongKyModel) {
    setEditing(item);
    setFormMaMonHoc(item.maMonHoc);
    setForm({
      tenLop: tachHauToTenLop(item.tenLop, item.tenMonHoc),
      loaiHinh: item.loaiHinh,
      siSoToiDa: item.siSoToiDa,
      maGiangVien: item.maGiangVien,
      lichHocs: item.lichHocs.map((l) => ({
        thu: l.thu,
        tietBatDau: l.tietBatDau,
        tietKetThuc: l.tietKetThuc,
        ngayBatDau: l.ngayBatDau,
        ngayKetThuc: l.ngayKetThuc,
        phongHoc: l.phongHoc ?? '',
      })),
    });
    setFormError('');
    setModalOpen(true);
  }

  function handleChonMonHoc(maMonHoc: number) {
    setFormMaMonHoc(maMonHoc);
    setForm((f) => ({ ...f, maGiangVien: null }));
  }

  const tenMonHocHienTai = editing
    ? editing.tenMonHoc
    : monHocs.find((m) => m.maMonHoc === formMaMonHoc)?.tenMonHoc ?? '';

  const monHocBoMon = monHocs.find((m) => m.maMonHoc === formMaMonHoc)?.maBoMon ?? null;

  const giangViensLoc = useMemo(() => {
    if (monHocBoMon == null) return giangViens;
    const loc = giangViens.filter((g) => g.maBoMon === monHocBoMon);
    if (form.maGiangVien != null && !loc.some((g) => g.maGiangVien === form.maGiangVien)) {
      const hienTai = giangViens.find((g) => g.maGiangVien === form.maGiangVien);
      if (hienTai) return [...loc, hienTai];
    }
    return loc;
  }, [giangViens, monHocBoMon, form.maGiangVien]);

  function addLichRow() {
    setForm((f) => ({ ...f, lichHocs: [...f.lichHocs, taoLichMoi()] }));
  }

  function removeLichRow(idx: number) {
    setForm((f) => ({ ...f, lichHocs: f.lichHocs.filter((_, i) => i !== idx) }));
  }

  function updateLichRow(idx: number, patch: Partial<LichHocInput>) {
    setForm((f) => ({
      ...f,
      lichHocs: f.lichHocs.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));
  }

  async function handleSave() {
    if (!maHocKy) {
      setFormError('Vui lòng chọn học kỳ');
      return;
    }
    const hauTo = form.tenLop.trim();
    if (!hauTo) {
      setFormError('Tên lớp không được để trống (VD: N01)');
      return;
    }
    if (!editing && !formMaMonHoc) {
      setFormError('Vui lòng chọn môn học');
      return;
    }
    if (!form.siSoToiDa || form.siSoToiDa <= 0) {
      setFormError('Sĩ số tối đa phải lớn hơn 0');
      return;
    }
    if (form.lichHocs.length === 0) {
      setFormError('Lớp học cần ít nhất 1 buổi học trong tuần');
      return;
    }
    if (form.lichHocs.some((l) => !l.ngayBatDau || !l.ngayKetThuc)) {
      setFormError('Mỗi buổi học cần có đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload: LopHocTrongKyInput = {
        ...form,
        tenLop: `${tenMonHocHienTai} ${hauTo}`.trim(),
        lichHocs: form.lichHocs.map((l) => ({ ...l, phongHoc: l.phongHoc?.trim() || null })),
      };
      if (editing) {
        await updateLopHocTrongKy(editing.maLopHocKy, payload);
      } else {
        await createLopHocTrongKy(Number(formMaMonHoc), Number(maHocKy), payload);
      }
      setModalOpen(false);
      await loadLop(Number(maHocKy));
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: LopHocTrongKyModel) {
    const confirmed = window.confirm(`Xoá lớp "${item.tenMonHoc} (${item.tenLop})"?`);
    if (!confirmed) return;
    try {
      await deleteLopHocTrongKy(item.maLopHocKy);
      await loadLop(Number(maHocKy));
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá lớp học này');
    }
  }

  async function handleHuyLop(item: LopHocTrongKyModel) {
    const confirmed = window.confirm(
      `HUỶ LỚP "${item.tenMonHoc} (${item.tenLop})"?\n\nLớp đang có ${item.soLuongDaDangKy} sinh viên đăng ký. ` +
        `Tất cả sẽ bị gỡ đăng ký và lớp sẽ bị xoá. Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;
    try {
      await huyLopHocTrongKy(item.maLopHocKy);
      await loadLop(Number(maHocKy));
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể huỷ lớp học này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-600" />
          <span className="text-base font-semibold text-gray-700">Quản lý Lớp học theo kỳ</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
            {items.length} lớp
          </span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          disabled={!maHocKy || monHocs.length === 0}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Thêm lớp học
        </button>
      </div>

      {/* === FILTER ROW === */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Học kỳ</label>
          <select
            value={maHocKy}
            onChange={(e) => setMaHocKy(e.target.value ? Number(e.target.value) : '')}
            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none"
          >
            <option value="">-- Chọn học kỳ --</option>
            {hocKys.map((h) => (
              <option key={h.maHocKy} value={h.maHocKy}>
                {h.tenHocKy} ({h.tenNamHoc})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-2 py-1.5">
          <input
            type="text"
            placeholder="Tìm theo tên lớp hoặc môn học"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56 bg-transparent text-sm outline-none"
          />
          <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
        </div>
      </div>

      {/* === TABLE === */}
      <div className="flex-1 overflow-auto">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        {!maHocKy && (
          <div className="px-4 py-12 text-center text-gray-400">
            <CalendarClock className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p>Vui lòng chọn học kỳ để xem danh sách lớp học</p>
          </div>
        )}

        {maHocKy && (
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-blue-50">
                <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                  No.
                </th>
                <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-600">Lớp học phần</span>
                    <ExcelColumnFilter
                      options={optionsLopHocPhan}
                      selected={filterLopHocPhan}
                      onChange={(s) => {
                        setFilterLopHocPhan(s);
                        setPage(1);
                      }}
                      sortDir={sortField === 'lopHocPhan' ? sortDir : null}
                      onSort={(dir) => setSort('lopHocPhan', dir)}
                      sortLabels={['A → Z', 'Z → A']}
                    />
                  </div>
                </th>
                <th className="w-40 border-b border-r border-gray-200 px-3 py-2 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-600">Loại hình</span>
                    <ExcelColumnFilter
                      options={optionsLoaiHinh}
                      selected={filterLoaiHinh}
                      onChange={(s) => {
                        setFilterLoaiHinh(s);
                        setPage(1);
                      }}
                      sortDir={sortField === 'loaiHinh' ? sortDir : null}
                      onSort={(dir) => setSort('loaiHinh', dir)}
                      sortLabels={['A → Z', 'Z → A']}
                    />
                  </div>
                </th>
                <th className="w-20 border-b border-r border-gray-200 px-3 py-2 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-600">TC</span>
                    <ExcelColumnFilter
                      options={optionsSoTinChi}
                      selected={filterSoTinChi}
                      onChange={(s) => {
                        setFilterSoTinChi(s);
                        setPage(1);
                      }}
                      sortDir={sortField === 'soTinChi' ? sortDir : null}
                      onSort={(dir) => setSort('soTinChi', dir)}
                      sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                    />
                  </div>
                </th>
                <th className="w-72 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                  Thời gian & Địa điểm
                </th>
                <th className="w-52 border-b border-r border-gray-200 px-3 py-2 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-600">Giảng viên</span>
                    <ExcelColumnFilter
                      options={optionsGiangVien}
                      selected={filterGiangVien}
                      onChange={(s) => {
                        setFilterGiangVien(s);
                        setPage(1);
                      }}
                      sortDir={sortField === 'giangVien' ? sortDir : null}
                      onSort={(dir) => setSort('giangVien', dir)}
                      sortLabels={['A → Z', 'Z → A']}
                    />
                  </div>
                </th>
                <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                  Sĩ số
                </th>
                <th className="w-40 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
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
                    <CalendarClock className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <p>Chưa có lớp học nào trong học kỳ này</p>
                  </td>
                </tr>
              )}

              {!loading &&
                paginated.map((item, idx) => {
                  const globalIndex = startIndex + idx;
                  return (
                    <tr key={item.maLopHocKy} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                      <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                        {globalIndex + 1}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                        {item.tenMonHoc} ({item.tenLop})
                      </td>
                      <td className="w-20 border-r border-gray-200 px-3 py-2 text-sm">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.loaiHinh === 'Lý thuyết'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.loaiHinh}
                        </span>
                      </td>
                      <td className="w-20 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                        {item.soTinChi}
                      </td>
                      <td className="w-72 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                        {item.lichHocs.map((l) => (
                          <div key={l.maLich} className="mb-1.5 last:mb-0">
                            <div className="text-xs text-gray-400">
                              Từ ngày {formatNgay(l.ngayBatDau)} đến ngày {formatNgay(l.ngayKetThuc)}
                            </div>
                            <div>
                              {tenThu(l.thu)} - Tiết {dsTiet(l.tietBatDau, l.tietKetThuc)}
                              {l.phongHoc ? (
                                <>
                                  {' - '}
                                  <span className="text-blue-600">{l.phongHoc}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </td>
                      <td className="w-52 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                        {item.tenGiangVien ?? <span className="text-gray-400">-</span>}
                      </td>
                      <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <span className="text-blue-600">{item.soLuongDaDangKy}</span>/{item.siSoToiDa}
                      </td>
                      <td className="w-40 px-3 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Xem danh sách sinh viên / nhập điểm"
                            onClick={() => navigate(`${portalBase}/hoc-vu/diem?maLopHocKy=${item.maLopHocKy}`)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Sửa"
                            onClick={() => openEditModal(item)}
                            className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {item.soLuongDaDangKy > 0 ? (
                            <button
                              type="button"
                              title="Huỷ lớp (gỡ đăng ký toàn bộ sinh viên & xoá lớp)"
                              onClick={() => handleHuyLop(item)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-orange-200 text-orange-500 hover:border-orange-300 hover:bg-orange-50"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Xoá"
                              onClick={() => handleDelete(item)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>

      {/* === PAGINATION FOOTER === */}
      {maHocKy && (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          <div>
            <span className="rounded border border-gray-300 px-2 py-1 text-sm">{ITEMS_PER_PAGE} / trang</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2">
              Trang {page} / {totalPages} ({filtered.length} lớp)
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
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Sửa lớp học theo kỳ' : 'Thêm lớp học theo kỳ'}
          onClose={() => setModalOpen(false)}
          maxWidthClassName="max-w-[560px]"
        >
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {!editing && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="maMonHoc">
                  Môn học
                </label>
                <SearchableSelect
                  id="maMonHoc"
                  value={formMaMonHoc}
                  onChange={handleChonMonHoc}
                  placeholder="Gõ để tìm môn học..."
                  options={monHocs.map((m) => ({ value: m.maMonHoc, label: `${m.tenMonHoc} (${m.soTinChi} TC)` }))}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="tenLop">
                Tên lớp (chỉ nhập hậu tố, VD: N01)
              </label>
              <input
                id="tenLop"
                type="text"
                value={form.tenLop}
                onChange={(e) => setForm((f) => ({ ...f, tenLop: e.target.value }))}
                placeholder="VD: N01 hoặc N01.TH1"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-gray-400">
                Tên lớp đầy đủ sẽ là:{' '}
                <span className="font-medium text-gray-600">
                  {tenMonHocHienTai || '...'} {form.tenLop.trim() || '...'}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="loaiHinh">
                  Loại hình
                </label>
                <select
                  id="loaiHinh"
                  value={form.loaiHinh}
                  onChange={(e) => setForm((f) => ({ ...f, loaiHinh: e.target.value }))}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {LOAI_HINH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="siSoToiDa">
                  Sĩ số tối đa
                </label>
                <input
                  id="siSoToiDa"
                  type="number"
                  min={1}
                  value={form.siSoToiDa}
                  onChange={(e) => setForm((f) => ({ ...f, siSoToiDa: Number(e.target.value) }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="maGiangVien">
                Giảng viên (không bắt buộc)
              </label>
              <select
                id="maGiangVien"
                value={form.maGiangVien ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maGiangVien: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- Chưa phân công --</option>
                {giangViensLoc.map((g) => (
                  <option key={g.maGiangVien} value={g.maGiangVien}>
                    {g.hoTen} ({g.tenBoMon ?? g.tenKhoaVien ?? 'Chưa rõ đơn vị'})
                  </option>
                ))}
              </select>
              {monHocBoMon != null && giangViensLoc.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">Bộ môn của môn học này chưa có giảng viên nào.</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Buổi học trong tuần</label>
                <button
                  type="button"
                  onClick={addLichRow}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm buổi
                </button>
              </div>

              <div className="space-y-2">
                {form.lichHocs.map((l, idx) => (
                  <div key={idx} className="rounded border border-gray-200 p-2">
                    <div className="flex items-end gap-1.5">
                      <div className="w-24">
                        <label className="mb-1 block text-xs text-gray-500">Thứ</label>
                        <select
                          value={l.thu}
                          onChange={(e) => updateLichRow(idx, { thu: Number(e.target.value) })}
                          className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs outline-none"
                        >
                          {THU_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="mb-1 block text-xs text-gray-500">Tiết từ</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={l.tietBatDau}
                          onChange={(e) => updateLichRow(idx, { tietBatDau: Number(e.target.value) })}
                          className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs outline-none"
                        />
                      </div>
                      <div className="w-16">
                        <label className="mb-1 block text-xs text-gray-500">đến tiết</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={l.tietKetThuc}
                          onChange={(e) => updateLichRow(idx, { tietKetThuc: Number(e.target.value) })}
                          className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Phòng học</label>
                        <input
                          type="text"
                          value={l.phongHoc ?? ''}
                          onChange={(e) => updateLichRow(idx, { phongHoc: e.target.value })}
                          placeholder="VD: 320-A4"
                          className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLichRow(idx)}
                        disabled={form.lichHocs.length === 1}
                        title="Bỏ buổi này"
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-end gap-1.5">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Từ ngày</label>
                        <input
                          type="date"
                          value={l.ngayBatDau}
                          onChange={(e) => updateLichRow(idx, { ngayBatDau: e.target.value })}
                          className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-gray-500">Đến ngày</label>
                        <input
                          type="date"
                          value={l.ngayKetThuc}
                          onChange={(e) => updateLichRow(idx, { ngayKetThuc: e.target.value })}
                          className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs outline-none"
                        />
                      </div>
                      <div className="h-7 w-7 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Buổi sáng: tiết 1-5 (7h-12h) · Buổi chiều: tiết 6-10 (13h-18h). Mỗi buổi học không được vượt qua cả 2
                khoảng này.
              </p>
            </div>

            {formError && <div className="text-sm text-red-600">{formError}</div>}

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
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
          </div>
        </Modal>
      )}
    </div>
  );
}
