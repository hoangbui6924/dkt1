import api from './api';

export interface KhoaHocNganh {
  maKhoaHocNganh: number;
  tenKhoaHoc: string;
  maNganhHoc: number;
  tenNganh: string;
  tenKhoaVien: string;
  namNhapHoc: number;
  soNhomLop: number;
}

export async function getKhoaHocNganhs(maNganhHoc?: number): Promise<KhoaHocNganh[]> {
  const res = await api.get<KhoaHocNganh[]>('/khoa-hoc-nganh', { params: maNganhHoc ? { maNganhHoc } : undefined });
  return res.data;
}

export async function createKhoaHocNganh(
  tenKhoaHoc: string,
  maNganhHoc: number,
  namNhapHoc: number,
): Promise<KhoaHocNganh> {
  const res = await api.post<KhoaHocNganh>('/khoa-hoc-nganh', { tenKhoaHoc, maNganhHoc, namNhapHoc });
  return res.data;
}

export async function updateKhoaHocNganh(
  id: number,
  tenKhoaHoc: string,
  maNganhHoc: number,
  namNhapHoc: number,
): Promise<void> {
  await api.put(`/khoa-hoc-nganh/${id}`, { tenKhoaHoc, maNganhHoc, namNhapHoc });
}

export async function deleteKhoaHocNganh(id: number): Promise<void> {
  await api.delete(`/khoa-hoc-nganh/${id}`);
}
