import { Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/admin/Home/Home';
import KhoaVien from './pages/admin/KhoaVien/KhoaVien';
import NganhHoc from './pages/admin/NganhHoc/NganhHoc';
import BoMon from './pages/admin/BoMon/BoMon';
import MonHoc from './pages/admin/MonHoc/MonHoc';
import KhungChuongTrinh from './pages/admin/KhungChuongTrinh/KhungChuongTrinh';
import KhungChuongTrinhDetail from './pages/admin/KhungChuongTrinh/KhungChuongTrinhDetail';
import GiangVien from './pages/admin/GiangVien/GiangVien';
import SinhVien from './pages/admin/SinhVien/SinhVien';
import TaiKhoan from './pages/admin/TaiKhoan/TaiKhoan';
import NamHoc from './pages/admin/HocVu/NamHoc';
import KhoaHocNganh from './pages/admin/HocVu/KhoaHocNganh';
import LopHocTrongKy from './pages/admin/HocVu/LopHocTrongKy';
import DangKyDot from './pages/admin/HocVu/DangKyDot';
import NhapDiem from './pages/admin/HocVu/NhapDiem';
import TaiLieu from './pages/admin/TaiLieu/TaiLieu';
import StudentHome from './pages/student/Home/Home';
import StudentKhungChuongTrinh from './pages/student/KhungChuongTrinh/KhungChuongTrinh';
import StudentDangKy from './pages/student/DangKy/DangKy';
import StudentKetQuaHocTap from './pages/student/KetQuaHocTap/KetQuaHocTap';
import StudentTaiLieu from './pages/student/TaiLieu/TaiLieu';
import AdminLayout from './components/layout/AdminLayout';
import StudentLayout from './components/layout/StudentLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ComingSoon from './components/ComingSoon';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.tenQuyen === 'SinhVien' ? '/student' : '/admin'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="danh-muc/khoa-vien" element={<KhoaVien />} />
        <Route path="danh-muc/nganh-hoc" element={<NganhHoc />} />
        <Route path="danh-muc/bo-mon" element={<BoMon />} />
        <Route path="danh-muc/mon-hoc" element={<MonHoc />} />
        <Route path="danh-muc/khung-chuong-trinh" element={<KhungChuongTrinh />} />
        <Route path="danh-muc/khung-chuong-trinh/:id" element={<KhungChuongTrinhDetail />} />
        <Route path="nguoi-dung/giang-vien" element={<GiangVien />} />
        <Route path="nguoi-dung/sinh-vien" element={<SinhVien />} />
        <Route path="nguoi-dung/tai-khoan" element={<TaiKhoan />} />
        <Route path="hoc-vu/nam-hoc" element={<NamHoc />} />
        <Route path="hoc-vu/khoa-hoc-nganh" element={<KhoaHocNganh />} />
        <Route path="hoc-vu/lop-hoc-ky" element={<LopHocTrongKy />} />
        <Route path="hoc-vu/dang-ky" element={<DangKyDot />} />
        <Route path="hoc-vu/diem" element={<NhapDiem />} />
        <Route path="tai-lieu" element={<TaiLieu />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentHome />} />
        <Route path="khung-chuong-trinh" element={<StudentKhungChuongTrinh />} />
        <Route path="dang-ky" element={<StudentDangKy />} />
        <Route path="ket-qua-hoc-tap" element={<StudentKetQuaHocTap />} />
        <Route path="tai-lieu" element={<StudentTaiLieu />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}
