import React, { useEffect, useMemo, useState } from 'react';
import { cx, fmtNum } from '../utils';
import { EmptyState, Skeleton } from './ui';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  /** Giá trị dùng để sắp xếp (bật sắp xếp khi có). */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Ẩn ở màn hình nhỏ */
  hideOnMobile?: boolean;
}

interface ServerPaging {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | null | undefined;
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Tìm kiếm phía client: hàm trả về chuỗi để so khớp. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: React.ReactNode;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  server?: ServerPaging;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  dense?: boolean;
  rowClassName?: (row: T) => string | undefined;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  searchText,
  searchPlaceholder = 'Tìm kiếm…',
  pageSize = 10,
  toolbar,
  empty,
  onRowClick,
  server,
  defaultSort,
  dense,
  rowClassName
}: DataTableProps<T>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(defaultSort || null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = rows || [];
    if (searchText && q.trim()) {
      const nq = norm(q.trim());
      list = list.filter((r) => norm(searchText(r) || '').includes(nq));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const f = col.sortValue;
        list = [...list].sort((a, b) => {
          const va = f(a);
          const vb = f(b);
          if (va === vb) return 0;
          if (va === null || va === undefined) return 1;
          if (vb === null || vb === undefined) return -1;
          const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'vi');
          return sort.dir === 'asc' ? r : -r;
        });
      }
    }
    return list;
  }, [rows, q, sort, columns, searchText]);

  useEffect(() => setPage(1), [q, sort]);

  const total = server ? server.total : filtered.length;
  const curPage = server ? server.page : page;
  const size = server ? server.pageSize : pageSize;
  const pages = Math.max(1, Math.ceil(total / size));
  const visible = server ? filtered : filtered.slice((curPage - 1) * size, curPage * size);
  const goto = (p: number) => {
    const np = Math.min(pages, Math.max(1, p));
    if (server) server.onPage(np);
    else setPage(np);
  };

  useEffect(() => {
    if (!server && page > pages) setPage(pages);
  }, [pages, page, server]);

  const toggleSort = (c: Column<T>) => {
    if (!c.sortValue) return;
    setSort((s) => (s?.key === c.key ? (s.dir === 'asc' ? { key: c.key, dir: 'desc' } : null) : { key: c.key, dir: 'asc' }));
  };

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const cellPad = dense ? 'px-4 py-2.5' : 'px-4 py-3.5';

  return (
    <div className="min-w-0">
      {(searchText || toolbar) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
          {searchText && (
            <div className="relative sm:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-slate-400 hover:text-slate-700" aria-label="Xoá">
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto -mx-5 sm:-mx-6 border-y border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={cx(
                    'px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap first:pl-5 sm:first:pl-6 last:pr-5 sm:last:pr-6',
                    alignCls(c.align),
                    c.sortValue && 'cursor-pointer hover:text-slate-800 select-none',
                    c.hideOnMobile && 'hidden md:table-cell',
                    c.headerClassName
                  )}
                >
                  <span className={cx('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                    {c.header}
                    {c.sortValue && (
                      <i
                        className={cx(
                          'fa-solid text-[9px]',
                          sort?.key === c.key ? (sort.dir === 'asc' ? 'fa-sort-up text-sky-600' : 'fa-sort-down text-sky-600') : 'fa-sort text-slate-300'
                        )}
                      ></i>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !(rows && rows.length)
              ? Array.from({ length: Math.min(size, 6) }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className={cx(cellPad, 'first:pl-5 sm:first:pl-6 last:pr-5 sm:last:pr-6', c.hideOnMobile && 'hidden md:table-cell')}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((r, i) => (
                  <tr
                    key={rowKey(r)}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cx('transition-colors', onRowClick ? 'cursor-pointer hover:bg-sky-50/40' : 'hover:bg-slate-50/60', rowClassName?.(r))}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cx(
                          cellPad,
                          'align-middle first:pl-5 sm:first:pl-6 last:pr-5 sm:last:pr-6',
                          alignCls(c.align),
                          c.hideOnMobile && 'hidden md:table-cell',
                          c.className
                        )}
                      >
                        {c.render ? c.render(r, i) : String((r as any)[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && visible.length === 0 && (empty || <EmptyState icon="fa-magnifying-glass" title="Không có dữ liệu" desc={q ? 'Thử từ khoá khác.' : undefined} compact />)}
      </div>

      {total > size && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 text-xs text-slate-500">
          <span>
            Hiển thị <b className="text-slate-700">{fmtNum((curPage - 1) * size + 1)}</b>–
            <b className="text-slate-700">{fmtNum(Math.min(curPage * size, total))}</b> / {fmtNum(total)}
          </span>
          <div className="flex items-center gap-1">
            <PageBtn onClick={() => goto(1)} disabled={curPage === 1} icon="fa-angles-left" label="Trang đầu" />
            <PageBtn onClick={() => goto(curPage - 1)} disabled={curPage === 1} icon="fa-angle-left" label="Trang trước" />
            {pageWindow(curPage, pages).map((p, i) =>
              p === -1 ? (
                <span key={'e' + i} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goto(p)}
                  className={cx(
                    'min-w-8 h-8 px-2 rounded-lg font-bold transition',
                    p === curPage ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {p}
                </button>
              )
            )}
            <PageBtn onClick={() => goto(curPage + 1)} disabled={curPage === pages} icon="fa-angle-right" label="Trang sau" />
            <PageBtn onClick={() => goto(pages)} disabled={curPage === pages} icon="fa-angles-right" label="Trang cuối" />
          </div>
        </div>
      )}
    </div>
  );
}

const PageBtn: React.FC<{ onClick: () => void; disabled?: boolean; icon: string; label: string }> = ({ onClick, disabled, icon, label }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
  >
    <i className={cx('fa-solid text-[11px]', icon)}></i>
  </button>
);

function pageWindow(cur: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: number[] = [1];
  const start = Math.max(2, cur - 1);
  const end = Math.min(total - 1, cur + 1);
  if (start > 2) out.push(-1);
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push(-1);
  out.push(total);
  return out;
}
