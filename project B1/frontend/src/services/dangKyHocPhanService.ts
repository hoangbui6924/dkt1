import api from './api';

export interface BuoiHoc {
  thu: number;
  tietBatDau: number;
  tietKetThuc: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  phongHoc: string | null;
}

export interface HocKyDangKy {
  maHocKy: number;
  tenHocKy: string;
  loaiHocKy: string;
  maNamHoc: number;
  tenNamHoc: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  hanDangKyTu: string | null;
  hanDangKyDen: string | null;
  hanRutDangKyTu: string | null;
  hanRutDangKyDen: string | null;
  dangMoDangKy: boolean;
  dangMoRut: boolean;
  tenDotHienTai: string | null;
}

export interface LopDaDangKy {
  maDangKy: number;
  maLopHocKy: number;
  tenLop: string;
  maMonHoc: number;
  tenMonHoc: string;
  soTinChi: number;
  loaiHinh: string;
  maGiangVien: number | null;
  tenGiangVien: string | null;
  soLuongDaDangKy: number;
  siSoToiDa: number;
  buoiHocs: BuoiHoc[];
}

export interface MonHocChuongTrinh {
  maMonHoc: number;
  tenMonHoc: string;
  loaiMonHoc: string;
  soTinChi: number;
  kyHoc: number;
  trangThai: 'DaDat' | 'KhongDat' | 'ChuaHoc' | 'DangHoc';
  diemZCaoNhat: number | null;
  coLop: boolean;
  caiThien: boolean;
  daDangKyKyNay: boolean;
  khongDuDieuKien: boolean;
  chuaToiKy: boolean;
  coTheDangKy: boolean;
  lyDoKhongDangKy: string | null;
}

export interface ChuongTrinhDangKy {
  namThu: number;
  kyDat: number;
  monHocs: MonHocChuongTrinh[];
}

export interface LopCuaMon {
  maLopHocKy: number;
  tenLop: string;
  loaiHinh: string;
  maGiangVien: number | null;
  tenGiangVien: string | null;
  soLuongDaDangKy: number;
  siSoToiDa: number;
  daDay: boolean;
  trungLich: boolean;
  laLopHienTai: boolean;
  buoiHocs: BuoiHoc[];
}

export async function getHocKyMo(): Promise<HocKyDangKy | null> {
  const res = await api.get<HocKyDangKy>('/dang-ky-hoc-phan/hoc-ky-mo');
  if (res.status === 204 || !res.data) return null;
  return res.data;
}

export async function getDaDangKy(maHocKy: number): Promise<LopDaDangKy[]> {
  const res = await api.get<LopDaDangKy[]>(`/dang-ky-hoc-phan/${maHocKy}/da-dang-ky`);
  return res.data;
}

export async function getChuongTrinh(maHocKy: number): Promise<ChuongTrinhDangKy> {
  const res = await api.get<ChuongTrinhDangKy>(`/dang-ky-hoc-phan/${maHocKy}/chuong-trinh`);
  return res.data;
}

export async function getLopCuaMon(maHocKy: number, maMonHoc: number): Promise<LopCuaMon[]> {
  const res = await api.get<LopCuaMon[]>(`/dang-ky-hoc-phan/${maHocKy}/mon/${maMonHoc}/lop`);
  return res.data;
}

export async function dangKyLop(maLopHocKy: number): Promise<LopDaDangKy> {
  const res = await api.post<LopDaDangKy>(`/dang-ky-hoc-phan/${maLopHocKy}`);
  return res.data;
}

export async function huyDangKy(maDangKy: number): Promise<void> {
  await api.delete(`/dang-ky-hoc-phan/${maDangKy}`);
}

export async function doiLop(maDangKy: number, maLopHocKyMoi: number): Promise<LopDaDangKy> {
  const res = await api.put<LopDaDangKy>(`/dang-ky-hoc-phan/${maDangKy}/doi-lop`, { maLopHocKyMoi });
  return res.data;
}

export interface MonHocGoiY {
  maMonHoc: number;
  tenMonHoc: string;
  maLopHocKy: number;
  tenLop: string;
  loaiHinh: string;
  soTinChi: number;
  tenGiangVien: string | null;
  buoiHocs: BuoiHoc[];
}

export interface MonKhongXepDuoc {
  tenMonHoc: string;
  lyDo: string;
}

export interface GoiYThoiKhoaBieuResult {
  monHocs: MonHocGoiY[];
  monKhongXepDuoc: MonKhongXepDuoc[];
  ghiChu: string[];
}

export async function goiYThoiKhoaBieu(yeuCau: string): Promise<GoiYThoiKhoaBieuResult[]> {
  const res = await api.post<GoiYThoiKhoaBieuResult[]>('/dang-ky-hoc-phan/goi-y-thoi-khoa-bieu', { yeuCau });
  return res.data;
}
