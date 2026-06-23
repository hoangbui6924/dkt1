import api from './api';

export interface NganhHoc {
  maNganh: number;
  tenNganh: string;
  maKhoaVien: number;
  tenKhoaVien: string;
  soNhomLop: number;
}

export async function getNganhHocs(): Promise<NganhHoc[]> {
  const res = await api.get<NganhHoc[]>('/nganh-hoc');
  return res.data;
}

export async function createNganhHoc(tenNganh: string, maKhoaVien: number): Promise<NganhHoc> {
  const res = await api.post<NganhHoc>('/nganh-hoc', { tenNganh, maKhoaVien });
  return res.data;
}

export async function updateNganhHoc(id: number, tenNganh: string, maKhoaVien: number): Promise<void> {
  await api.put(`/nganh-hoc/${id}`, { tenNganh, maKhoaVien });
}

export async function deleteNganhHoc(id: number): Promise<void> {
  await api.delete(`/nganh-hoc/${id}`);
}
