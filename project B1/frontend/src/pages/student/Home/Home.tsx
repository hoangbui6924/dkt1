import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Award, Layers, BookOpen, ClipboardList } from 'lucide-react';
import { type SinhVien, getSinhVienMe } from '../../../services/sinhVienService';
import '../../admin/Home/Home.css';

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
    },
    { title: 'Đăng ký học phần', desc: 'Đăng ký lớp học phần cho học kỳ sắp tới', path: '/student/dang-ky' },
    { title: 'Kết quả học tập', desc: 'Xem điểm số, GPA theo từng học kỳ', path: '/student/ket-qua-hoc-tap' },
  ];

  return (
    <div className="dashboard">
      <div className="page-toolbar">
        <div className="page-toolbar-title">
          <ClipboardList size={18} />
          <span>Tổng quan</span>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Đang tải...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {sinhVien && (
        <>
          <div className="stat-card" style={{ gap: 16 }}>
            <div className="stat-icon stat-icon-blue">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="stat-value">{sinhVien.hoTen}</div>
              <div className="stat-label">
                {sinhVien.maSoSV} · {sinhVien.tenNganh} · {sinhVien.tenKhoaVien}
              </div>
            </div>
          </div>

          <div className="stat-grid">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div className="stat-card" key={s.label}>
                  <div className={`stat-icon stat-icon-${s.accent}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="section-title">Chức năng</h2>
          <div className="module-grid">
            {modules.map((m) => (
              <div
                className="module-card"
                key={m.title}
                onClick={() => navigate(m.path)}
                style={{ cursor: 'pointer' }}
              >
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
