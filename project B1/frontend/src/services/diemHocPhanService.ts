import api from './api';

export interface SinhVienTrongLopDiem {
  maDangKy: number;
  maSinhVien: number;
  maSoSV: string;
  hoTen: string;
  diemX: number | null;
  diemY: number | null;
  diemZ: number | null;
  diemChu: string | null;
  thangDiem4: number | null;
  trangThaiDiem: 'ChuaNhap' | 'DaNhap';
}

export interface LopDiemInfo {
  maLopHocKy: number;
  tenLop: string;
  maMonHoc: number;
  tenMonHoc: string;
  soTinChi: number;
  maHocKy: number;
  tenHocKy: string;
  sinhViens: SinhVienTrongLopDiem[];
}

export async function getLopDiem(maLopHocKy: number): Promise<LopDiemInfo> {
  const res = await api.get<LopDiemInfo>(`/diem-hoc-phan/lop/${maLopHocKy}`);
  return res.data;
}

export async function nhapDiem(
  maDangKy: number,
  diemX: number | null,
  diemY: number | null,
): Promise<SinhVienTrongLopDiem> {
  const res = await api.put<SinhVienTrongLopDiem>(`/diem-hoc-phan/${maDangKy}`, { diemX, diemY });
  return res.data;
}
