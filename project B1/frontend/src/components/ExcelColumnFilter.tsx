import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Filter, Search } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

export interface ExcelFilterOption {
  value: string;
  label: string;
}

interface ExcelColumnFilterProps {
  options: ExcelFilterOption[];
  selected: Set<string> | null; // null = chưa lọc (hiển thị tất cả)
  onChange: (selected: Set<string> | null) => void;
  sortDir: SortDir | null; // hướng sắp xếp hiện tại nếu cột này đang được dùng để sort
  onSort: (dir: SortDir) => void;
  sortLabels?: [string, string];
  searchPlaceholder?: string;
}

// Nút lọc/sắp xếp kiểu AutoFilter của Excel: bấm vào icon mở dropdown có ô tìm trong danh sách,
// danh sách checkbox các giá trị duy nhất, nút (Chọn tất cả) và 2 nút sắp xếp tăng/giảm.
export default function ExcelColumnFilter({
  options,
  selected,
  onChange,
  sortDir,
  onSort,
  sortLabels = ['Tăng dần', 'Giảm dần'],
  searchPlaceholder = 'Tìm trong danh sách...',
}: ExcelColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const isActive = selected !== null && selected.size < options.length;

  useEffect(() => {
    if (open) {
      setDraft(new Set(selected ?? options.map((o) => o.value)));
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const visibleOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const allVisibleChecked = visibleOptions.length > 0 && visibleOptions.every((o) => draft.has(o.value));

  function toggleAllVisible() {
    setDraft((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) visibleOptions.forEach((o) => next.delete(o.value));
      else visibleOptions.forEach((o) => next.add(o.value));
      return next;
    });
  }

  function toggleOne(value: string) {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function applyFilter() {
    onChange(draft.size === options.length ? null : new Set(draft));
    setOpen(false);
  }

  function clearFilter() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded hover:bg-blue-100 ${
          isActive || sortDir ? 'text-blue-600' : 'text-gray-400'
        }`}
        title="Lọc / Sắp xếp"
      >
        <Filter className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 z-50 mt-1 w-60 rounded border border-gray-200 bg-white text-left shadow-lg"
        >
          <div className="border-b border-gray-100 p-1.5">
            <button
              type="button"
              onClick={() => {
                onSort('asc');
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-blue-50 ${
                sortDir === 'asc' ? 'font-semibold text-blue-600' : 'text-gray-700'
              }`}
            >
              <ArrowUp className="h-3.5 w-3.5" /> {sortLabels[0]}
            </button>
            <button
              type="button"
              onClick={() => {
                onSort('desc');
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-blue-50 ${
                sortDir === 'desc' ? 'font-semibold text-blue-600' : 'text-gray-700'
              }`}
            >
              <ArrowDown className="h-3.5 w-3.5" /> {sortLabels[1]}
            </button>
          </div>

          <div className="border-b border-gray-100 p-1.5">
            <div className="flex items-center gap-1 rounded border border-gray-200 px-1.5 py-1">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto p-1.5">
            <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
              <input type="checkbox" checked={allVisibleChecked} onChange={toggleAllVisible} />
              <span className="font-medium text-gray-700">(Chọn tất cả)</span>
            </label>
            {visibleOptions.length === 0 && <p className="px-2 py-2 text-sm text-gray-400">Không có giá trị phù hợp</p>}
            {visibleOptions.map((o) => (
              <label key={o.value} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={draft.has(o.value)} onChange={() => toggleOne(o.value)} />
                <span className="truncate text-gray-700">{o.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-between gap-2 border-t border-gray-100 p-1.5">
            <button type="button" onClick={clearFilter} className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-50">
              Xoá lọc
            </button>
            <button
              type="button"
              onClick={applyFilter}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
