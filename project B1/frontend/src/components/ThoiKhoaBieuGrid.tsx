import type { MonHocGoiY } from '../services/dangKyHocPhanService';

const TIET_SANG = [1, 2, 3, 4, 5];
const TIET_CHIEU = [6, 7, 8, 9, 10];
const NGAY_COLS = [2, 3, 4, 5, 6, 7];
const NGAY_LABEL: Record<number, string> = {
  2: 'T2',
  3: 'T3',
  4: 'T4',
  5: 'T5',
  6: 'T6',
  7: 'T7',
};

interface BuoiHienThi {
  tenMonHoc: string;
  tenLop: string;
  tenGiangVien: string | null;
  thu: number;
  tietBatDau: number;
  tietKetThuc: number;
}

export default function ThoiKhoaBieuGrid({ monHocs }: { monHocs: MonHocGoiY[] }) {
  const buoiList: BuoiHienThi[] = monHocs.flatMap((m) =>
    m.buoiHocs.map((b) => ({
      tenMonHoc: m.tenMonHoc,
      tenLop: m.tenLop,
      tenGiangVien: m.tenGiangVien,
      thu: b.thu,
      tietBatDau: b.tietBatDau,
      tietKetThuc: b.tietKetThuc,
    })),
  );

  function cellsFor(tiet: number, thu: number) {
    return buoiList.filter((b) => b.thu === thu && b.tietBatDau <= tiet && b.tietKetThuc >= tiet);
  }

  function renderRow(tiet: number, buoiLabel: string | null, rowSpan: number) {
    return (
      <tr key={tiet}>
        {buoiLabel !== null && (
          <td
            rowSpan={rowSpan}
            className="border border-gray-200 bg-gray-50 px-2 py-1 text-center align-middle text-xs font-semibold text-gray-600"
          >
            {buoiLabel}
          </td>
        )}
        <td className="border border-gray-200 bg-gray-50 px-2 py-1 text-center text-xs font-semibold text-gray-600">
          {tiet}
        </td>
        {NGAY_COLS.map((thu) => {
          const items = cellsFor(tiet, thu);
          return (
            <td key={thu} className="min-w-[110px] border border-gray-200 px-2 py-1 align-top text-xs">
              {items.map((it, i) => (
                <div key={i}>
                  <div className="font-medium text-blue-700">{it.tenLop}</div>
                  {it.tenGiangVien && <div className="text-gray-400">{it.tenGiangVien}</div>}
                </div>
              ))}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-blue-50">
            <th className="border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600">Buổi</th>
            <th className="border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600">Tiết</th>
            {NGAY_COLS.map((thu) => (
              <th key={thu} className="border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600">
                {NGAY_LABEL[thu]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIET_SANG.map((t, i) => renderRow(t, i === 0 ? 'Sáng' : null, TIET_SANG.length))}
          {TIET_CHIEU.map((t, i) => renderRow(t, i === 0 ? 'Chiều' : null, TIET_CHIEU.length))}
        </tbody>
      </table>
    </div>
  );
}
