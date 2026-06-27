import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Layers,
  CalendarClock,
  FolderKanban,
  Award,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { type GiangVien, getGiangVienMe } from '../../../services/giangVienService';
import { getNganhHocs } from '../../../services/nganhHocService';
import { getMonHocs } from '../../../services/monHocService';
import '../../../components/Dashboard.css';

interface ThongKe {
  nganh: number;
  monHoc: number;
  lopDangDay: number;
}

export default function TeacherHome() {
  const navigate = useNavigate();
  const [giangVien, setGiangVien] = useState<GiangVien | null>(null);
  const [thongKe, setThongKe] = useState<ThongKe | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getGiangVienMe(), getNganhHocs(), getMonHocs()])
      .then(([me, nganhs, monHocs]) => {
        setGiangVien(me);
        setThongKe({ nganh: nganhs.length, monHoc: monHocs.length, lopDangDay: me.soLopDangDay });
      })
      .catch(() => setError('Không thể tải thông tin giảng viên'));
  }, []);

  const stats = [
    { label: 'Ngành học (khoa viện)', value: thongKe ? String(thongKe.nganh) : '—', icon: GraduationCap, accent: 'blue' },
    { label: 'Môn học (khoa viện)', value: thongKe ? String(thongKe.monHoc) : '—', icon: BookOpen, accent: 'amber' },
    { label: 'Lớp đang dạy', value: thongKe ? String(thongKe.lopDangDay) : '—', icon: CalendarClock, accent: 'green' },
    {
      label: 'Bộ môn / Khoa viện',
      value: giangVien?.tenBoMon ?? giangVien?.tenKhoaVien ?? '—',
      icon: Layers,
      accent: 'purple',
    },
  ];

  const modules = [
    {
      title: 'Quản lý danh mục',
      desc: 'Ngành học, bộ môn, môn học, khung chương trình của khoa viện',
      path: '/teacher/danh-muc/nganh-hoc',
      icon: FolderKanban,
      color: '#2f6fed',
      soft: 'rgba(47, 111, 237, 0.08)',
      soft2: 'rgba(47, 111, 237, 0.05)',
    },
    {
      title: 'Sinh viên & tài khoản',
      desc: 'Quản lý sinh viên và tài khoản thuộc khoa viện của bạn',
      path: '/teacher/nguoi-dung/sinh-vien',
      icon: GraduationCap,
      color: '#16a34a',
      soft: 'rgba(22, 163, 74, 0.08)',
      soft2: 'rgba(22, 163, 74, 0.05)',
    },
    {
      title: 'Lớp học theo kỳ',
      desc: 'Mở lớp, phân công giảng viên cho môn của khoa viện',
      path: '/teacher/hoc-vu/lop-hoc-ky',
      icon: CalendarClock,
      color: '#d97706',
      soft: 'rgba(217, 119, 6, 0.08)',
      soft2: 'rgba(217, 119, 6, 0.05)',
    },
    {
      title: 'Nhập điểm',
      desc: 'Nhập điểm cho các lớp học phần bạn đứng dạy',
      path: '/teacher/hoc-vu/diem',
      icon: Award,
      color: '#7c3aed',
      soft: 'rgba(124, 58, 237, 0.08)',
      soft2: 'rgba(124, 58, 237, 0.05)',
    },
    {
      title: 'Quản lý tài liệu',
      desc: 'Tải lên & quản lý giáo trình cho môn học của khoa viện',
      path: '/teacher/tai-lieu',
      icon: FileText,
      color: '#e11d48',
      soft: 'rgba(225, 29, 72, 0.08)',
      soft2: 'rgba(225, 29, 72, 0.05)',
    },
  ];

  return (
    <div className="dash-dashboard">
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="dash-welcome">
        <div className="dash-avatar">
          <GraduationCap size={28} />
        </div>
        <div className="dash-welcome-info">
          <h1>Xin chào, {giangVien?.hoTen ?? 'Giảng viên'} 👋</h1>
          <p>
            {giangVien?.tenBoMon ?? giangVien?.tenKhoaVien
              ? `${giangVien?.tenBoMon ?? giangVien?.tenKhoaVien} · Cổng giảng viên`
              : 'Cổng giảng viên'}
          </p>
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

      <h2 className="dash-section-title">Chức năng</h2>
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
