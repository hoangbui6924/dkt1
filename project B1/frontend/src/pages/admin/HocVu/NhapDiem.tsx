import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Search } from 'lucide-react';
import {
  type LopHocTrongKy,
  getLopHocTrongKys,
} from '../../../services/lopHocTrongKyService';
import { type HocKy, getHocKys } from '../../../services/hocKyService';
import { type SinhVienTrongLopDiem, type LopDiemInfo, getLopDiem, nhapDiem } from '../../../services/diemHocPhanService';

function DiemInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');

  useEffect(() => {
    setText(value != null ? String(value) : '');
  }, [value]);

  function commit() {
    const trimmed = text.trim();
    if (trimmed === '') {
      onCommit(null);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && num >= 0 && num <= 10) {
      onCommit(Math.round(num * 100) / 100);
    } else {
      setText(value != null ? String(value) : '');
    }
  }

  return (
    <input
      type="number"
      min={0}
      max={10}
      step={0.1}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      placeholder="-"
      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}

export default function NhapDiemPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hocKys, setHocKys] = useState<HocKy[]>([]);
  const [lops, setLops] = useState<LopHocTrongKy[]>([]);
  const [maHocKy, setMaHocKy] = useState<number | ''>('');
  const [maLopHocKy, setMaLopHocKy] = useState<number | ''>(() => {
    const fromQuery = searchParams.get('maLopHocKy');
    return fromQuery ? Number(fromQuery) : '';
  });
  const [search, setSearch] = useState('');

  const [lopDiem, setLopDiem] = useState<LopDiemInfo | null>(null);
  const [loadingLop, setLoadingLop] = useState(false);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    getHocKys()
      .then((data) => {
        setHocKys(data);
        if (!maHocKy && data.length > 0) setMaHocKy(data[0].maHocKy);
      })
      .catch(() => setError('Không thể tải danh sách học kỳ'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!maHocKy) {
      setLops([]);
      return;
    }
    getLopHocTrongKys(Number(maHocKy))
      .then(setLops)
      .catch(() => setError('Không thể tải danh sách lớp học phần'));
  }, [maHocKy]);

  async function loadLopDiem(id: number) {
    setLoadingLop(true);
    setError('');
    try {
      setLopDiem(await getLopDiem(id));
    } catch {
      setError('Không thể tải danh sách sinh viên của lớp này');
      setLopDiem(null);
    } finally {
      setLoadingLop(false);
    }
  }

  useEffect(() => {
    if (maLopHocKy) loadLopDiem(Number(maLopHocKy));
    else setLopDiem(null);
  }, [maLopHocKy]);

  function chonLop(id: number) {
    setMaLopHocKy(id);
    setSearchParams({ maLopHocKy: String(id) });
  }

  const lopLocTheoTen = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lops;
    return lops.filter((l) => l.tenLop.toLowerCase().includes(q) || l.tenMonHoc.toLowerCase().includes(q));
  }, [lops, search]);

  async function handleNhapDiem(sv: SinhVienTrongLopDiem, field: 'diemX' | 'diemY', value: number | null) {
    if (!lopDiem) return;
    setSavingIds((prev) => new Set(prev).add(sv.maDangKy));
    try {
      const updated = await nhapDiem(
        sv.maDangKy,
        field === 'diemX' ? value : sv.diemX,
        field === 'diemY' ? value : sv.diemY,
      );
      setLopDiem((prev) =>
        prev ? { ...prev, sinhViens: prev.sinhViens.map((s) => (s.maDangKy === sv.maDangKy ? updated : s)) } : prev,
      );
    } catch (err: any) {
      window.alert(err?.response?.data?.message ?? 'Không thể lưu điểm');
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(sv.maDangKy);
        return next;
      });
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* === LEFT: danh sách lớp học phần === */}
      <div className="flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-gray-200">
        <div className="flex-shrink-0 space-y-2 border-b border-gray-200 p-3">
          <select
            value={maHocKy}
            onChange={(e) => {
              setMaHocKy(e.target.value ? Number(e.target.value) : '');
              setMaLopHocKy('');
            }}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none"
          >
            <option value="">-- Chọn học kỳ --</option>
            {hocKys.map((h) => (
              <option key={h.maHocKy} value={h.maHocKy}>
                {h.tenHocKy} ({h.tenNamHoc})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-white px-2 py-1.5">
            <input
              type="text"
              placeholder="Tìm theo tên lớp hoặc môn học"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {lopLocTheoTen.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Không có lớp học phần nào</div>
          )}
          {lopLocTheoTen.map((l) => (
            <div
              key={l.maLopHocKy}
              onClick={() => chonLop(l.maLopHocKy)}
              className={`cursor-pointer border-b border-gray-100 px-4 py-3 ${
                maLopHocKy === l.maLopHocKy ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <p className={`text-sm font-medium ${maLopHocKy === l.maLopHocKy ? 'text-blue-700' : 'text-gray-900'}`}>
                {l.tenMonHoc} ({l.tenLop})
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {l.loaiHinh} · {l.soTinChi} TC · {l.soLuongDaDangKy}/{l.siSoToiDa} SV
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* === RIGHT: bảng nhập điểm === */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!maLopHocKy && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <div className="text-center">
              <GraduationCap className="mx-auto mb-2 h-10 w-10 opacity-40" />
              <p>Chọn một lớp học phần để xem danh sách sinh viên và nhập điểm</p>
            </div>
          </div>
        )}

        {maLopHocKy && (
          <>
            <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                <span className="text-base font-semibold text-gray-700">
                  {lopDiem ? `${lopDiem.tenMonHoc} (${lopDiem.tenLop})` : '...'}
                </span>
                {lopDiem && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-700">
                    {lopDiem.sinhViens.length} SV
                  </span>
                )}
              </div>
            </div>

            {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

            <div className="flex-1 overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-50">
                    <th className="w-12 border-b border-r border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-600">No.</th>
                    <th className="w-32 border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Mã SV</th>
                    <th className="border-b border-r border-gray-200 px-3 py-2 text-left text-sm font-semibold text-gray-600">Họ tên</th>
                    <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Điểm X</th>
                    <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Điểm Y</th>
                    <th className="w-20 border-b border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Điểm Z</th>
                    <th className="w-24 border-b border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Điểm chữ</th>
                    <th className="w-24 border-b border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-600">Thang 4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLop && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Đang tải...</td>
                    </tr>
                  )}
                  {!loadingLop && lopDiem?.sinhViens.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                        <GraduationCap className="mx-auto mb-2 h-10 w-10 opacity-40" />
                        <p>Lớp này chưa có sinh viên đăng ký</p>
                      </td>
                    </tr>
                  )}
                  {!loadingLop &&
                    lopDiem?.sinhViens.map((sv, idx) => (
                      <tr
                        key={sv.maDangKy}
                        className={`${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} ${
                          savingIds.has(sv.maDangKy) ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="w-12 border-r border-gray-200 px-2 py-2 text-center text-sm text-gray-500">{idx + 1}</td>
                        <td className="w-32 border-r border-gray-200 px-3 py-2 text-sm text-gray-700">{sv.maSoSV}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-900">{sv.hoTen}</td>
                        <td className="w-24 border-r border-gray-200 px-3 py-2 text-center">
                          <DiemInput value={sv.diemX} onCommit={(v) => handleNhapDiem(sv, 'diemX', v)} />
                        </td>
                        <td className="w-24 border-r border-gray-200 px-3 py-2 text-center">
                          <DiemInput value={sv.diemY} onCommit={(v) => handleNhapDiem(sv, 'diemY', v)} />
                        </td>
                        <td className="w-20 border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                          {sv.diemZ ?? <span className="text-gray-300">-</span>}
                        </td>
                        <td className="w-24 border-r border-gray-200 px-3 py-2 text-center text-sm">
                          {sv.diemChu ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                sv.diemChu === 'F' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {sv.diemChu}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="w-24 border-gray-200 px-3 py-2 text-center text-sm text-gray-700">
                          {sv.thangDiem4 ?? <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
