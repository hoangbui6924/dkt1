import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, BookOpen, ScrollText, NotebookText } from 'lucide-react';
import {
  type TaiLieuSinhVien,
  type LoaiTaiLieu,
  getTaiLieuSinhVien,
  downloadTaiLieu,
  formatKichThuoc,
} from '../../../services/taiLieuService';

const ICON: Record<LoaiTaiLieu, typeof FileText> = {
  NoiQuy: ScrollText,
  SoTay: NotebookText,
  GiaoTrinh: BookOpen,
};

function TaiLieuCard({ t }: { t: TaiLieuSinhVien }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-blue-300 hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-gray-800">{t.tenFile}</div>
          <div className="text-sm text-gray-400">
            {formatKichThuoc(t.kichThuocBytes)} · {t.soTrang} trang
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => downloadTaiLieu(t.maTaiLieu, t.tenFile)}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <Download className="h-4 w-4" /> Tải về
      </button>
    </div>
  );
}

export default function StudentTaiLieuPage() {
  const [items, setItems] = useState<TaiLieuSinhVien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTaiLieuSinhVien()
      .then(setItems)
      .catch(() => setError('Không thể tải danh sách tài liệu'))
      .finally(() => setLoading(false));
  }, []);

  const chung = useMemo(() => items.filter((t) => t.loaiTaiLieu !== 'GiaoTrinh'), [items]);
  const theoMon = useMemo(() => {
    const map = new Map<string, TaiLieuSinhVien[]>();
    items
      .filter((t) => t.loaiTaiLieu === 'GiaoTrinh')
      .forEach((t) => {
        const key = t.tenMonHoc ?? 'Khác';
        const list = map.get(key) ?? [];
        list.push(t);
        map.set(key, list);
      });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  if (loading) return <div className="p-10 text-center text-gray-400">Đang tải...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="w-full space-y-6 p-6 text-[15px] xl:p-8">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tài liệu môn học</h1>
          <p className="text-base text-gray-500">Tải về nội quy, sổ tay sinh viên và giáo trình các môn học</p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-400 shadow-sm">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p>Hiện chưa có tài liệu nào được đăng tải.</p>
        </div>
      )}

      {chung.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-700">
            <ScrollText className="h-5 w-5 text-blue-600" /> Tài liệu chung
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {chung.map((t) => (
              <TaiLieuCard key={t.maTaiLieu} t={t} />
            ))}
          </div>
        </div>
      )}

      {theoMon.map(([tenMon, list]) => {
        const Icon = ICON.GiaoTrinh;
        return (
          <div key={tenMon} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-700">
              <Icon className="h-5 w-5 text-blue-600" /> {tenMon}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {list.map((t) => (
                <TaiLieuCard key={t.maTaiLieu} t={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
