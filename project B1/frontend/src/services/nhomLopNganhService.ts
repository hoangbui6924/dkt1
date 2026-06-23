import api from './api';

export interface NhomLopNganh {
  maNhomLop: number;
  tenNhomLop: string;
  maKhoaHocNganh: number;
  tenKhoaHoc: string;
  tenNganh: string;
  soSinhVien: number;
  maCoVanHocTap: number | null;
  tenCoVanHocTap: string | null;
}

export async function getNhomLopNganhs(maKhoaHocNganh?: number): Promise<NhomLopNganh[]> {
  const res = await api.get<NhomLopNganh[]>('/nhom-lop-nganh', {
    params: maKhoaHocNganh ? { maKhoaHocNganh } : undefined,
  });
  return res.data;
}

export async function createNhomLopNganh(tenNhomLop: string, maKhoaHocNganh: number): Promise<NhomLopNganh> {
  const res = await api.post<NhomLopNganh>('/nhom-lop-nganh', { tenNhomLop, maKhoaHocNganh });
  return res.data;
}

export async function updateNhomLopNganh(id: number, tenNhomLop: string, maKhoaHocNganh: number): Promise<void> {
  await api.put(`/nhom-lop-nganh/${id}`, { tenNhomLop, maKhoaHocNganh });
}

export async function deleteNhomLopNganh(id: number): Promise<void> {
  await api.delete(`/nhom-lop-nganh/${id}`);
}

export interface SinhVienTrongNhom {
  maSinhVien: number;
  maSoSV: string;
  hoTen: string;
  gioiTinh: string | null;
}

export async function getSinhViensTrongNhom(maNhomLop: number): Promise<SinhVienTrongNhom[]> {
  const res = await api.get<SinhVienTrongNhom[]>(`/nhom-lop-nganh/${maNhomLop}/sinh-vien`);
  return res.data;
}

export async function getSinhViensChuaCoNhom(maNhomLop: number): Promise<SinhVienTrongNhom[]> {
  const res = await api.get<SinhVienTrongNhom[]>(`/nhom-lop-nganh/${maNhomLop}/sinh-vien-chua-co-nhom`);
  return res.data;
}

export async function addSinhVienVaoNhom(maNhomLop: number, maSinhVien: number): Promise<void> {
  await api.post(`/nhom-lop-nganh/${maNhomLop}/sinh-vien`, { maSinhVien });
}

export async function removeSinhVienKhoiNhom(maNhomLop: number, maSinhVien: number): Promise<void> {
  await api.delete(`/nhom-lop-nganh/${maNhomLop}/sinh-vien/${maSinhVien}`);
}

export async function setCoVan(maNhomLop: number, maGiangVien: number | null): Promise<NhomLopNganh> {
  const res = await api.put<NhomLopNganh>(`/nhom-lop-nganh/${maNhomLop}/co-van`, { maGiangVien });
  return res.data;
}

export interface ImportSinhVienVaoNhomRow {
  maSoSV: string;
  hoTen: string | null;
}

export interface ImportSinhVienVaoNhomError {
  dong: number;
  maSoSV: string;
  message: string;
}

export interface ImportSinhVienVaoNhomResult {
  thanhCong: number;
  thatBai: number;
  loi: ImportSinhVienVaoNhomError[];
}

export async function importSinhViensVaoNhom(
  maNhomLop: number,
  sinhViens: ImportSinhVienVaoNhomRow[],
): Promise<ImportSinhVienVaoNhomResult> {
  const res = await api.post<ImportSinhVienVaoNhomResult>(`/nhom-lop-nganh/${maNhomLop}/sinh-vien/import`, {
    sinhViens,
  });
  return res.data;
}
