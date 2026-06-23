import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function Modal({ title, onClose, children, maxWidthClassName = 'max-w-[420px]' }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`flex w-full ${maxWidthClassName} max-h-[90vh] flex-col rounded-lg bg-white shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
