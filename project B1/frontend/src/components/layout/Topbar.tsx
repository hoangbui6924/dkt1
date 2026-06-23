import { useEffect, useState } from 'react';
import { Wifi, Settings, Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = now.toLocaleDateString('vi-VN');
  const timeLabel = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>

      <div className="topbar-right">
        <span className="topbar-status">
          <Wifi size={16} />
          Online
        </span>

        <button className="topbar-icon-btn" type="button" aria-label="Cài đặt">
          <Settings size={18} />
        </button>

        <button className="topbar-icon-btn" type="button" aria-label="Thông báo">
          <Bell size={18} />
        </button>

        <span className="topbar-datetime">
          {dateLabel} {timeLabel}
        </span>

        <div className="topbar-user">
          <button className="topbar-user-btn" type="button" onClick={() => setMenuOpen((v) => !v)}>
            <span className="topbar-avatar">{user?.tenDangNhap?.charAt(0).toUpperCase() ?? 'A'}</span>
            <span className="topbar-user-info">
              <strong>{user?.tenDangNhap}</strong>
              <small>{user?.tenQuyen}</small>
            </span>
            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="topbar-dropdown">
              <button type="button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
