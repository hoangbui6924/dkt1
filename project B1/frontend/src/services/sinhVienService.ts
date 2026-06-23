import api from './api';

export interface SinhVien {
  maSinhVien: number;
  maSoSV: string;
  hoTen: string;
  ngaySinh: string | null;
  gioiTinh: string | null;
  maKhoaHocNganh: number;
  tenKhoaHoc: string;
  maNganhHoc: number;
  tenNganh: string;
  tenKhoaVien: string;
  maNhomLop: number | null;
  tenNhomLop: string | null;
  maTaiKhoan: number | null;
  tenDangNhapTaiKhoan: string | null;
  tongTinChiTichLuy: number;
  gpaTichLuy: number;
}

export interface CreateSinhVienInput {
  maSoSV: string;
  hoTen: string;
  ngaySinh: string | null;
  gioiTinh: string | null;
  maKhoaHocNganh: number;
  maNhomLop: number | null;
}

export interface UpdateSinhVienInput {
  hoTen: string;
  ngaySinh: string | null;
  gioiTinh: string | null;
  maKhoaHocNganh: number;
  maNhomLop: number | null;
}

export async function getSinhViens(): Promise<SinhVien[]> {
  const res = await api.get<SinhVien[]>('/sinh-vien');
  return res.data;
}

export async function getSinhVienMe(): Promise<SinhVien> {
  const res = await api.get<SinhVien>('/sinh-vien/me');
  return res.data;
}

export async function createSinhVien(input: CreateSinhVienInput): Promise<SinhVien> {
  const res = await api.post<SinhVien>('/sinh-vien', input);
  return res.data;
}

export async function updateSinhVien(id: number, input: UpdateSinhVienInput): Promise<void> {
  await api.put(`/sinh-vien/${id}`, input);
}

export async function deleteSinhVien(id: number): Promise<void> {
  await api.delete(`/sinh-vien/${id}`);
}

export interface ImportSinhVienRow {
  maSoSV: string;
  hoTen: string;
  gioiTinh: string | null;
}

export interface ImportSinhVienError {
  dong: number;
  maSoSV: string;
  message: string;
}

export interface ImportSinhVienResult {
  thanhCong: number;
  thatBai: number;
  loi: ImportSinhVienError[];
}

export async function importSinhViens(
  maKhoaHocNganh: number,
  sinhViens: ImportSinhVienRow[],
): Promise<ImportSinhVienResult> {
  const res = await api.post<ImportSinhVienResult>('/sinh-vien/import', { maKhoaHocNganh, sinhViens });
  return res.data;
}
