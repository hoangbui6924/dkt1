import api from './api';

export interface KhungChuongTrinh {
  maKhungChuongTrinh: number;
  maNganhHoc: number;
  tenNganh: string;
  tenKhoaVien: string;
  tongTinChi: number;
  soTinChiBatBuoc: number;
  soTinChiTuChonToiThieu: number;
  soTinChiBatBuocThucTe: number;
  soTinChiTuChonThucTe: number;
  soMonHoc: number;
}

export interface KhungChuongTrinhInput {
  tongTinChi: number;
  soTinChiBatBuoc: number;
  soTinChiTuChonToiThieu: number;
}

export interface MonHocTrongKhung {
  ma: number;
  maMonHoc: number;
  tenMonHoc: string;
  loaiMonHoc: string;
  soTinChi: number;
  maBoMon: number;
  tenBoMon: string;
  maKhoaVien: number | null;
  tenKhoaVien: string | null;
  kyHoc: number;
  maMonHocTienQuyet: number | null;
  tenMonHocTienQuyet: string | null;
}

export async function getKhungChuongTrinhs(): Promise<KhungChuongTrinh[]> {
  const res = await api.get<KhungChuongTrinh[]>('/khung-chuong-trinh');
  return res.data;
}

export async function getKhungChuongTrinh(id: number): Promise<KhungChuongTrinh> {
  const res = await api.get<KhungChuongTrinh>(`/khung-chuong-trinh/${id}`);
  return res.data;
}

export async function getKhungChuongTrinhByNganh(maNganh: number): Promise<KhungChuongTrinh | null> {
  try {
    const res = await api.get<KhungChuongTrinh>(`/khung-chuong-trinh/by-nganh/${maNganh}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function createKhungChuongTrinh(
  maNganhHoc: number,
  input: KhungChuongTrinhInput,
): Promise<KhungChuongTrinh> {
  const res = await api.post<KhungChuongTrinh>('/khung-chuong-trinh', { maNganhHoc, ...input });
  return res.data;
}

export async function updateKhungChuongTrinh(id: number, input: KhungChuongTrinhInput): Promise<void> {
  await api.put(`/khung-chuong-trinh/${id}`, input);
}

export async function deleteKhungChuongTrinh(id: number): Promise<void> {
  await api.delete(`/khung-chuong-trinh/${id}`);
}

export async function getMonHocsTrongKhung(maKhungChuongTrinh: number): Promise<MonHocTrongKhung[]> {
  const res = await api.get<MonHocTrongKhung[]>(`/khung-chuong-trinh/${maKhungChuongTrinh}/mon-hoc`);
  return res.data;
}

export async function addMonHocVaoKhung(maKhungChuongTrinh: number, maMonHoc: number, kyHoc: number): Promise<void> {
  await api.post(`/khung-chuong-trinh/${maKhungChuongTrinh}/mon-hoc`, { maMonHoc, kyHoc });
}

export async function updateKyHoc(ma: number, kyHoc: number): Promise<void> {
  await api.put(`/khung-chuong-trinh/mon-hoc/${ma}`, { kyHoc });
}

export async function removeMonHocKhoiKhung(ma: number): Promise<void> {
  await api.delete(`/khung-chuong-trinh/mon-hoc/${ma}`);
}
