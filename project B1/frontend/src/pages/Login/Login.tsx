import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { login } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import vmuLogo from '../../assets/vmu-logo.png';
import vmuBg from '../../assets/vmu-bg.jpg';
import './Login.css';

export default function Login() {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ tenDangNhap, matKhau });
      setSession(res.token, { tenDangNhap: res.tenDangNhap, tenQuyen: res.tenQuyen });
      navigate(res.tenQuyen === 'SinhVien' ? '/student' : '/admin');
    } catch {
      setError('Sai tên đăng nhập hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page" style={{ backgroundImage: `url(${vmuBg})` }}>
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={vmuLogo} alt="VMU" className="login-logo" />
        <h1>TRƯỜNG ĐẠI HỌC HÀNG HẢI VIỆT NAM</h1>
        <p className="login-subtitle">Hệ thống Quản lý Trường học</p>

        <label htmlFor="tenDangNhap" className="sr-only">Tên đăng nhập</label>
        <div className="login-field">
          <User size={18} className="login-field-icon" />
          <input
            id="tenDangNhap"
            type="text"
            placeholder="Tên đăng nhập"
            value={tenDangNhap}
            onChange={(e) => setTenDangNhap(e.target.value)}
            required
            autoFocus
          />
        </div>

        <label htmlFor="matKhau" className="sr-only">Mật khẩu</label>
        <div className="login-field">
          <Lock size={18} className="login-field-icon" />
          <input
            id="matKhau"
            type={hienMatKhau ? 'text' : 'password'}
            placeholder="Mật khẩu"
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
            required
          />
          <button
            type="button"
            className="login-field-toggle"
            onClick={() => setHienMatKhau((v) => !v)}
            aria-label={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {hienMatKhau ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p className="login-footer">© {new Date().getFullYear()} Trường Đại học Hàng hải Việt Nam</p>
      </form>
    </div>
  );
}
