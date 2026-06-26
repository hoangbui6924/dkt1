import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { studentMenu } from './menuConfig';
import ChatbotWidget from '../ChatbotWidget';
import { getSinhVienMe } from '../../services/sinhVienService';
import './AdminLayout.css';

function resolveTitle(pathname: string): string {
  for (const item of studentMenu) {
    if (item.path && pathname === item.path) return item.label;
    if (item.children) {
      const match = item.children.find((c) => pathname.startsWith(c.path));
      if (match) return match.label;
    }
  }
  return 'Tổng quan';
}

export default function StudentLayout() {
  const location = useLocation();
  const title = resolveTitle(location.pathname);
  const [hoTen, setHoTen] = useState<string | undefined>(undefined);

  useEffect(() => {
    getSinhVienMe()
      .then((sv) => setHoTen(sv.hoTen))
      .catch(() => {});
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar menu={studentMenu} brandLabel="VMU STUDENT" homePath="/student" />
      <div className="admin-main">
        <Topbar title={title} displayName={hoTen} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}
