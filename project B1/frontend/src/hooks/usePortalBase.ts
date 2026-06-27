import { useLocation } from 'react-router-dom';

// Trả về prefix cổng hiện tại ('/teacher' hoặc '/admin') để các trang dùng chung điều hướng đúng cổng.
export function usePortalBase(): string {
  const { pathname } = useLocation();
  return pathname.startsWith('/teacher') ? '/teacher' : '/admin';
}
