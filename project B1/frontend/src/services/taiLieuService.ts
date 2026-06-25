import api from './api';

export type LoaiTaiLieu = 'NoiQuy' | 'SoTay' | 'GiaoTrinh';

export const LOAI_TAI_LIEU_LABEL: Record<LoaiTaiLieu, string> = {
  NoiQuy: 'Nội quy trường',
  SoTay: 'Sổ tay sinh viên',
  GiaoTrinh: 'Giáo trình môn học',
};

export interface TaiLieu {
  maTaiLieu: number;
  tenFile: string;
  loaiTaiLieu: LoaiTaiLieu;
  maMonHoc: number | null;
  tenMonHoc: string | null;
  kichThuocBytes: number;
  soTrang: number;
  soChunk: number;
  trangThai: 'DangXuLy' | 'DaXuLy' | 'Loi';
  ghiChuXuLy: string | null;
  ngayTaiLen: string;
  tenNguoiTaiLen: string;
}

export interface TaiLieuSinhVien {
  maTaiLieu: number;
  tenFile: string;
  loaiTaiLieu: LoaiTaiLieu;
  maMonHoc: number | null;
  tenMonHoc: string | null;
  kichThuocBytes: number;
  soTrang: number;
  ngayTaiLen: string;
}

export async function getTaiLieus(): Promise<TaiLieu[]> {
  const res = await api.get<TaiLieu[]>('/tai-lieu');
  return res.data;
}

export async function uploadTaiLieu(
  file: File,
  loaiTaiLieu: LoaiTaiLieu,
  maMonHoc: number | null,
): Promise<TaiLieu> {
  const form = new FormData();
  form.append('file', file);
  form.append('loaiTaiLieu', loaiTaiLieu);
  if (maMonHoc != null) form.append('maMonHoc', String(maMonHoc));
  const res = await api.post<TaiLieu>('/tai-lieu', form);
  return res.data;
}

export async function deleteTaiLieu(id: number): Promise<void> {
  await api.delete(`/tai-lieu/${id}`);
}

export async function getTaiLieuSinhVien(): Promise<TaiLieuSinhVien[]> {
  const res = await api.get<TaiLieuSinhVien[]>('/tai-lieu/sinh-vien');
  return res.data;
}

// Tải file PDF về (kèm token) rồi mở/lưu trên máy
export async function downloadTaiLieu(id: number, tenFile: string): Promise<void> {
  const res = await api.get(`/tai-lieu/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = tenFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export function formatKichThuoc(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
