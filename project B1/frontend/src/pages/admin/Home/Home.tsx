import { GraduationCap, Users, BookOpen, Layers, ClipboardList } from 'lucide-react';
import './Home.css';

const stats = [
  { label: 'Sinh viên', value: '—', icon: GraduationCap, accent: 'blue' },
  { label: 'Giảng viên', value: '—', icon: Users, accent: 'green' },
  { label: 'Môn học', value: '—', icon: BookOpen, accent: 'amber' },
  { label: 'Lớp học theo kỳ', value: '—', icon: Layers, accent: 'purple' },
];

const modules = [
  { title: 'Sinh viên', desc: 'Quản lý hồ sơ, nhóm lớp ngành, kết quả học tập' },
  { title: 'Giảng viên', desc: 'Quản lý giảng viên theo bộ môn, lớp học phần đứng dạy' },
  { title: 'Chương trình đào tạo', desc: 'Khoa viện, ngành học, bộ môn, môn học, khung chương trình' },
  { title: 'Lớp học theo kỳ', desc: 'Mở lớp, phân công giảng viên, đăng ký học phần' },
  { title: 'Điểm & học tập', desc: 'Nhập điểm X/Y/Z, theo dõi tín chỉ và GPA tích lũy' },
];

export default function Home() {
  return (
    <div className="dashboard">
      <div className="page-toolbar">
        <div className="page-toolbar-title">
          <ClipboardList size={18} />
          <span>Tổng quan hệ thống</span>
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

      <h2 className="section-title">Các phân hệ quản lý</h2>
      <div className="module-grid">
        {modules.map((m) => (
          <div className="module-card" key={m.title}>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
