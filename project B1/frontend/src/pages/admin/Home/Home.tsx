import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getSinhViens } from '../../../services/sinhVienService';
import { getGiangViens } from '../../../services/giangVienService';
import { getMonHocs } from '../../../services/monHocService';
import { getLopHocTrongKys } from '../../../services/lopHocTrongKyService';
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  ShieldCheck,
  FolderKanban,
  CalendarClock,
  Award,
  ArrowRight,
} from 'lucide-react';
import '../../../components/Dashboard.css';

interface ThongKe {
  sinhVien: number;
  giangVien: number;
  monHoc: number;
  lopHocKy: number;
}

const modules = [
  {
    title: 'Sinh viên',
    desc: 'Quản lý hồ sơ, nhóm lớp ngành, kết quả học tập',
    path: '/admin/nguoi-dung/sinh-vien',
    icon: GraduationCap,
    color: '#2f6fed',
    soft: 'rgba(47, 111, 237, 0.08)',
    soft2: 'rgba(47, 111, 237, 0.05)',
  },
  {
    title: 'Giảng viên',
    desc: 'Quản lý giảng viên theo bộ môn, lớp học phần đứng dạy',
    path: '/admin/nguoi-dung/giang-vien',
    icon: Users,
    color: '#16a34a',
    soft: 'rgba(22, 163, 74, 0.08)',
    soft2: 'rgba(22, 163, 74, 0.05)',
  },
  {
    title: 'Chương trình đào tạo',
    desc: 'Khoa viện, ngành học, bộ môn, môn học, khung chương trình',
    path: '/admin/danh-muc/khoa-vien',
    icon: FolderKanban,
    color: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.08)',
    soft2: 'rgba(124, 58, 237, 0.05)',
  },
  {
    title: 'Lớp học theo kỳ',
    desc: 'Mở lớp, phân công giảng viên, đăng ký học phần',
    path: '/admin/hoc-vu/lop-hoc-ky',
    icon: CalendarClock,
    color: '#d97706',
    soft: 'rgba(217, 119, 6, 0.08)',
    soft2: 'rgba(217, 119, 6, 0.05)',
  },
  {
    title: 'Điểm & học tập',
    desc: 'Nhập điểm X/Y/Z, theo dõi tín chỉ và GPA tích lũy',
    path: '/admin/hoc-vu/diem',
    icon: Award,
    color: '#e11d48',
    soft: 'rgba(225, 29, 72, 0.08)',
    soft2: 'rgba(225, 29, 72, 0.05)',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [thongKe, setThongKe] = useState<ThongKe | null>(null);

  useEffect(() => {
    Promise.all([getSinhViens(), getGiangViens(), getMonHocs(), getLopHocTrongKys()])
      .then(([sinhViens, giangViens, monHocs, lopHocKys]) =>
        setThongKe({
          sinhVien: sinhViens.length,
          giangVien: giangViens.length,
          monHoc: monHocs.length,
          lopHocKy: lopHocKys.length,
        }),
      )
      .catch(() => setThongKe({ sinhVien: 0, giangVien: 0, monHoc: 0, lopHocKy: 0 }));
  }, []);

  const stats = [
    { label: 'Sinh viên', value: thongKe ? String(thongKe.sinhVien) : '—', icon: GraduationCap, accent: 'blue' },
    { label: 'Giảng viên', value: thongKe ? String(thongKe.giangVien) : '—', icon: Users, accent: 'green' },
    { label: 'Môn học', value: thongKe ? String(thongKe.monHoc) : '—', icon: BookOpen, accent: 'amber' },
    { label: 'Lớp học theo kỳ', value: thongKe ? String(thongKe.lopHocKy) : '—', icon: Layers, accent: 'purple' },
  ];

  return (
    <div className="dash-dashboard">
      <div className="dash-welcome">
        <div className="dash-avatar">
          <ShieldCheck size={28} />
        </div>
        <div className="dash-welcome-info">
          <h1>Xin chào, {user?.tenDangNhap ?? 'Quản trị viên'} 👋</h1>
          <p>Tổng quan hệ thống Quản lý Trường học</p>
        </div>
      </div>

      <div className="dash-stat-grid">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div className="dash-stat-card" key={s.label}>
              <div className={`dash-stat-icon dash-stat-icon-${s.accent}`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="dash-stat-value">{s.value}</div>
                <div className="dash-stat-label">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="dash-section-title">Các phân hệ quản lý</h2>
      <div className="dash-feature-grid">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              className="dash-feature-card"
              key={m.title}
              onClick={() => navigate(m.path)}
              style={
                {
                  '--accent-color': m.color,
                  '--accent-soft': m.soft,
                  '--accent-soft-2': m.soft2,
                } as React.CSSProperties
              }
            >
              <div>
                <div className="dash-feature-icon" style={{ background: m.color }}>
                  <Icon size={22} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
              <span className="dash-feature-arrow" style={{ color: m.color }}>
                Truy cập <ArrowRight size={14} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
