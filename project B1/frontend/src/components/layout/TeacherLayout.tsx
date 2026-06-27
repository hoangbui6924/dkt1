import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { teacherMenu } from './menuConfig';
import { getGiangVienMe } from '../../services/giangVienService';
import './AdminLayout.css';

function resolveTitle(pathname: string): string {
  for (const item of teacherMenu) {
    if (item.path && pathname === item.path) return item.label;
    if (item.children) {
      const match = item.children.find((c) => pathname.startsWith(c.path));
      if (match) return match.label;
    }
  }
  return 'Tổng quan';
}

export default function TeacherLayout() {
  const location = useLocation();
  const title = resolveTitle(location.pathname);
  const [hoTen, setHoTen] = useState<string | undefined>(undefined);

  useEffect(() => {
    getGiangVienMe()
      .then((gv) => setHoTen(gv.hoTen))
      .catch(() => {});
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar menu={teacherMenu} brandLabel="VMU TEACHER" homePath="/teacher" />
      <div className="admin-main">
        <Topbar title={title} displayName={hoTen} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
