import api from './api';

export interface TaiKhoan {
  maTaiKhoan: number;
  tenDangNhap: string;
  maQuyen: number;
  tenQuyen: string;
  trangThai: boolean;
  ngayTao: string;
  hoTen: string | null;
  maSoSV: string | null;
  email: string | null;
}

export interface UpdateTaiKhoanInput {
  tenDangNhap: string;
  trangThai: boolean;
}

export async function getTaiKhoans(): Promise<TaiKhoan[]> {
  const res = await api.get<TaiKhoan[]>('/tai-khoan');
  return res.data;
}

export async function updateTaiKhoan(id: number, input: UpdateTaiKhoanInput): Promise<void> {
  await api.put(`/tai-khoan/${id}`, input);
}

export async function datLaiMatKhau(id: number): Promise<{ matKhauMoi: string }> {
  const res = await api.post<{ matKhauMoi: string }>(`/tai-khoan/${id}/dat-lai-mat-khau`);
  return res.data;
}
