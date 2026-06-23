import api from './api';

export interface KhoaVien {
  maKhoaVien: number;
  tenKhoaVien: string;
  soNganh: number;
  soBoMon: number;
}

export async function getKhoaViens(): Promise<KhoaVien[]> {
  const res = await api.get<KhoaVien[]>('/khoa-vien');
  return res.data;
}

export async function createKhoaVien(tenKhoaVien: string): Promise<KhoaVien> {
  const res = await api.post<KhoaVien>('/khoa-vien', { tenKhoaVien });
  return res.data;
}

export async function updateKhoaVien(id: number, tenKhoaVien: string): Promise<void> {
  await api.put(`/khoa-vien/${id}`, { tenKhoaVien });
}

export async function deleteKhoaVien(id: number): Promise<void> {
  await api.delete(`/khoa-vien/${id}`);
}
