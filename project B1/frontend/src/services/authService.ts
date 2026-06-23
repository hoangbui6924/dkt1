import api from './api';

export interface LoginRequest {
  tenDangNhap: string;
  matKhau: string;
}

export interface LoginResponse {
  token: string;
  tenDangNhap: string;
  tenQuyen: string;
  expiresAt: string;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', payload);
  return res.data;
}
