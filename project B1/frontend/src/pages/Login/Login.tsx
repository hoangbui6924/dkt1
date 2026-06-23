import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export default function Login() {
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
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
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Đăng nhập quản trị</h1>
        <p className="login-subtitle">Hệ thống Quản lý Trường học</p>

        <label htmlFor="tenDangNhap">Tên đăng nhập</label>
        <input
          id="tenDangNhap"
          type="text"
          value={tenDangNhap}
          onChange={(e) => setTenDangNhap(e.target.value)}
          required
          autoFocus
        />

        <label htmlFor="matKhau">Mật khẩu</label>
        <input
          id="matKhau"
          type="password"
          value={matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          required
        />

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
