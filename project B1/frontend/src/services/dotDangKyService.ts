import api from './api';

export interface DotDangKy {
  maDot: number;
  maHocKy: number;
  tenHocKy: string;
  tenNamHoc: string;
  ten: string;
  loaiDot: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  choPhepDangKy: boolean;
  choPhepRut: boolean;
  namNhapHoc: number | null;
  maKhoaVien: number | null;
  tenKhoaVien: string | null;
  phamViMoTa: string;
  trangThai: string; // ChuaMo | DangMo | DaDong
}

export interface DotDangKyInput {
  ten: string;
  loaiDot: string;
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  choPhepDangKy: boolean;
  choPhepRut: boolean;
  namNhapHoc: number | null;
  maKhoaVien: number | null;
}

export async function getDotDangKys(maHocKy?: number): Promise<DotDangKy[]> {
  const res = await api.get<DotDangKy[]>('/dot-dang-ky', { params: maHocKy ? { maHocKy } : undefined });
  return res.data;
}

export async function createDotDangKy(maHocKy: number, input: DotDangKyInput): Promise<DotDangKy> {
  const res = await api.post<DotDangKy>('/dot-dang-ky', { maHocKy, ...input });
  return res.data;
}

export async function updateDotDangKy(id: number, input: DotDangKyInput): Promise<void> {
  await api.put(`/dot-dang-ky/${id}`, input);
}

export async function deleteDotDangKy(id: number): Promise<void> {
  await api.delete(`/dot-dang-ky/${id}`);
}
