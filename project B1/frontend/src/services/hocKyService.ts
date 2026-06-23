import api from './api';

export interface HocKy {
  maHocKy: number;
  tenHocKy: string;
  maNamHoc: number;
  tenNamHoc: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soLopHoc: number;
}

export interface HocKyInput {
  tenHocKy: string;
  ngayBatDau: string;
  ngayKetThuc: string;
}

export async function getHocKys(maNamHoc?: number): Promise<HocKy[]> {
  const res = await api.get<HocKy[]>('/hoc-ky', { params: maNamHoc ? { maNamHoc } : undefined });
  return res.data;
}

export async function createHocKy(maNamHoc: number, input: HocKyInput): Promise<HocKy> {
  const res = await api.post<HocKy>('/hoc-ky', { maNamHoc, ...input });
  return res.data;
}

export async function updateHocKy(id: number, input: HocKyInput): Promise<void> {
  await api.put(`/hoc-ky/${id}`, input);
}

export async function deleteHocKy(id: number): Promise<void> {
  await api.delete(`/hoc-ky/${id}`);
}
