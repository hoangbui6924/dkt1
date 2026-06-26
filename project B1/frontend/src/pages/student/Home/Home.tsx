import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Award, Layers, BookOpen, ClipboardList, CalendarPlus, ArrowRight } from 'lucide-react';
import { type SinhVien, getSinhVienMe } from '../../../services/sinhVienService';
import './Home.css';

export default function StudentHome() {
  const navigate = useNavigate();
  const [sinhVien, setSinhVien] = useState<SinhVien | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSinhVienMe()
      .then(setSinhVien)
      .catch(() => setError('Không thể tải thông tin sinh viên'))
      .finally(() => setLoading(false));
  }, []);

  const stats = sinhVien
    ? [
        { label: 'GPA tích lũy', value: sinhVien.gpaTichLuy.toFixed(2), icon: Award, accent: 'blue' },
        { label: 'Tín chỉ tích lũy', value: String(sinhVien.tongTinChiTichLuy), icon: GraduationCap, accent: 'green' },
        { label: 'Khoá học', value: sinhVien.tenKhoaHoc, icon: BookOpen, accent: 'amber' },
        { label: 'Nhóm lớp', value: sinhVien.tenNhomLop ?? 'Chưa có', icon: Layers, accent: 'purple' },
      ]
    : [];

  const modules = [
    {
      title: 'Khung chương trình',
      desc: 'Theo dõi chương trình đào tạo của ngành, môn học theo từng học kỳ',
      path: '/student/khung-chuong-trinh',
      icon: ClipboardList,
      color: '#2f6fed',
      soft: 'rgba(47, 111, 237, 0.08)',
      soft2: 'rgba(47, 111, 237, 0.05)',
    },
    {
      title: 'Đăng ký học phần',
      desc: 'Đăng ký lớp học phần cho học kỳ sắp tới',
      path: '/student/dang-ky',
      icon: CalendarPlus,
      color: '#16a34a',
      soft: 'rgba(22, 163, 74, 0.08)',
      soft2: 'rgba(22, 163, 74, 0.05)',
    },
    {
      title: 'Kết quả học tập',
      desc: 'Xem điểm số, GPA theo từng học kỳ',
      path: '/student/ket-qua-hoc-tap',
      icon: Award,
      color: '#7c3aed',
      soft: 'rgba(124, 58, 237, 0.08)',
      soft2: 'rgba(124, 58, 237, 0.05)',
    },
  ];

  return (
    <div className="sd-dashboard">
      {loading && <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {sinhVien && (
        <>
          <div className="sd-welcome">
            <div className="sd-avatar">
              <GraduationCap size={28} />
            </div>
            <div className="sd-welcome-info">
              <h1>Xin chào, {sinhVien.hoTen} 👋</h1>
              <p>
                {sinhVien.maSoSV} · {sinhVien.tenNganh} · {sinhVien.tenKhoaVien}
              </p>
            </div>
          </div>

          <div className="sd-stat-grid">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div className="sd-stat-card" key={s.label}>
                  <div className={`sd-stat-icon sd-stat-icon-${s.accent}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="sd-stat-value">{s.value}</div>
                    <div className="sd-stat-label">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="sd-section-title">Chức năng</h2>
          <div className="sd-feature-grid">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  className="sd-feature-card"
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
                    <div className="sd-feature-icon" style={{ background: m.color }}>
                      <Icon size={22} />
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.desc}</p>
                  </div>
                  <span className="sd-feature-arrow" style={{ color: m.color }}>
                    Truy cập <ArrowRight size={14} />
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
