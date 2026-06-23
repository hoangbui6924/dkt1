import api from './api';

export interface GiangVien {
  maGiangVien: number;
  hoTen: string;
  maBoMon: number | null;
  tenBoMon: string | null;
  maKhoaVien: number | null;
  tenKhoaVien: string | null;
  email: string | null;
  soDienThoai: string | null;
  maTaiKhoan: number | null;
  tenDangNhapTaiKhoan: string | null;
  soLopDangDay: number;
}

export interface GiangVienInput {
  hoTen: string;
  maBoMon: number | null;
  maKhoaVien: number | null;
  email: string | null;
  soDienThoai: string | null;
}

export async function getGiangViens(): Promise<GiangVien[]> {
  const res = await api.get<GiangVien[]>('/giang-vien');
  return res.data;
}

export async function createGiangVien(input: GiangVienInput): Promise<GiangVien> {
  const res = await api.post<GiangVien>('/giang-vien', input);
  return res.data;
}

export async function updateGiangVien(id: number, input: GiangVienInput): Promise<void> {
  await api.put(`/giang-vien/${id}`, input);
}

export async function deleteGiangVien(id: number): Promise<void> {
  await api.delete(`/giang-vien/${id}`);
}
