import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from './AdminContext';

interface ResourceOptions {
  /** Tự tải lại mỗi n ms (tạm dừng khi tab bị ẩn). */
  pollMs?: number;
  /** Không tự tải lần đầu. */
  skip?: boolean;
}

export interface Resource<T> {
  data: T | null;
  /** true chỉ ở lần tải đầu tiên (hiển thị skeleton). */
  loading: boolean;
  /** true khi đang tải lại ngầm. */
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  updatedAt: number | null;
}

/** Tải dữ liệu từ adminApi, tự xử lý lỗi/401, hỗ trợ polling và nút "Làm mới" toàn cục. */
export function useResource<T>(loader: () => Promise<T>, deps: React.DependencyList = [], opts: ResourceOptions = {}): Resource<T> {
  const { handleError, refreshKey } = useAdmin();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!opts.skip);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);
  const hasData = useRef(false);
  const silentErrors = useRef(0);

  const run = useCallback(
    async (silent: boolean) => {
      const id = ++seq.current;
      if (!hasData.current) setLoading(true);
      else setRefreshing(true);
      try {
        const r = await loaderRef.current();
        if (id !== seq.current) return;
        setData(r);
        hasData.current = true;
        setError(null);
        setUpdatedAt(Date.now());
        silentErrors.current = 0;
      } catch (e: any) {
        if (id !== seq.current) return;
        setError(e?.message || 'Lỗi tải dữ liệu');
        // Polling ngầm: chỉ báo lỗi lần đầu tiên để tránh spam toast
        if (!silent || e?.status === 401 || silentErrors.current++ === 0) handleError(e);
      } finally {
        if (id === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [handleError]
  );

  const reload = useCallback(() => run(false), [run]);

  useEffect(() => {
    if (opts.skip) return;
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey, opts.skip]);

  useEffect(() => {
    if (!opts.pollMs || opts.skip) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') run(true);
    }, opts.pollMs);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.pollMs, opts.skip, run, ...deps]);

  return { data, loading, refreshing, error, reload, setData, updatedAt };
}

/** Đồng hồ tick để hiển thị "x giây trước". */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Giá trị trễ (ô tìm kiếm). */
export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
