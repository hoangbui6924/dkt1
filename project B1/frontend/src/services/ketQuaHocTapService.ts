import api from './api';

export interface HocPhanKetQua {
  maMonHoc: number;
  tenMonHoc: string;
  soTinChi: number;
  diemX: number | null;
  diemY: number | null;
  diemZ: number | null;
  diemChu: string | null;
  ghiChu: string | null;
}

export interface HocKyKetQua {
  maHocKy: number;
  tenHocKy: string;
  tenNamHoc: string;
  hocPhans: HocPhanKetQua[];
}

export interface KetQuaHocTap {
  maSoSV: string;
  hoTen: string;
  ngaySinh: string | null;
  gioiTinh: string | null;
  tenNhomLop: string;
  tongTinChiTichLuy: number;
  gpaTichLuy: number;
  hocKys: HocKyKetQua[];
}

export async function getKetQuaHocTapMe(): Promise<KetQuaHocTap> {
  const res = await api.get<KetQuaHocTap>('/ket-qua-hoc-tap/me');
  return res.data;
}
