import api from './api';

export interface LichHoc {
  maLich: number;
  thu: number;
  tietBatDau: number;
  tietKetThuc: number;
  phongHoc: string | null;
}

export interface LichHocInput {
  thu: number;
  tietBatDau: number;
  tietKetThuc: number;
  phongHoc: string | null;
}

export interface LopHocTrongKy {
  maLopHocKy: number;
  tenLop: string;
  loaiHinh: string;
  siSoToiDa: number;
  soLuongDaDangKy: number;
  maMonHoc: number;
  tenMonHoc: string;
  soTinChi: number;
  maHocKy: number;
  tenHocKy: string;
  maGiangVien: number | null;
  tenGiangVien: string | null;
  lichHocs: LichHoc[];
}

export interface LopHocTrongKyInput {
  tenLop: string;
  loaiHinh: string;
  siSoToiDa: number;
  maGiangVien: number | null;
  lichHocs: LichHocInput[];
}

export async function getLopHocTrongKys(maHocKy?: number, maMonHoc?: number): Promise<LopHocTrongKy[]> {
  const params: Record<string, number> = {};
  if (maHocKy) params.maHocKy = maHocKy;
  if (maMonHoc) params.maMonHoc = maMonHoc;
  const res = await api.get<LopHocTrongKy[]>('/lop-hoc-ky', { params });
  return res.data;
}

export async function createLopHocTrongKy(
  maMonHoc: number,
  maHocKy: number,
  input: LopHocTrongKyInput,
): Promise<LopHocTrongKy> {
  const res = await api.post<LopHocTrongKy>('/lop-hoc-ky', { maMonHoc, maHocKy, ...input });
  return res.data;
}

export async function updateLopHocTrongKy(id: number, input: LopHocTrongKyInput): Promise<void> {
  await api.put(`/lop-hoc-ky/${id}`, input);
}

export async function deleteLopHocTrongKy(id: number): Promise<void> {
  await api.delete(`/lop-hoc-ky/${id}`);
}
