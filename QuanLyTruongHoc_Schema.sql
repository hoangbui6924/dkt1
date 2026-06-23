-- =========================================================
-- CSDL: QuanLyTruongHoc
-- =========================================================

CREATE DATABASE QuanLyTruongHoc;
GO
USE QuanLyTruongHoc;
GO

-- ============== 1. QUYỀN & TÀI KHOẢN ==============
CREATE TABLE Quyen (
    MaQuyen     INT IDENTITY(1,1) PRIMARY KEY,
    TenQuyen    NVARCHAR(50) NOT NULL UNIQUE   -- Admin, GiaoVu, GiangVien, SinhVien...
);

CREATE TABLE TaiKhoan (
    MaTaiKhoan   INT IDENTITY(1,1) PRIMARY KEY,
    TenDangNhap  NVARCHAR(50) NOT NULL UNIQUE,
    MatKhauHash  NVARCHAR(255) NOT NULL,
    MaQuyen      INT NOT NULL,
    TrangThai    BIT NOT NULL DEFAULT 1,
    NgayTao      DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_TaiKhoan_Quyen FOREIGN KEY (MaQuyen) REFERENCES Quyen(MaQuyen)
);

-- ============== 2. NĂM HỌC & HỌC KỲ ==============
CREATE TABLE NamHoc (
    MaNamHoc    INT IDENTITY(1,1) PRIMARY KEY,
    TenNamHoc   NVARCHAR(20) NOT NULL UNIQUE,  -- VD: 2025-2026
    NgayBatDau  DATE NOT NULL,
    NgayKetThuc DATE NOT NULL
);

CREATE TABLE HocKy (
    MaHocKy     INT IDENTITY(1,1) PRIMARY KEY,
    TenHocKy    NVARCHAR(20) NOT NULL,          -- HK1, HK2, HK Phụ
    MaNamHoc    INT NOT NULL,
    NgayBatDau  DATE NOT NULL,
    NgayKetThuc DATE NOT NULL,
    CONSTRAINT FK_HocKy_NamHoc FOREIGN KEY (MaNamHoc) REFERENCES NamHoc(MaNamHoc),
    CONSTRAINT UQ_HocKy UNIQUE (MaNamHoc, TenHocKy)
);

-- ============== 3. KHOA VIỆN / NGÀNH / BỘ MÔN / MÔN HỌC ==============
CREATE TABLE KhoaVien (
    MaKhoaVien  INT IDENTITY(1,1) PRIMARY KEY,
    TenKhoaVien NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE NganhHoc (
    MaNganh     INT IDENTITY(1,1) PRIMARY KEY,
    TenNganh    NVARCHAR(100) NOT NULL,
    MaKhoaVien  INT NOT NULL,
    SoTinChiToanKhoa INT NOT NULL DEFAULT 0,     -- tổng tín chỉ cần để tốt nghiệp (tuỳ chọn)
    CONSTRAINT FK_NganhHoc_KhoaVien FOREIGN KEY (MaKhoaVien) REFERENCES KhoaVien(MaKhoaVien)
);

CREATE TABLE BoMon (
    MaBoMon     INT IDENTITY(1,1) PRIMARY KEY,
    TenBoMon    NVARCHAR(100) NOT NULL,
    MaKhoaVien  INT NOT NULL,
    CONSTRAINT FK_BoMon_KhoaVien FOREIGN KEY (MaKhoaVien) REFERENCES KhoaVien(MaKhoaVien)
);

CREATE TABLE MonHoc (
    MaMonHoc    INT IDENTITY(1,1) PRIMARY KEY,
    TenMonHoc   NVARCHAR(150) NOT NULL,
    SoTinChi    INT NOT NULL CHECK (SoTinChi > 0),
    MaBoMon     INT NOT NULL,
    CONSTRAINT FK_MonHoc_BoMon FOREIGN KEY (MaBoMon) REFERENCES BoMon(MaBoMon)
);

-- ============== 4. KHUNG CHƯƠNG TRÌNH (Ngành - Môn học) ==============
-- Vì 1 môn có thể bắt buộc với ngành này nhưng tự chọn với ngành khác
CREATE TABLE KhungChuongTrinh (
    MaKhungCT     INT IDENTITY(1,1) PRIMARY KEY,
    MaNganh       INT NOT NULL,
    MaMonHoc      INT NOT NULL,
    LoaiMon       NVARCHAR(20) NOT NULL CHECK (LoaiMon IN (N'BatBuoc', N'TuChon')),
    NhomTuChon    NVARCHAR(50) NULL,   -- nếu có nhiều nhóm tự chọn khác nhau, NULL nếu bắt buộc
    CONSTRAINT FK_KhungCT_Nganh FOREIGN KEY (MaNganh) REFERENCES NganhHoc(MaNganh),
    CONSTRAINT FK_KhungCT_MonHoc FOREIGN KEY (MaMonHoc) REFERENCES MonHoc(MaMonHoc),
    CONSTRAINT UQ_KhungCT UNIQUE (MaNganh, MaMonHoc)
);

-- ============== 5. GIẢNG VIÊN ==============
CREATE TABLE GiangVien (
    MaGiangVien INT IDENTITY(1,1) PRIMARY KEY,
    HoTen       NVARCHAR(100) NOT NULL,
    MaBoMon     INT NOT NULL,
    MaTaiKhoan  INT NULL,               -- liên kết tài khoản đăng nhập (nếu giảng viên cũng đăng nhập hệ thống)
    Email       NVARCHAR(100) NULL,
    SoDienThoai NVARCHAR(20) NULL,
    CONSTRAINT FK_GiangVien_BoMon FOREIGN KEY (MaBoMon) REFERENCES BoMon(MaBoMon),
    CONSTRAINT FK_GiangVien_TaiKhoan FOREIGN KEY (MaTaiKhoan) REFERENCES TaiKhoan(MaTaiKhoan)
);

-- ============== 6. NHÓM LỚP NGÀNH & SINH VIÊN ==============
CREATE TABLE NhomLopNganh (
    MaNhomLop   INT IDENTITY(1,1) PRIMARY KEY,
    TenNhomLop  NVARCHAR(50) NOT NULL,   -- VD: CNTT01-K17
    MaNganh     INT NOT NULL,
    KhoaHoc     NVARCHAR(20) NULL,       -- VD: K17
    CONSTRAINT FK_NhomLop_Nganh FOREIGN KEY (MaNganh) REFERENCES NganhHoc(MaNganh)
);

CREATE TABLE SinhVien (
    MaSinhVien      INT IDENTITY(1,1) PRIMARY KEY,
    MaSoSV          NVARCHAR(20) NOT NULL UNIQUE,
    HoTen           NVARCHAR(100) NOT NULL,
    NgaySinh        DATE NULL,
    GioiTinh        NVARCHAR(10) NULL,
    MaNhomLop       INT NOT NULL,
    MaTaiKhoan      INT NULL UNIQUE,
    TongTinChiTichLuy INT NOT NULL DEFAULT 0,        -- cache, cập nhật cuối mỗi kỳ
    GPATichLuy        DECIMAL(4,2) NOT NULL DEFAULT 0, -- cache, cập nhật cuối mỗi kỳ
    CONSTRAINT FK_SinhVien_NhomLop FOREIGN KEY (MaNhomLop) REFERENCES NhomLopNganh(MaNhomLop),
    CONSTRAINT FK_SinhVien_TaiKhoan FOREIGN KEY (MaTaiKhoan) REFERENCES TaiKhoan(MaTaiKhoan)
);

-- ============== 7. LỚP HỌC TRONG KỲ & GIẢNG VIÊN ĐỨNG LỚP ==============
CREATE TABLE LopHocTrongKy (
    MaLopHocKy  INT IDENTITY(1,1) PRIMARY KEY,
    MaMonHoc    INT NOT NULL,
    MaHocKy     INT NOT NULL,
    TenLop      NVARCHAR(50) NOT NULL,     -- VD: INT1234_01
    SiSoToiDa   INT NOT NULL DEFAULT 60,
    CONSTRAINT FK_LopHocKy_MonHoc FOREIGN KEY (MaMonHoc) REFERENCES MonHoc(MaMonHoc),
    CONSTRAINT FK_LopHocKy_HocKy FOREIGN KEY (MaHocKy) REFERENCES HocKy(MaHocKy),
    CONSTRAINT UQ_LopHocKy UNIQUE (MaMonHoc, MaHocKy, TenLop)
);

-- 1 lớp học phần có thể có nhiều giảng viên (LT/TH) -> bảng trung gian
CREATE TABLE LopHocKy_GiangVien (
    MaLopHocKy  INT NOT NULL,
    MaGiangVien INT NOT NULL,
    VaiTro      NVARCHAR(30) NULL,   -- VD: Lý thuyết, Thực hành, Phụ trách chính
    PRIMARY KEY (MaLopHocKy, MaGiangVien),
    CONSTRAINT FK_LHKGV_LopHocKy FOREIGN KEY (MaLopHocKy) REFERENCES LopHocTrongKy(MaLopHocKy),
    CONSTRAINT FK_LHKGV_GiangVien FOREIGN KEY (MaGiangVien) REFERENCES GiangVien(MaGiangVien)
);

-- ============== 8. ĐĂNG KÝ LỚP HỌC & ĐIỂM ==============
CREATE TABLE DangKyLopHoc (
    MaDangKy     INT IDENTITY(1,1) PRIMARY KEY,
    MaSinhVien   INT NOT NULL,
    MaLopHocKy   INT NOT NULL,
    NgayDangKy   DATETIME NOT NULL DEFAULT GETDATE(),
    TrangThai    NVARCHAR(20) NOT NULL DEFAULT N'DaDangKy',  -- DaDangKy, Huy
    CONSTRAINT FK_DangKy_SinhVien FOREIGN KEY (MaSinhVien) REFERENCES SinhVien(MaSinhVien),
    CONSTRAINT FK_DangKy_LopHocKy FOREIGN KEY (MaLopHocKy) REFERENCES LopHocTrongKy(MaLopHocKy),
    CONSTRAINT UQ_DangKy UNIQUE (MaSinhVien, MaLopHocKy)   -- 1 SV không đăng ký trùng 1 lớp
);

CREATE TABLE DiemHocPhan (
    MaDangKy    INT NOT NULL PRIMARY KEY,   -- 1-1 với DangKyLopHoc
    DiemX       DECIMAL(4,2) NULL,
    DiemY       DECIMAL(4,2) NULL,
    DiemZ       DECIMAL(4,2) NULL,
    NgayNhapDiem DATETIME NULL,
    CONSTRAINT FK_DiemHocPhan_DangKy FOREIGN KEY (MaDangKy) REFERENCES DangKyLopHoc(MaDangKy)
);

-- ============== 9. KẾT QUẢ HỌC TẬP THEO KỲ (lịch sử tích lũy) ==============
CREATE TABLE KetQuaHocTapKy (
    MaSinhVien          INT NOT NULL,
    MaHocKy             INT NOT NULL,
    TinChiDangKyKy      INT NOT NULL DEFAULT 0,
    TinChiDatKy         INT NOT NULL DEFAULT 0,   -- môn có DiemZ >= 4
    GPAKy               DECIMAL(4,2) NULL,
    TinChiTichLuyDenKy  INT NOT NULL DEFAULT 0,
    GPATichLuyDenKy     DECIMAL(4,2) NULL,
    PRIMARY KEY (MaSinhVien, MaHocKy),
    CONSTRAINT FK_KQHT_SinhVien FOREIGN KEY (MaSinhVien) REFERENCES SinhVien(MaSinhVien),
    CONSTRAINT FK_KQHT_HocKy FOREIGN KEY (MaHocKy) REFERENCES HocKy(MaHocKy)
);
GO
