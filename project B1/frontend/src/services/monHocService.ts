import api from './api';

export interface MonHoc {
  maMonHoc: number;
  tenMonHoc: string;
  loaiMonHoc: string;
  soTinChi: number;
  maBoMon: number | null;
  tenBoMon: string | null;
  maKhoaVien: number | null;
  tenKhoaVien: string | null;
  maMonHocTienQuyet: number | null;
  tenMonHocTienQuyet: string | null;
  soLopHocKy: number;
}

export interface MonHocInput {
  tenMonHoc: string;
  loaiMonHoc: string;
  soTinChi: number;
  maBoMon: number | null;
  maKhoaVien: number | null;
  maMonHocTienQuyet: number | null;
}

export async function getMonHocs(): Promise<MonHoc[]> {
  const res = await api.get<MonHoc[]>('/mon-hoc');
  return res.data;
}

export async function createMonHoc(input: MonHocInput): Promise<MonHoc> {
  const res = await api.post<MonHoc>('/mon-hoc', input);
  return res.data;
}

export async function updateMonHoc(id: number, input: MonHocInput): Promise<void> {
  await api.put(`/mon-hoc/${id}`, input);
}

export async function deleteMonHoc(id: number): Promise<void> {
  await api.delete(`/mon-hoc/${id}`);
}
