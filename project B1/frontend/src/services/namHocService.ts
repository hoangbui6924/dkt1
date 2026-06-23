import api from './api';

export interface NamHoc {
  maNamHoc: number;
  tenNamHoc: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  soHocKy: number;
}

export interface NamHocInput {
  tenNamHoc: string;
  ngayBatDau: string;
  ngayKetThuc: string;
}

export async function getNamHocs(): Promise<NamHoc[]> {
  const res = await api.get<NamHoc[]>('/nam-hoc');
  return res.data;
}

export async function createNamHoc(input: NamHocInput): Promise<NamHoc> {
  const res = await api.post<NamHoc>('/nam-hoc', input);
  return res.data;
}

export async function updateNamHoc(id: number, input: NamHocInput): Promise<void> {
  await api.put(`/nam-hoc/${id}`, input);
}

export async function deleteNamHoc(id: number): Promise<void> {
  await api.delete(`/nam-hoc/${id}`);
}
