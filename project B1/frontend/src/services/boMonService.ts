import api from './api';

export interface BoMon {
  maBoMon: number;
  tenBoMon: string;
  maKhoaVien: number | null;
  tenKhoaVien: string | null;
  soMonHoc: number;
  soGiangVien: number;
}

export async function getBoMons(): Promise<BoMon[]> {
  const res = await api.get<BoMon[]>('/bo-mon');
  return res.data;
}

export async function createBoMon(tenBoMon: string, maKhoaVien: number | null): Promise<BoMon> {
  const res = await api.post<BoMon>('/bo-mon', { tenBoMon, maKhoaVien });
  return res.data;
}

export async function updateBoMon(id: number, tenBoMon: string, maKhoaVien: number | null): Promise<void> {
  await api.put(`/bo-mon/${id}`, { tenBoMon, maKhoaVien });
}

export async function deleteBoMon(id: number): Promise<void> {
  await api.delete(`/bo-mon/${id}`);
}
