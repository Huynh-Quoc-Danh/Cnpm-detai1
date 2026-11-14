// Hook định vị GPS thật: bọc navigator.geolocation.watchPosition, phát hiện ngữ cảnh không an toàn (HTTP).
import { useCallback, useEffect, useRef, useState } from 'react';

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export type GeoStatus = 'idle' | 'prompt' | 'watching' | 'denied' | 'unavailable' | 'insecure';

export interface UseGeolocationResult {
  coords: GeoCoords | null;
  status: GeoStatus;
  error: string | null;
  /** true khi trình duyệt hỗ trợ và trang chạy trên HTTPS/localhost */
  supported: boolean;
  start: () => void;
  stop: () => void;
}

function isLocalHost(h: string) {
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

function detectInitialStatus(): GeoStatus {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unavailable';
  const secure =
    (typeof window !== 'undefined' && window.isSecureContext) ||
    (typeof location !== 'undefined' && isLocalHost(location.hostname));
  return secure ? 'idle' : 'insecure';
}

export function useGeolocation(opts: { autoStartIfGranted?: boolean } = {}): UseGeolocationResult {
  const { autoStartIfGranted = true } = opts;
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [status, setStatus] = useState<GeoStatus>(detectInitialStatus);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const supported = status !== 'unavailable' && status !== 'insecure';

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        /* ignore */
      }
      watchIdRef.current = null;
    }
    setStatus((s) => (s === 'watching' || s === 'prompt' ? 'idle' : s));
  }, []);

  const start = useCallback(() => {
    const initial = detectInitialStatus();
    if (initial === 'unavailable' || initial === 'insecure') {
      setStatus(initial);
      setError(
        initial === 'insecure'
          ? 'GPS chỉ hoạt động trên HTTPS (ví dụ đường link ngrok https://…) hoặc localhost.'
          : 'Thiết bị/trình duyệt không hỗ trợ định vị.'
      );
      return;
    }
    if (watchIdRef.current !== null) return;
    setError(null);
    setStatus('prompt');
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: Number.isFinite(pos.coords.heading as number) ? pos.coords.heading : null,
            speed: Number.isFinite(pos.coords.speed as number) ? pos.coords.speed : null,
            timestamp: pos.timestamp
          });
          setStatus('watching');
          setError(null);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('denied');
            setError('Quyền truy cập vị trí đã bị từ chối.');
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setError('Không xác định được vị trí (mất tín hiệu GPS).');
          } else {
            setError('Hết thời gian chờ tín hiệu GPS, đang thử lại…');
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
    } catch (e) {
      setStatus('unavailable');
      setError(String((e as Error)?.message || e));
    }
  }, []);

  // Tự bật nếu người dùng đã cấp quyền trước đó
  useEffect(() => {
    if (!autoStartIfGranted || detectInitialStatus() !== 'idle') return;
    let cancelled = false;
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!perms?.query) return;
    perms
      .query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (cancelled) return;
        if (p.state === 'granted') start();
        else if (p.state === 'denied') setStatus('denied');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [autoStartIfGranted, start]);

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  return { coords, status, error, supported, start, stop };
}
