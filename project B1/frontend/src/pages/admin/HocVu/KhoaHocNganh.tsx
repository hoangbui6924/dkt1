import { useEffect, useMemo, useState } from 'react';
import { Layers3, Users, GraduationCap, Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  type KhoaHocNganh as KhoaHocNganhModel,
  getKhoaHocNganhs,
  createKhoaHocNganh,
  updateKhoaHocNganh,
  deleteKhoaHocNganh,
} from '../../../services/khoaHocNganhService';
import {
  type NhomLopNganh as NhomLopNganhModel,
  getNhomLopNganhs,
  createNhomLopNganh,
  updateNhomLopNganh,
  deleteNhomLopNganh,
} from '../../../services/nhomLopNganhService';
import { type NganhHoc, getNganhHocs } from '../../../services/nganhHocService';
import Modal from '../../../components/Modal';
import ExcelColumnFilter, { type SortDir } from '../../../components/ExcelColumnFilter';
import SinhVienTheoNhomTab from './SinhVienTheoNhomTab';

const ITEMS_PER_PAGE = 15;

type Tab = 'khoaHoc' | 'nhomLop' | 'sinhVien';
type KhoaHocSortField = 'tenKhoaHoc' | 'nganh' | 'khoaVien' | 'namNhapHoc' | 'soNhomLop';
type NhomLopSortField = 'tenNhomLop' | 'khoaHoc' | 'nganh' | 'soSinhVien' | 'coVan';

export default function KhoaHocNganhPage() {
  const [activeTab, setActiveTab] = useState<Tab>('khoaHoc');

  const [khoaHocs, setKhoaHocs] = useState<KhoaHocNganhModel[]>([]);
  const [nhomLops, setNhomLops] = useState<NhomLopNganhModel[]>([]);
  const [nganhHocs, setNganhHocs] = useState<NganhHoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // === Tab 1: Khoá học ngành ===
  const [khoaHocSearch, setKhoaHocSearch] = useState('');
  const [khoaHocSortField, setKhoaHocSortField] = useState<KhoaHocSortField>('tenKhoaHoc');
  const [khoaHocSortDir, setKhoaHocSortDir] = useState<SortDir>('desc');
  const [khoaHocPage, setKhoaHocPage] = useState(1);

  const [filterKhoaHocTen, setFilterKhoaHocTen] = useState<Set<string> | null>(null);
  const [filterKhoaHocNganh, setFilterKhoaHocNganh] = useState<Set<string> | null>(null);
  const [filterKhoaHocKhoaVien, setFilterKhoaHocKhoaVien] = useState<Set<string> | null>(null);
  const [filterKhoaHocNam, setFilterKhoaHocNam] = useState<Set<string> | null>(null);
  const [filterKhoaHocSoNhomLop, setFilterKhoaHocSoNhomLop] = useState<Set<string> | null>(null);

  const [khoaHocModalOpen, setKhoaHocModalOpen] = useState(false);
  const [editingKhoaHoc, setEditingKhoaHoc] = useState<KhoaHocNganhModel | null>(null);
  const [khoaHocFormTen, setKhoaHocFormTen] = useState('');
  const [khoaHocFormMaNganh, setKhoaHocFormMaNganh] = useState<number | ''>('');
  const [khoaHocFormNamNhapHoc, setKhoaHocFormNamNhapHoc] = useState<number>(new Date().getFullYear());
  const [khoaHocFormError, setKhoaHocFormError] = useState('');
  const [savingKhoaHoc, setSavingKhoaHoc] = useState(false);

  // === Tab 2: Nhóm lớp ngành ===
  const [nhomLopSearch, setNhomLopSearch] = useState('');
  const [nhomLopSortField, setNhomLopSortField] = useState<NhomLopSortField>('tenNhomLop');
  const [nhomLopSortDir, setNhomLopSortDir] = useState<SortDir>('asc');
  const [nhomLopPage, setNhomLopPage] = useState(1);

  const [filterNhomLopTen, setFilterNhomLopTen] = useState<Set<string> | null>(null);
  const [filterNhomLopKhoaHoc, setFilterNhomLopKhoaHoc] = useState<Set<string> | null>(null);
  const [filterNhomLopNganh, setFilterNhomLopNganh] = useState<Set<string> | null>(null);
  const [filterNhomLopSoSV, setFilterNhomLopSoSV] = useState<Set<string> | null>(null);
  const [filterNhomLopCoVan, setFilterNhomLopCoVan] = useState<Set<string> | null>(null);

  const [nhomLopModalOpen, setNhomLopModalOpen] = useState(false);
  const [editingNhomLop, setEditingNhomLop] = useState<NhomLopNganhModel | null>(null);
  const [nhomLopFormTen, setNhomLopFormTen] = useState('');
  const [nhomLopFormMaKhoaHoc, setNhomLopFormMaKhoaHoc] = useState<number | ''>('');
  const [nhomLopFormError, setNhomLopFormError] = useState('');
  const [savingNhomLop, setSavingNhomLop] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [khoaHocData, nhomLopData, nganhData] = await Promise.all([
        getKhoaHocNganhs(),
        getNhomLopNganhs(),
        getNganhHocs(),
      ]);
      setKhoaHocs(khoaHocData);
      setNhomLops(nhomLopData);
      setNganhHocs(nganhData);
    } catch {
      setError('Không thể tải dữ liệu khoá học ngành');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --- Khoá học ngành: filter/paginate ---
  const optionsKhoaHocTen = useMemo(
    () => [...new Set(khoaHocs.map((i) => i.tenKhoaHoc))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [khoaHocs],
  );
  const optionsKhoaHocNganh = useMemo(
    () => [...new Set(khoaHocs.map((i) => i.tenNganh))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [khoaHocs],
  );
  const optionsKhoaHocKhoaVien = useMemo(
    () => [...new Set(khoaHocs.map((i) => i.tenKhoaVien))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [khoaHocs],
  );
  const optionsKhoaHocNam = useMemo(
    () =>
      [...new Set(khoaHocs.map((i) => String(i.namNhapHoc || '-')))]
        .sort((a, b) => (a === '-' ? -1 : b === '-' ? 1 : Number(a) - Number(b)))
        .map((v) => ({ value: v, label: v })),
    [khoaHocs],
  );
  const optionsKhoaHocSoNhomLop = useMemo(
    () =>
      [...new Set(khoaHocs.map((i) => i.soNhomLop))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: String(v) })),
    [khoaHocs],
  );

  const filteredKhoaHocs = useMemo(() => {
    const q = khoaHocSearch.trim().toLowerCase();
    let result = khoaHocs;
    if (q) result = result.filter((i) => i.tenKhoaHoc.toLowerCase().includes(q));
    if (filterKhoaHocTen) result = result.filter((i) => filterKhoaHocTen.has(i.tenKhoaHoc));
    if (filterKhoaHocNganh) result = result.filter((i) => filterKhoaHocNganh.has(i.tenNganh));
    if (filterKhoaHocKhoaVien) result = result.filter((i) => filterKhoaHocKhoaVien.has(i.tenKhoaVien));
    if (filterKhoaHocNam) result = result.filter((i) => filterKhoaHocNam.has(String(i.namNhapHoc || '-')));
    if (filterKhoaHocSoNhomLop) result = result.filter((i) => filterKhoaHocSoNhomLop.has(String(i.soNhomLop)));

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (khoaHocSortField) {
        case 'tenKhoaHoc':
          cmp = a.tenKhoaHoc.localeCompare(b.tenKhoaHoc);
          break;
        case 'nganh':
          cmp = a.tenNganh.localeCompare(b.tenNganh);
          break;
        case 'khoaVien':
          cmp = a.tenKhoaVien.localeCompare(b.tenKhoaVien);
          break;
        case 'namNhapHoc':
          cmp = (a.namNhapHoc || 0) - (b.namNhapHoc || 0);
          break;
        case 'soNhomLop':
          cmp = a.soNhomLop - b.soNhomLop;
          break;
      }
      return khoaHocSortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    khoaHocs,
    khoaHocSearch,
    khoaHocSortField,
    khoaHocSortDir,
    filterKhoaHocTen,
    filterKhoaHocNganh,
    filterKhoaHocKhoaVien,
    filterKhoaHocNam,
    filterKhoaHocSoNhomLop,
  ]);

  function setKhoaHocSort(field: KhoaHocSortField, dir: SortDir) {
    setKhoaHocSortField(field);
    setKhoaHocSortDir(dir);
  }

  const khoaHocTotalPages = Math.max(1, Math.ceil(filteredKhoaHocs.length / ITEMS_PER_PAGE));
  const khoaHocStartIndex = (khoaHocPage - 1) * ITEMS_PER_PAGE;
  const paginatedKhoaHocs = filteredKhoaHocs.slice(khoaHocStartIndex, khoaHocStartIndex + ITEMS_PER_PAGE);

  function openAddKhoaHoc() {
    setEditingKhoaHoc(null);
    setKhoaHocFormTen('');
    setKhoaHocFormMaNganh(nganhHocs[0]?.maNganh ?? '');
    setKhoaHocFormNamNhapHoc(new Date().getFullYear());
    setKhoaHocFormError('');
    setKhoaHocModalOpen(true);
  }

  function openEditKhoaHoc(item: KhoaHocNganhModel) {
    setEditingKhoaHoc(item);
    setKhoaHocFormTen(item.tenKhoaHoc);
    setKhoaHocFormMaNganh(item.maNganhHoc);
    setKhoaHocFormNamNhapHoc(item.namNhapHoc || new Date().getFullYear());
    setKhoaHocFormError('');
    setKhoaHocModalOpen(true);
  }

  async function handleSaveKhoaHoc() {
    const ten = khoaHocFormTen.trim();
    if (!ten) {
      setKhoaHocFormError('Tên khoá học không được để trống');
      return;
    }
    if (!khoaHocFormMaNganh) {
      setKhoaHocFormError('Vui lòng chọn ngành học');
      return;
    }
    if (!khoaHocFormNamNhapHoc || khoaHocFormNamNhapHoc < 2000 || khoaHocFormNamNhapHoc > 2100) {
      setKhoaHocFormError('Năm nhập học không hợp lệ');
      return;
    }
    setSavingKhoaHoc(true);
    setKhoaHocFormError('');
    try {
      if (editingKhoaHoc) {
        await updateKhoaHocNganh(editingKhoaHoc.maKhoaHocNganh, ten, Number(khoaHocFormMaNganh), khoaHocFormNamNhapHoc);
      } else {
        await createKhoaHocNganh(ten, Number(khoaHocFormMaNganh), khoaHocFormNamNhapHoc);
      }
      setKhoaHocModalOpen(false);
      await load();
    } catch (err: any) {
      setKhoaHocFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSavingKhoaHoc(false);
    }
  }

  async function handleDeleteKhoaHoc(item: KhoaHocNganhModel) {
    const confirmed = window.confirm(`Xoá khoá học "${item.tenKhoaHoc}" (${item.tenNganh})?`);
    if (!confirmed) return;
    try {
      await deleteKhoaHocNganh(item.maKhoaHocNganh);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá khoá học ngành này');
    }
  }

  // --- Nhóm lớp ngành: filter/paginate ---
  const optionsNhomLopTen = useMemo(
    () => [...new Set(nhomLops.map((i) => i.tenNhomLop))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [nhomLops],
  );
  const optionsNhomLopKhoaHoc = useMemo(
    () => [...new Set(nhomLops.map((i) => i.tenKhoaHoc))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [nhomLops],
  );
  const optionsNhomLopNganh = useMemo(
    () => [...new Set(nhomLops.map((i) => i.tenNganh))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
    [nhomLops],
  );
  const optionsNhomLopSoSV = useMemo(
    () =>
      [...new Set(nhomLops.map((i) => i.soSinhVien))]
        .sort((a, b) => a - b)
        .map((v) => ({ value: String(v), label: String(v) })),
    [nhomLops],
  );
  const optionsNhomLopCoVan = useMemo(
    () =>
      [...new Set(nhomLops.map((i) => i.tenCoVanHocTap ?? 'Chưa có'))]
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [nhomLops],
  );

  const filteredNhomLops = useMemo(() => {
    const q = nhomLopSearch.trim().toLowerCase();
    let result = nhomLops;
    if (q) result = result.filter((i) => i.tenNhomLop.toLowerCase().includes(q));
    if (filterNhomLopTen) result = result.filter((i) => filterNhomLopTen.has(i.tenNhomLop));
    if (filterNhomLopKhoaHoc) result = result.filter((i) => filterNhomLopKhoaHoc.has(i.tenKhoaHoc));
    if (filterNhomLopNganh) result = result.filter((i) => filterNhomLopNganh.has(i.tenNganh));
    if (filterNhomLopSoSV) result = result.filter((i) => filterNhomLopSoSV.has(String(i.soSinhVien)));
    if (filterNhomLopCoVan) result = result.filter((i) => filterNhomLopCoVan.has(i.tenCoVanHocTap ?? 'Chưa có'));

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (nhomLopSortField) {
        case 'tenNhomLop':
          cmp = a.tenNhomLop.localeCompare(b.tenNhomLop);
          break;
        case 'khoaHoc':
          cmp = a.tenKhoaHoc.localeCompare(b.tenKhoaHoc);
          break;
        case 'nganh':
          cmp = a.tenNganh.localeCompare(b.tenNganh);
          break;
        case 'soSinhVien':
          cmp = a.soSinhVien - b.soSinhVien;
          break;
        case 'coVan':
          cmp = (a.tenCoVanHocTap ?? 'Chưa có').localeCompare(b.tenCoVanHocTap ?? 'Chưa có');
          break;
      }
      return nhomLopSortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    nhomLops,
    nhomLopSearch,
    nhomLopSortField,
    nhomLopSortDir,
    filterNhomLopTen,
    filterNhomLopKhoaHoc,
    filterNhomLopNganh,
    filterNhomLopSoSV,
    filterNhomLopCoVan,
  ]);

  function setNhomLopSort(field: NhomLopSortField, dir: SortDir) {
    setNhomLopSortField(field);
    setNhomLopSortDir(dir);
  }

  const nhomLopTotalPages = Math.max(1, Math.ceil(filteredNhomLops.length / ITEMS_PER_PAGE));
  const nhomLopStartIndex = (nhomLopPage - 1) * ITEMS_PER_PAGE;
  const paginatedNhomLops = filteredNhomLops.slice(nhomLopStartIndex, nhomLopStartIndex + ITEMS_PER_PAGE);

  function openAddNhomLop() {
    setEditingNhomLop(null);
    setNhomLopFormTen('');
    setNhomLopFormMaKhoaHoc(khoaHocs[0]?.maKhoaHocNganh ?? '');
    setNhomLopFormError('');
    setNhomLopModalOpen(true);
  }

  function openEditNhomLop(item: NhomLopNganhModel) {
    setEditingNhomLop(item);
    setNhomLopFormTen(item.tenNhomLop);
    setNhomLopFormMaKhoaHoc(item.maKhoaHocNganh);
    setNhomLopFormError('');
    setNhomLopModalOpen(true);
  }

  async function handleSaveNhomLop() {
    const ten = nhomLopFormTen.trim();
    if (!ten) {
      setNhomLopFormError('Tên nhóm lớp không được để trống');
      return;
    }
    if (!nhomLopFormMaKhoaHoc) {
      setNhomLopFormError('Vui lòng chọn khoá học ngành');
      return;
    }
    setSavingNhomLop(true);
    setNhomLopFormError('');
    try {
      if (editingNhomLop) {
        await updateNhomLopNganh(editingNhomLop.maNhomLop, ten, Number(nhomLopFormMaKhoaHoc));
      } else {
        await createNhomLopNganh(ten, Number(nhomLopFormMaKhoaHoc));
      }
      setNhomLopModalOpen(false);
      await load();
    } catch (err: any) {
      setNhomLopFormError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setSavingNhomLop(false);
    }
  }

  async function handleDeleteNhomLop(item: NhomLopNganhModel) {
    const confirmed = window.confirm(`Xoá nhóm lớp "${item.tenNhomLop}" (${item.tenKhoaHoc})?`);
    if (!confirmed) return;
    try {
      await deleteNhomLopNganh(item.maNhomLop);
      await load();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể xoá nhóm lớp ngành này');
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* === HEADER: Title + tabs === */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('khoaHoc')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
              activeTab === 'khoaHoc' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layers3 className="h-4 w-4" /> Khoá học ngành
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === 'khoaHoc' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {khoaHocs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nhomLop')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
              activeTab === 'nhomLop' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4" /> Nhóm lớp ngành
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === 'nhomLop' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {nhomLops.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sinhVien')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
              activeTab === 'sinhVien' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <GraduationCap className="h-4 w-4" /> Sinh viên theo nhóm lớp
          </button>
        </div>

        {activeTab === 'khoaHoc' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhanh theo tên khoá học"
                value={khoaHocSearch}
                onChange={(e) => {
                  setKhoaHocSearch(e.target.value);
                  setKhoaHocPage(1);
                }}
                className="w-56 bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={openAddKhoaHoc}
              disabled={nganhHocs.length === 0}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Thêm khoá học ngành
            </button>
          </div>
        )}
        {activeTab === 'nhomLop' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1.5">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhanh theo tên nhóm lớp"
                value={nhomLopSearch}
                onChange={(e) => {
                  setNhomLopSearch(e.target.value);
                  setNhomLopPage(1);
                }}
                className="w-56 bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="button"
              onClick={openAddNhomLop}
              disabled={khoaHocs.length === 0}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Thêm nhóm lớp ngành
            </button>
          </div>
        )}
      </div>

      {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* === TAB: Khoá học ngành === */}
      {activeTab === 'khoaHoc' && (
        <>
          <div className="flex-1 overflow-auto">
            {!loading && nganhHocs.length === 0 && (
              <div className="px-4 py-2 text-sm text-amber-600">
                Chưa có ngành học nào. Vui lòng thêm ngành học trước khi tạo khoá học ngành.
              </div>
            )}

            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-50">
                  <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                    No.
                  </th>
                  <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Tên khoá học</span>
                      <ExcelColumnFilter
                        options={optionsKhoaHocTen}
                        selected={filterKhoaHocTen}
                        onChange={(s) => {
                          setFilterKhoaHocTen(s);
                          setKhoaHocPage(1);
                        }}
                        sortDir={khoaHocSortField === 'tenKhoaHoc' ? khoaHocSortDir : null}
                        onSort={(dir) => setKhoaHocSort('tenKhoaHoc', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-56 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Ngành học</span>
                      <ExcelColumnFilter
                        options={optionsKhoaHocNganh}
                        selected={filterKhoaHocNganh}
                        onChange={(s) => {
                          setFilterKhoaHocNganh(s);
                          setKhoaHocPage(1);
                        }}
                        sortDir={khoaHocSortField === 'nganh' ? khoaHocSortDir : null}
                        onSort={(dir) => setKhoaHocSort('nganh', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-56 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Khoa viện</span>
                      <ExcelColumnFilter
                        options={optionsKhoaHocKhoaVien}
                        selected={filterKhoaHocKhoaVien}
                        onChange={(s) => {
                          setFilterKhoaHocKhoaVien(s);
                          setKhoaHocPage(1);
                        }}
                        sortDir={khoaHocSortField === 'khoaVien' ? khoaHocSortDir : null}
                        onSort={(dir) => setKhoaHocSort('khoaVien', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Năm nhập học</span>
                      <ExcelColumnFilter
                        options={optionsKhoaHocNam}
                        selected={filterKhoaHocNam}
                        onChange={(s) => {
                          setFilterKhoaHocNam(s);
                          setKhoaHocPage(1);
                        }}
                        sortDir={khoaHocSortField === 'namNhapHoc' ? khoaHocSortDir : null}
                        onSort={(dir) => setKhoaHocSort('namNhapHoc', dir)}
                        sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                      />
                    </div>
                  </th>
                  <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Số nhóm lớp</span>
                      <ExcelColumnFilter
                        options={optionsKhoaHocSoNhomLop}
                        selected={filterKhoaHocSoNhomLop}
                        onChange={(s) => {
                          setFilterKhoaHocSoNhomLop(s);
                          setKhoaHocPage(1);
                        }}
                        sortDir={khoaHocSortField === 'soNhomLop' ? khoaHocSortDir : null}
                        onSort={(dir) => setKhoaHocSort('soNhomLop', dir)}
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
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                )}

                {!loading && paginatedKhoaHocs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <Layers3 className="mx-auto mb-2 h-10 w-10 opacity-40" />
                      <p>Không có dữ liệu</p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedKhoaHocs.map((item, idx) => {
                    const globalIndex = khoaHocStartIndex + idx;
                    return (
                      <tr key={item.maKhoaHocNganh} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                        <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                          {globalIndex + 1}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                          {item.tenKhoaHoc}
                        </td>
                        <td className="w-56 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.tenNganh}
                        </td>
                        <td className="w-56 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.tenKhoaVien}
                        </td>
                        <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.namNhapHoc || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.soNhomLop}
                        </td>
                        <td className="w-28 px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Sửa"
                              onClick={() => openEditKhoaHoc(item)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Xoá"
                              onClick={() => handleDeleteKhoaHoc(item)}
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

          <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            <span>
              Trang {khoaHocPage} / {khoaHocTotalPages} ({filteredKhoaHocs.length} khoá học)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setKhoaHocPage((p) => Math.max(1, p - 1))}
                disabled={khoaHocPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setKhoaHocPage((p) => Math.min(khoaHocTotalPages, p + 1))}
                disabled={khoaHocPage === khoaHocTotalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </>
      )}

      {/* === TAB: Nhóm lớp ngành === */}
      {activeTab === 'nhomLop' && (
        <>
          <div className="flex-1 overflow-auto">
            {!loading && khoaHocs.length === 0 && (
              <div className="px-4 py-2 text-sm text-amber-600">
                Chưa có khoá học ngành nào. Vui lòng thêm khoá học ngành trước khi tạo nhóm lớp.
              </div>
            )}

            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-50">
                  <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                    No.
                  </th>
                  <th className="border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Tên nhóm lớp</span>
                      <ExcelColumnFilter
                        options={optionsNhomLopTen}
                        selected={filterNhomLopTen}
                        onChange={(s) => {
                          setFilterNhomLopTen(s);
                          setNhomLopPage(1);
                        }}
                        sortDir={nhomLopSortField === 'tenNhomLop' ? nhomLopSortDir : null}
                        onSort={(dir) => setNhomLopSort('tenNhomLop', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-48 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Khoá học</span>
                      <ExcelColumnFilter
                        options={optionsNhomLopKhoaHoc}
                        selected={filterNhomLopKhoaHoc}
                        onChange={(s) => {
                          setFilterNhomLopKhoaHoc(s);
                          setNhomLopPage(1);
                        }}
                        sortDir={nhomLopSortField === 'khoaHoc' ? nhomLopSortDir : null}
                        onSort={(dir) => setNhomLopSort('khoaHoc', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-56 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Ngành học</span>
                      <ExcelColumnFilter
                        options={optionsNhomLopNganh}
                        selected={filterNhomLopNganh}
                        onChange={(s) => {
                          setFilterNhomLopNganh(s);
                          setNhomLopPage(1);
                        }}
                        sortDir={nhomLopSortField === 'nganh' ? nhomLopSortDir : null}
                        onSort={(dir) => setNhomLopSort('nganh', dir)}
                        sortLabels={['A → Z', 'Z → A']}
                      />
                    </div>
                  </th>
                  <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Số sinh viên</span>
                      <ExcelColumnFilter
                        options={optionsNhomLopSoSV}
                        selected={filterNhomLopSoSV}
                        onChange={(s) => {
                          setFilterNhomLopSoSV(s);
                          setNhomLopPage(1);
                        }}
                        sortDir={nhomLopSortField === 'soSinhVien' ? nhomLopSortDir : null}
                        onSort={(dir) => setNhomLopSort('soSinhVien', dir)}
                        sortLabels={['Thấp → Cao', 'Cao → Thấp']}
                      />
                    </div>
                  </th>
                  <th className="w-48 border-b border-r border-gray-200 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-gray-600">Cố vấn học tập</span>
                      <ExcelColumnFilter
                        options={optionsNhomLopCoVan}
                        selected={filterNhomLopCoVan}
                        onChange={(s) => {
                          setFilterNhomLopCoVan(s);
                          setNhomLopPage(1);
                        }}
                        sortDir={nhomLopSortField === 'coVan' ? nhomLopSortDir : null}
                        onSort={(dir) => setNhomLopSort('coVan', dir)}
                        sortLabels={['A → Z', 'Z → A']}
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
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      Đang tải...
                    </td>
                  </tr>
                )}

                {!loading && paginatedNhomLops.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
                      <p>Không có dữ liệu</p>
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedNhomLops.map((item, idx) => {
                    const globalIndex = nhomLopStartIndex + idx;
                    return (
                      <tr key={item.maNhomLop} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                        <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                          {globalIndex + 1}
                        </td>
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                          {item.tenNhomLop}
                        </td>
                        <td className="w-48 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.tenKhoaHoc}
                        </td>
                        <td className="w-56 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.tenNganh}
                        </td>
                        <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.soSinhVien}
                        </td>
                        <td className="w-48 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                          {item.tenCoVanHocTap ?? <span className="text-gray-400">Chưa có</span>}
                        </td>
                        <td className="w-28 px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Sửa"
                              onClick={() => openEditNhomLop(item)}
                              className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Xoá"
                              onClick={() => handleDeleteNhomLop(item)}
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

          <div className="flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
            <span>
              Trang {nhomLopPage} / {nhomLopTotalPages} ({filteredNhomLops.length} nhóm lớp)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setNhomLopPage((p) => Math.max(1, p - 1))}
                disabled={nhomLopPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              >
                &lsaquo;
              </button>
              <button
                onClick={() => setNhomLopPage((p) => Math.min(nhomLopTotalPages, p + 1))}
                disabled={nhomLopPage === nhomLopTotalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              >
                &rsaquo;
              </button>
            </div>
          </div>
        </>
      )}

      {/* === TAB: Sinh viên theo nhóm lớp === */}
      {activeTab === 'sinhVien' && (
        <SinhVienTheoNhomTab khoaHocs={khoaHocs} nhomLops={nhomLops} onReload={load} />
      )}

      {/* === MODAL: Thêm/Sửa khoá học ngành === */}
      {khoaHocModalOpen && (
        <Modal title={editingKhoaHoc ? 'Sửa khoá học ngành' : 'Thêm khoá học ngành'} onClose={() => setKhoaHocModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="khoaHocFormTen">
            Tên khoá học
          </label>
          <input
            id="khoaHocFormTen"
            type="text"
            value={khoaHocFormTen}
            onChange={(e) => setKhoaHocFormTen(e.target.value)}
            placeholder="VD: K65"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="khoaHocFormMaNganh">
            Ngành học
          </label>
          <select
            id="khoaHocFormMaNganh"
            value={khoaHocFormMaNganh}
            onChange={(e) => setKhoaHocFormMaNganh(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn ngành học --</option>
            {nganhHocs.map((n) => (
              <option key={n.maNganh} value={n.maNganh}>
                {n.tenNganh}
              </option>
            ))}
          </select>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="khoaHocFormNamNhapHoc">
            Năm nhập học
          </label>
          <input
            id="khoaHocFormNamNhapHoc"
            type="number"
            min={2000}
            max={2100}
            value={khoaHocFormNamNhapHoc}
            onChange={(e) => setKhoaHocFormNamNhapHoc(Number(e.target.value))}
            placeholder="VD: 2025"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            Năm sinh viên khoá này bắt đầu nhập học — dùng để tính sinh viên đang ở năm thứ mấy khi đăng ký học phần.
          </p>

          {khoaHocFormError && <div className="mt-1.5 text-sm text-red-600">{khoaHocFormError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setKhoaHocModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveKhoaHoc}
              disabled={savingKhoaHoc}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingKhoaHoc ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}

      {/* === MODAL: Thêm/Sửa nhóm lớp ngành === */}
      {nhomLopModalOpen && (
        <Modal title={editingNhomLop ? 'Sửa nhóm lớp ngành' : 'Thêm nhóm lớp ngành'} onClose={() => setNhomLopModalOpen(false)}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="nhomLopFormTen">
            Tên nhóm lớp
          </label>
          <input
            id="nhomLopFormTen"
            type="text"
            value={nhomLopFormTen}
            onChange={(e) => setNhomLopFormTen(e.target.value)}
            placeholder="VD: CNTT1-K65"
            autoFocus
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700" htmlFor="nhomLopFormMaKhoaHoc">
            Khoá học ngành
          </label>
          <select
            id="nhomLopFormMaKhoaHoc"
            value={nhomLopFormMaKhoaHoc}
            onChange={(e) => setNhomLopFormMaKhoaHoc(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">-- Chọn khoá học ngành --</option>
            {khoaHocs.map((k) => (
              <option key={k.maKhoaHocNganh} value={k.maKhoaHocNganh}>
                {k.tenKhoaHoc} ({k.tenNganh})
              </option>
            ))}
          </select>

          {nhomLopFormError && <div className="mt-1.5 text-sm text-red-600">{nhomLopFormError}</div>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNhomLopModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveNhomLop}
              disabled={savingNhomLop}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingNhomLop ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
