import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import {
  type ImportSinhVienVaoNhomRow,
  type ImportSinhVienVaoNhomResult,
  importSinhViensVaoNhom,
} from '../../../services/nhomLopNganhService';
import Modal from '../../../components/Modal';

const TEMPLATE_HEADERS = ['MaSoSV', 'HoTen'];
const TEMPLATE_SAMPLE_ROWS = [
  ['100001', 'Nguyễn Văn A'],
  ['100002', 'Trần Thị B'],
];

interface ImportSinhVienVaoNhomModalProps {
  maNhomLop: number;
  tenNhomLop: string;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportSinhVienVaoNhomModal({
  maNhomLop,
  tenNhomLop,
  onClose,
  onImported,
}: ImportSinhVienVaoNhomModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportSinhVienVaoNhomRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSinhVienVaoNhomResult | null>(null);

  function downloadTemplate() {
    const data = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 14 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SinhVien');
    XLSX.writeFile(wb, 'Mau_Import_Sinh_Vien_Vao_Nhom.xlsx');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length === 0) {
          setParseError('File không có dữ liệu');
          return;
        }

        const dataRows = raw.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
        const parsed: ImportSinhVienVaoNhomRow[] = dataRows.map((r) => ({
          maSoSV: String(r[0] ?? '').trim(),
          hoTen: r[1] ? String(r[1]).trim() : null,
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
    if (rows.length === 0) {
      setParseError('Vui lòng chọn file Excel chứa danh sách sinh viên');
      return;
    }
    setImporting(true);
    setParseError('');
    try {
      const res = await importSinhViensVaoNhom(maNhomLop, rows);
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
    <Modal
      title={`Import sinh viên vào nhóm "${tenNhomLop}" từ Excel`}
      onClose={onClose}
      maxWidthClassName="max-w-[560px]"
    >
      <div className="space-y-5">
        {/* === Hướng dẫn === */}
        <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-700">Hướng dẫn import</h4>
          </div>
          <ul className="mt-2 ml-1 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-gray-700">
            <li>
              File Excel cần có 2 cột theo đúng thứ tự: <strong>Mã số SV</strong>, <strong>Họ tên</strong>. Dòng đầu
              tiên là tiêu đề, dữ liệu sinh viên bắt đầu từ dòng 2.
            </li>
            <li>
              Hệ thống sẽ tìm trong danh sách sinh viên đã có những sinh viên trùng mã số SV trong file để thêm vào
              nhóm lớp này (chỉ áp dụng cho sinh viên cùng khoá học ngành và chưa thuộc nhóm lớp nào khác).
            </li>
          </ul>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-3 flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" /> Tải file mẫu
          </button>
        </section>

        {/* === Chọn file === */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-800">Chọn file Excel danh sách sinh viên</h4>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="importFileVaoNhom"
            />
            <label
              htmlFor="importFileVaoNhom"
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
              <CheckCircle2 className="h-4 w-4" /> Đã thêm thành công {result.thanhCong} sinh viên vào nhóm lớp.
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
