// Mô phỏng hành trình tàu: nội suy mượt vị trí thuyền dọc tuyến (cập nhật ~100ms), dừng ngắn tại mỗi điểm.
import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineMeters, type LatLng } from '../../services/geo';

export type CruiseStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface CruiseState {
  status: CruiseStatus;
  pos: LatLng | null;
  heading: number;
  /** 0..1 */
  progress: number;
  /** index of the waypoint the boat is heading to */
  nextIndex: number;
  dwelling: boolean;
  speedFactor: number;
}

const TICK_MS = 100;
const DWELL_MS = 4000;

function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const INITIAL: CruiseState = {
  status: 'idle',
  pos: null,
  heading: 0,
  progress: 0,
  nextIndex: 0,
  dwelling: false,
  speedFactor: 1
};

export function useCruise() {
  const [state, setState] = useState<CruiseState>(INITIAL);
  const ref = useRef({
    path: [] as LatLng[],
    legs: [] as number[],
    total: 0,
    travelled: 0,
    dwellUntil: 0,
    lastWaypoint: -1,
    baseSpeed: 100,
    speedFactor: 1,
    timer: null as ReturnType<typeof setInterval> | null,
    last: 0
  });

  const clear = () => {
    const r = ref.current;
    if (r.timer) clearInterval(r.timer);
    r.timer = null;
  };

  const compute = useCallback((): Omit<CruiseState, 'status' | 'speedFactor'> => {
    const r = ref.current;
    let d = r.travelled;
    for (let i = 0; i < r.legs.length; i++) {
      const len = r.legs[i];
      if (d <= len || i === r.legs.length - 1) {
        const a = r.path[i];
        const b = r.path[i + 1];
        const t = len > 0 ? Math.min(1, d / len) : 1;
        return {
          pos: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
          heading: bearing(a, b),
          progress: r.total > 0 ? r.travelled / r.total : 1,
          nextIndex: i + 1,
          dwelling: Date.now() < r.dwellUntil
        };
      }
      d -= len;
    }
    const p = r.path[r.path.length - 1] || null;
    return { pos: p, heading: 0, progress: 1, nextIndex: r.path.length - 1, dwelling: false };
  }, []);

  const tick = useCallback(() => {
    const r = ref.current;
    const now = Date.now();
    const dt = Math.min(500, now - r.last) / 1000;
    r.last = now;
    if (now >= r.dwellUntil) {
      const next = r.travelled + r.baseSpeed * r.speedFactor * dt;
      const wp = r.lastWaypoint + 1; // mốc kế tiếp
      const cumAtWp = r.legs.slice(0, wp).reduce((x, y) => x + y, 0);
      if (wp < r.path.length - 1 && next >= cumAtWp) {
        // tới một điểm tham quan trung gian: dừng ngắn
        r.travelled = cumAtWp;
        r.lastWaypoint = wp;
        r.dwellUntil = now + DWELL_MS / Math.max(1, r.speedFactor / 2);
      } else {
        r.travelled = Math.min(next, r.total);
      }
    }
    const c = compute();
    const finished = r.travelled >= r.total - 0.01;
    if (finished) clear();
    setState((s) => ({ ...s, ...c, status: finished ? 'finished' : s.status }));
  }, [compute]);

  const startTimer = useCallback(() => {
    clear();
    ref.current.last = Date.now();
    ref.current.timer = setInterval(tick, TICK_MS);
  }, [tick]);

  const start = useCallback(
    (path: LatLng[]) => {
      const pts = path.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (pts.length < 2) return;
      const r = ref.current;
      r.path = pts;
      r.legs = pts.slice(1).map((p, i) => haversineMeters(pts[i], p));
      r.total = r.legs.reduce((a, b) => a + b, 0);
      // cả tuyến ~75 giây ở tốc độ x1 (tối thiểu 60 m/s)
      r.baseSpeed = Math.max(60, r.total / 75);
      r.travelled = 0;
      r.lastWaypoint = 0;
      r.dwellUntil = Date.now() + 1500;
      setState({
        ...INITIAL,
        status: 'running',
        speedFactor: r.speedFactor,
        pos: pts[0],
        heading: bearing(pts[0], pts[1]),
        nextIndex: 1,
        dwelling: true
      });
      startTimer();
    },
    [startTimer]
  );

  const pause = useCallback(() => {
    clear();
    setState((s) => (s.status === 'running' ? { ...s, status: 'paused' } : s));
  }, []);

  const resume = useCallback(() => {
    setState((s) => {
      if (s.status !== 'paused') return s;
      startTimer();
      return { ...s, status: 'running' };
    });
  }, [startTimer]);

  const stop = useCallback(() => {
    clear();
    setState((s) => ({ ...INITIAL, speedFactor: s.speedFactor }));
  }, []);

  const setSpeed = useCallback((f: number) => {
    ref.current.speedFactor = f;
    setState((s) => ({ ...s, speedFactor: f }));
  }, []);

  useEffect(() => () => clear(), []);

  return { state, start, pause, resume, stop, setSpeed };
}
