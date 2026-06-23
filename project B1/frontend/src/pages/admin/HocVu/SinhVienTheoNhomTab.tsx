import { useEffect, useMemo, useState } from 'react';
import { Users, UserCog, UserPlus, FileUp, Trash2, GraduationCap } from 'lucide-react';
import { type KhoaHocNganh } from '../../../services/khoaHocNganhService';
import {
  type NhomLopNganh,
  type SinhVienTrongNhom,
  getSinhViensTrongNhom,
  removeSinhVienKhoiNhom,
  setCoVan,
} from '../../../services/nhomLopNganhService';
import { type GiangVien, getGiangViens } from '../../../services/giangVienService';
import AddSinhVienToNhomModal from './AddSinhVienToNhomModal';
import ImportSinhVienVaoNhomModal from './ImportSinhVienVaoNhomModal';

const ITEMS_PER_PAGE = 15;

interface SinhVienTheoNhomTabProps {
  khoaHocs: KhoaHocNganh[];
  nhomLops: NhomLopNganh[];
  onReload: () => void;
}

export default function SinhVienTheoNhomTab({ khoaHocs, nhomLops, onReload }: SinhVienTheoNhomTabProps) {
  const [filterKhoaHoc, setFilterKhoaHoc] = useState<number | ''>('');
  const [selectedNhomLop, setSelectedNhomLop] = useState<number | null>(null);

  const [giangViens, setGiangViens] = useState<GiangVien[]>([]);
  const [sinhViens, setSinhViens] = useState<SinhVienTrongNhom[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const [formMaGiangVien, setFormMaGiangVien] = useState<number | ''>('');
  const [savingCoVan, setSavingCoVan] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getGiangViens()
      .then(setGiangViens)
      .catch(() => undefined);
  }, []);

  const nhomLopsHienThi = useMemo(
    () => (filterKhoaHoc ? nhomLops.filter((n) => n.maKhoaHocNganh === filterKhoaHoc) : nhomLops),
    [nhomLops, filterKhoaHoc],
  );

  const nhomLopDangChon = useMemo(
    () => nhomLops.find((n) => n.maNhomLop === selectedNhomLop) ?? null,
    [nhomLops, selectedNhomLop],
  );

  useEffect(() => {
    setFormMaGiangVien(nhomLopDangChon?.maCoVanHocTap ?? '');
  }, [nhomLopDangChon]);

  const totalPages = Math.max(1, Math.ceil(sinhViens.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedSinhViens = sinhViens.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  async function loadSinhViens(maNhomLop: number) {
    setLoadingDetail(true);
    setError('');
    try {
      const sv = await getSinhViensTrongNhom(maNhomLop);
      setSinhViens(sv);
    } catch {
      setError('Không thể tải danh sách sinh viên của nhóm lớp này');
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleSelectNhomLop(maNhomLop: number) {
    setSelectedNhomLop(maNhomLop);
    setPage(1);
    loadSinhViens(maNhomLop);
  }

  async function handleSaveCoVan() {
    if (!selectedNhomLop) return;
    setSavingCoVan(true);
    setError('');
    try {
      await setCoVan(selectedNhomLop, formMaGiangVien ? Number(formMaGiangVien) : null);
      onReload();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không thể gán cố vấn học tập');
    } finally {
      setSavingCoVan(false);
    }
  }

  async function handleRemoveSinhVien(sv: SinhVienTrongNhom) {
    if (!selectedNhomLop) return;
    const confirmed = window.confirm(`Bỏ sinh viên "${sv.hoTen}" khỏi nhóm lớp này?`);
    if (!confirmed) return;
    try {
      await removeSinhVienKhoiNhom(selectedNhomLop, sv.maSinhVien);
      await loadSinhViens(selectedNhomLop);
      onReload();
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể bỏ sinh viên khỏi nhóm lớp này');
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* === LEFT: danh sách nhóm lớp === */}
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-gray-200">
        <div className="flex-shrink-0 border-b border-gray-200 p-3">
          <select
            value={filterKhoaHoc}
            onChange={(e) => setFilterKhoaHoc(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none"
          >
            <option value="">Tất cả khoá học ngành</option>
            {khoaHocs.map((k) => (
              <option key={k.maKhoaHocNganh} value={k.maKhoaHocNganh}>
                {k.tenKhoaHoc} ({k.tenNganh})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {nhomLopsHienThi.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Không có nhóm lớp nào</div>
          )}
          {nhomLopsHienThi.map((n) => (
            <div
              key={n.maNhomLop}
              onClick={() => handleSelectNhomLop(n.maNhomLop)}
              className={`cursor-pointer border-b border-gray-100 px-4 py-3 ${
                selectedNhomLop === n.maNhomLop ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <p
                className={`truncate text-sm font-medium ${
                  selectedNhomLop === n.maNhomLop ? 'text-blue-700' : 'text-gray-900'
                }`}
              >
                {n.tenNhomLop}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {n.tenKhoaHoc} ({n.tenNganh})
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {n.soSinhVien} sinh viên · Cố vấn: {n.tenCoVanHocTap ?? 'chưa có'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* === RIGHT: chi tiết nhóm lớp === */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!nhomLopDangChon && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
              <p>Chọn một nhóm lớp ngành để quản lý sinh viên</p>
            </div>
          </div>
        )}

        {nhomLopDangChon && (
          <>
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <span className="text-base font-semibold text-gray-700">{nhomLopDangChon.tenNhomLop}</span>
                <span className="text-sm text-gray-400">
                  ({nhomLopDangChon.tenKhoaHoc} - {nhomLopDangChon.tenNganh})
                </span>
              </div>

              {/* Cố vấn học tập */}
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <UserCog className="h-3.5 w-3.5" /> Cố vấn học tập
                  </label>
                  <select
                    value={formMaGiangVien}
                    onChange={(e) => setFormMaGiangVien(e.target.value ? Number(e.target.value) : '')}
                    className="w-full max-w-sm rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">-- Chưa có cố vấn --</option>
                    {giangViens.map((g) => (
                      <option key={g.maGiangVien} value={g.maGiangVien}>
                        {g.hoTen} ({g.tenBoMon ?? g.tenKhoaVien ?? 'Chưa rõ đơn vị'})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCoVan}
                  disabled={savingCoVan || formMaGiangVien === (nhomLopDangChon.maCoVanHocTap ?? '')}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingCoVan ? 'Đang lưu...' : 'Lưu cố vấn'}
                </button>
              </div>
            </div>

            {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2">
              <span className="text-sm font-semibold text-gray-700">Sinh viên trong nhóm ({sinhViens.length})</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <FileUp className="h-4 w-4" /> Import Excel
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  <UserPlus className="h-4 w-4" /> Thêm sinh viên
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-50">
                    <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">
                      No.
                    </th>
                    <th className="w-36 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                      Mã SV
                    </th>
                    <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                      Họ tên
                    </th>
                    <th className="w-28 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">
                      Giới tính
                    </th>
                    <th className="w-24 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingDetail && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loadingDetail && sinhViens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                        <Users className="mx-auto mb-2 h-10 w-10 opacity-40" />
                        <p>Nhóm lớp này chưa có sinh viên nào</p>
                      </td>
                    </tr>
                  )}
                  {!loadingDetail &&
                    paginatedSinhViens.map((sv, idx) => {
                      const globalIndex = startIndex + idx;
                      return (
                        <tr key={sv.maSinhVien} className={globalIndex % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}>
                          <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">
                            {globalIndex + 1}
                          </td>
                          <td className="w-36 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                            {sv.maSoSV}
                          </td>
                          <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">
                            {sv.hoTen}
                          </td>
                          <td className="w-28 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">
                            {sv.gioiTinh ?? '-'}
                          </td>
                          <td className="w-24 px-3 py-2">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                title="Bỏ khỏi nhóm"
                                onClick={() => handleRemoveSinhVien(sv)}
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
              <div>
                <span className="rounded border border-gray-300 px-2 py-1 text-sm">{ITEMS_PER_PAGE} / trang</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2">
                  Trang {page} / {totalPages} ({sinhViens.length} sinh viên)
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
          </>
        )}
      </div>

      {addModalOpen && nhomLopDangChon && (
        <AddSinhVienToNhomModal
          maNhomLop={nhomLopDangChon.maNhomLop}
          tenNhomLop={nhomLopDangChon.tenNhomLop}
          onClose={() => setAddModalOpen(false)}
          onAdded={() => {
            loadSinhViens(nhomLopDangChon.maNhomLop);
            onReload();
          }}
        />
      )}

      {importModalOpen && nhomLopDangChon && (
        <ImportSinhVienVaoNhomModal
          maNhomLop={nhomLopDangChon.maNhomLop}
          tenNhomLop={nhomLopDangChon.tenNhomLop}
          onClose={() => setImportModalOpen(false)}
          onImported={() => {
            loadSinhViens(nhomLopDangChon.maNhomLop);
            onReload();
          }}
        />
      )}
    </div>
  );
}
