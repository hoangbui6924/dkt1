import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarRange,
  BarChart3,
  ScrollText,
  Settings,
  BookOpen,
  ClipboardList,
  Award,
  FileText,
} from 'lucide-react';

export interface MenuChild {
  label: string;
  path: string;
}

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  path?: string;
  children?: MenuChild[];
}

export const adminMenu: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: LayoutDashboard,
    path: '/admin',
  },
  {
    label: 'Quản lý danh mục',
    icon: FolderKanban,
    children: [
      { label: 'Khoa viện', path: '/admin/danh-muc/khoa-vien' },
      { label: 'Ngành học', path: '/admin/danh-muc/nganh-hoc' },
      { label: 'Bộ môn', path: '/admin/danh-muc/bo-mon' },
      { label: 'Môn học', path: '/admin/danh-muc/mon-hoc' },
      { label: 'Khung chương trình', path: '/admin/danh-muc/khung-chuong-trinh' },
    ],
  },
  {
    label: 'Quản lý người dùng',
    icon: Users,
    children: [
      { label: 'Sinh viên', path: '/admin/nguoi-dung/sinh-vien' },
      { label: 'Giảng viên', path: '/admin/nguoi-dung/giang-vien' },
      { label: 'Tài khoản & quyền', path: '/admin/nguoi-dung/tai-khoan' },
    ],
  },
  {
    label: 'Quản lý học vụ',
    icon: CalendarRange,
    children: [
      { label: 'Năm học & học kỳ', path: '/admin/hoc-vu/nam-hoc' },
      { label: 'Khoá học ngành', path: '/admin/hoc-vu/khoa-hoc-nganh' },
      { label: 'Lớp học theo kỳ', path: '/admin/hoc-vu/lop-hoc-ky' },
      { label: 'Đăng ký học phần', path: '/admin/hoc-vu/dang-ky' },
      { label: 'Nhập điểm', path: '/admin/hoc-vu/diem' },
    ],
  },
  {
    label: 'Quản lý tài liệu',
    icon: FileText,
    path: '/admin/tai-lieu',
  },
  {
    label: 'Thống kê & báo cáo',
    icon: BarChart3,
    path: '/admin/thong-ke',
  },
  {
    label: 'Nhật ký hệ thống',
    icon: ScrollText,
    path: '/admin/audit-log',
  },
  {
    label: 'Cài đặt',
    icon: Settings,
    path: '/admin/cai-dat',
  },
];

// Menu giảng viên: như admin nhưng giới hạn theo khoa viện (bỏ Khoa viện, Giảng viên,
// Năm học & học kỳ, Đăng ký học phần, Thống kê, Nhật ký).
export const teacherMenu: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: LayoutDashboard,
    path: '/teacher',
  },
  {
    label: 'Quản lý danh mục',
    icon: FolderKanban,
    children: [
      { label: 'Ngành học', path: '/teacher/danh-muc/nganh-hoc' },
      { label: 'Bộ môn', path: '/teacher/danh-muc/bo-mon' },
      { label: 'Môn học', path: '/teacher/danh-muc/mon-hoc' },
      { label: 'Khung chương trình', path: '/teacher/danh-muc/khung-chuong-trinh' },
    ],
  },
  {
    label: 'Quản lý người dùng',
    icon: Users,
    children: [
      { label: 'Sinh viên', path: '/teacher/nguoi-dung/sinh-vien' },
      { label: 'Tài khoản', path: '/teacher/nguoi-dung/tai-khoan' },
    ],
  },
  {
    label: 'Quản lý học vụ',
    icon: CalendarRange,
    children: [
      { label: 'Khoá học ngành', path: '/teacher/hoc-vu/khoa-hoc-nganh' },
      { label: 'Lớp học theo kỳ', path: '/teacher/hoc-vu/lop-hoc-ky' },
      { label: 'Nhập điểm', path: '/teacher/hoc-vu/diem' },
    ],
  },
  {
    label: 'Quản lý tài liệu',
    icon: FileText,
    path: '/teacher/tai-lieu',
  },
  {
    label: 'Cài đặt',
    icon: Settings,
    path: '/teacher/cai-dat',
  },
];

export const studentMenu: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: LayoutDashboard,
    path: '/student',
  },
  {
    label: 'Khung chương trình',
    icon: BookOpen,
    path: '/student/khung-chuong-trinh',
  },
  {
    label: 'Đăng ký học phần',
    icon: ClipboardList,
    path: '/student/dang-ky',
  },
  {
    label: 'Kết quả học tập',
    icon: Award,
    path: '/student/ket-qua-hoc-tap',
  },
  {
    label: 'Tài liệu môn học',
    icon: FileText,
    path: '/student/tai-lieu',
  },
  {
    label: 'Cài đặt',
    icon: Settings,
    path: '/student/cai-dat',
  },
];
