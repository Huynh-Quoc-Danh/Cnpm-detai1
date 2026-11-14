// Độ dài bản nghe thử (giây) do quản trị cấu hình trong Cài đặt – dùng cho mọi câu chữ hiển thị.
import { useEffect, useState } from 'react';
import { api } from '../services/api';

const DEFAULT_PREVIEW = 30;
let cached: number | null = null;
let pending: Promise<number> | null = null;

function load(): Promise<number> {
  if (cached != null) return Promise.resolve(cached);
  if (!pending) {
    pending = api
      .getConfig()
      .then((c) => {
        const n = Number(c && c.previewSeconds);
        cached = n > 0 ? Math.round(n) : DEFAULT_PREVIEW;
        return cached;
      })
      .catch(() => {
        pending = null; // thử lại lần sau
        return DEFAULT_PREVIEW;
      });
  }
  return pending;
}

/** previewSec của bài đang phát (nếu có) được ưu tiên vì nó là giá trị máy chủ vừa trả về. */
export function usePreviewSeconds(override?: number | null): number {
  const [n, setN] = useState<number>(cached ?? DEFAULT_PREVIEW);
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setN(v));
    return () => {
      alive = false;
    };
  }, []);
  return override && override > 0 ? Math.round(override) : n;
}
