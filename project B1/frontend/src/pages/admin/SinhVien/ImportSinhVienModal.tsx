import { useMemo, useRef, useState } from 'react';
// xlsx được nạp ĐỘNG (await import) trong handler -> tách khỏi bundle chính (chỉ tải khi admin import/xuất).
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { type KhoaVien } from '../../../services/khoaVienService';
import { type NganhHoc } from '../../../services/nganhHocService';
import { type KhoaHocNganh } from '../../../services/khoaHocNganhService';
import { type ImportSinhVienRow, type ImportSinhVienResult, importSinhViens } from '../../../services/sinhVienService';
import Modal from '../../../components/Modal';

const TEMPLATE_HEADERS = ['MaSoSV', 'HoTen', 'GioiTinh'];
const TEMPLATE_SAMPLE_ROWS = [
  ['100001', 'Nguyễn Văn A', 'Nam'],
  ['100002', 'Trần Thị B', 'Nữ'],
];

const selectClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500';

interface ImportSinhVienModalProps {
  khoaViens: KhoaVien[];
  nganhHocs: NganhHoc[];
  khoaHocs: KhoaHocNganh[];
  onClose: () => void;
  onImported: () => void;
}

export default function ImportSinhVienModal({
  khoaViens,
  nganhHocs,
  khoaHocs,
  onClose,
  onImported,
}: ImportSinhVienModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterKhoaVien, setFilterKhoaVien] = useState<number | ''>('');
  const [filterNganh, setFilterNganh] = useState<number | ''>('');
  const [maKhoaHocNganh, setMaKhoaHocNganh] = useState<number | ''>('');

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportSinhVienRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSinhVienResult | null>(null);

  const nganhOptions = useMemo(
    () => (filterKhoaVien ? nganhHocs.filter((n) => n.maKhoaVien === filterKhoaVien) : nganhHocs),
    [nganhHocs, filterKhoaVien],
  );

  const khoaHocOptions = useMemo(
    () => (filterNganh ? khoaHocs.filter((k) => k.maNganhHoc === filterNganh) : khoaHocs),
    [khoaHocs, filterNganh],
  );

  const khoaHocDaChon = useMemo(
    () => khoaHocs.find((k) => k.maKhoaHocNganh === maKhoaHocNganh) ?? null,
    [khoaHocs, maKhoaHocNganh],
  );

  function handleKhoaVienChange(value: string) {
    const v = value ? Number(value) : '';
    setFilterKhoaVien(v);
    setFilterNganh('');
    setMaKhoaHocNganh('');
  }

  function handleNganhChange(value: string) {
    const v = value ? Number(value) : '';
    setFilterNganh(v);
    setMaKhoaHocNganh('');
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const data = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SinhVien');
    XLSX.writeFile(wb, 'Mau_Import_Sinh_Vien.xlsx');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setRows([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length === 0) {
          setParseError('File không có dữ liệu');
          return;
        }

        const dataRows = raw.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
        const parsed: ImportSinhVienRow[] = dataRows.map((r) => ({
          maSoSV: String(r[0] ?? '').trim(),
          hoTen: String(r[1] ?? '').trim(),
          gioiTinh: r[2] ? String(r[2]).trim() : null,
        }));

        if (parsed.length === 0) {
          setParseError('Không tìm thấy dòng dữ liệu nào trong file');
          return;
        }

        setRows(parsed);
      } catch {
        setParseError('Không thể đọc file này. Vui lòng kiểm tra định dạng file Excel.');
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    if (!maKhoaHocNganh) {
      setParseError('Vui lòng chọn khoá học ngành áp dụng cho danh sách sinh viên');
      return;
    }
    if (rows.length === 0) {
      setParseError('Vui lòng chọn file Excel chứa danh sách sinh viên');
      return;
    }
    setImporting(true);
    setParseError('');
    try {
      const res = await importSinhViens(Number(maKhoaHocNganh), rows);
      setResult(res);
      if (res.thanhCong > 0) {
        onImported();
      }
    } catch (err: any) {
      setParseError(err?.response?.data?.message ?? 'Có lỗi xảy ra khi import, vui lòng thử lại');
    } finally {
      setImporting(false);
    }
  }

  function resetFile() {
    setFileName('');
    setRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <Modal title="Import danh sách sinh viên từ Excel" onClose={onClose} maxWidthClassName="max-w-[640px]">
      <div className="space-y-5">
        {/* === Hướng dẫn === */}
        <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-700">Hướng dẫn import</h4>
          </div>
          <ul className="mt-2 ml-1 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-gray-700">
            <li>
              File Excel cần có 3 cột theo đúng thứ tự: <strong>Mã số SV</strong>, <strong>Họ tên</strong>,{' '}
              <strong>Giới tính</strong>. Dòng đầu tiên là tiêu đề, dữ liệu sinh viên bắt đầu từ dòng 2.
            </li>
            <li>Toàn bộ sinh viên trong file sẽ được gán vào khoá học ngành chọn ở bước 1.</li>
            <li>Mỗi sinh viên được tự động tạo 1 tài khoản đăng nhập, dùng mã số SV làm tên đăng nhập.</li>
          </ul>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-3 flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" /> Tải file mẫu
          </button>
        </section>

        {/* === Bước 1: chọn khoá học ngành === */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">
            Bước 1 · Chọn khoá học ngành áp dụng cho danh sách
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Khoa viện</label>
              <select value={filterKhoaVien} onChange={(e) => handleKhoaVienChange(e.target.value)} className={selectClass}>
                <option value="">Tất cả khoa viện</option>
                {khoaViens.map((k) => (
                  <option key={k.maKhoaVien} value={k.maKhoaVien}>
                    {k.tenKhoaVien}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ngành học</label>
              <select value={filterNganh} onChange={(e) => handleNganhChange(e.target.value)} className={selectClass}>
                <option value="">Tất cả ngành học</option>
                {nganhOptions.map((n) => (
                  <option key={n.maNganh} value={n.maNganh}>
                    {n.tenNganh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className={labelClass}>
              Khoá học ngành <span className="text-red-500">*</span>
            </label>
            <select
              value={maKhoaHocNganh}
              onChange={(e) => setMaKhoaHocNganh(e.target.value ? Number(e.target.value) : '')}
              className={selectClass}
            >
              <option value="">-- Chọn khoá học ngành --</option>
              {khoaHocOptions.map((k) => (
                <option key={k.maKhoaHocNganh} value={k.maKhoaHocNganh}>
                  {k.tenKhoaHoc} ({k.tenNganh})
                </option>
              ))}
            </select>
            {khoaHocOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600">Không có khoá học ngành phù hợp với bộ lọc này.</p>
            ) : khoaHocDaChon ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Đã chọn: <strong className="text-gray-700">{khoaHocDaChon.tenKhoaHoc}</strong> —{' '}
                {khoaHocDaChon.tenNganh} ({khoaHocDaChon.tenKhoaVien})
              </p>
            ) : null}
          </div>
        </section>

        {/* === Bước 2: chọn file === */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">Bước 2 · Chọn file Excel danh sách sinh viên</h4>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="importFile"
            />
            <label
              htmlFor="importFile"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" /> Chọn file
            </label>
            {fileName ? (
              <span className="flex min-w-0 items-center gap-1.5 truncate rounded-md bg-gray-100 px-2.5 py-1.5 text-sm text-gray-700">
                <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="truncate">{fileName}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-400">Chưa chọn file nào</span>
            )}
          </div>
          {rows.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              Đã đọc được <strong className="text-gray-900">{rows.length}</strong> dòng sinh viên từ file.
            </p>
          )}
        </section>

        {parseError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {parseError}
          </div>
        )}

        {result && (
          <section className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Đã import thành công {result.thanhCong} sinh viên.
            </div>
            {result.loi.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> {result.loi.length} dòng bị bỏ qua
                </div>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  {result.loi.map((l, idx) => (
                    <li key={idx}>
                      Dòng {l.dong} ({l.maSoSV || '(trống)'}): {l.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
          {result ? (
            <button
              type="button"
              onClick={resetFile}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Import file khác
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {importing ? 'Đang import...' : `Import${rows.length > 0 ? ` ${rows.length} sinh viên` : ''}`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
