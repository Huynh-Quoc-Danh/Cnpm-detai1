// Tiện ích QR: xác định URL công khai (ngrok / LAN / origin) và tạo liên kết sâu cho từng địa điểm.
import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

export function isLocalHostname(hostname: string = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

export function isLocalUrl(url: string): boolean {
  try {
    return isLocalHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** True for private LAN addresses (192.168.x / 10.x / 172.16–31.x). */
export function isLanUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  } catch {
    return false;
  }
}

function trimSlash(u: string): string {
  return u.replace(/\/+$/, '');
}

export interface BaseUrlInfo {
  baseUrl: string;
  source: 'config' | 'lan' | 'origin';
  lanUrls: string[];
  /** Origin the browser is currently on. */
  origin: string;
}

let cache: { at: number; info: Promise<BaseUrlInfo> } | null = null;

/** Như getPublicBaseUrl nhưng trả thêm nguồn và danh sách LAN (cache 30 giây). */
export function getBaseUrlInfo(force = false): Promise<BaseUrlInfo> {
  if (!force && cache && Date.now() - cache.at < 30_000) return cache.info;
  const origin = trimSlash(window.location.origin);
  const info = (async (): Promise<BaseUrlInfo> => {
    let lanUrls: string[] = [];
    let configured: string | null = null;
    try {
      const cfg = await api.getConfig();
      configured = cfg.publicBaseUrl ? trimSlash(cfg.publicBaseUrl) : null;
    } catch {
      /* offline */
    }
    const local = isLocalHostname(window.location.hostname);
    if (local || !configured) {
      try {
        const net = await api.getNetwork();
        lanUrls = (net.lanUrls || []).map(trimSlash);
      } catch {
        /* ignore */
      }
    }
    // Giữ cổng hiện tại của trình duyệt cho URL LAN
    const port = window.location.port;
    lanUrls = lanUrls.map((u) => {
      try {
        const x = new URL(u);
        if (port) x.port = port;
        return trimSlash(x.toString());
      } catch {
        return u;
      }
    });
    if (configured) return { baseUrl: configured, source: 'config', lanUrls, origin };
    if (local && lanUrls.length) return { baseUrl: lanUrls[0], source: 'lan', lanUrls, origin };
    return { baseUrl: origin, source: 'origin', lanUrls, origin };
  })();
  cache = { at: Date.now(), info };
  info.catch(() => {
    cache = null;
  });
  return info;
}

/** config.publicBaseUrl || (localhost → LAN URL đầu tiên) || location.origin */
export async function getPublicBaseUrl(): Promise<string> {
  try {
    return (await getBaseUrlInfo()).baseUrl;
  } catch {
    return trimSlash(window.location.origin);
  }
}

export function siteQrUrl(base: string, siteId: number): string {
  return `${trimSlash(base)}/?site=${siteId}&src=qr`;
}

export function appQrUrl(base: string): string {
  return `${trimSlash(base)}/?src=app`;
}

export function payUrl(base: string, orderId: string): string {
  return `${trimSlash(base)}/pay/${encodeURIComponent(orderId)}`;
}

/** Sao chép văn bản (fallback execCommand cho HTTP không bảo mật qua LAN). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Tải một data URL về máy. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface BaseUrlOption {
  url: string;
  kind: 'config' | 'lan' | 'origin';
}

/** Hook: URL gốc dùng cho QR + danh sách lựa chọn (ngrok / LAN / origin) để người dùng chọn. */
export function useBaseUrl(enabled = true) {
  const [info, setInfo] = useState<BaseUrlInfo | null>(null);
  const [override, setOverride] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getBaseUrlInfo(true)
      .then((i) => alive && setInfo(i))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);
  const options = useMemo<BaseUrlOption[]>(() => {
    if (!info) return [];
    const list: BaseUrlOption[] = [];
    const push = (url: string, kind: BaseUrlOption['kind']) => {
      if (url && !list.some((o) => o.url === url)) list.push({ url, kind });
    };
    if (info.source === 'config') push(info.baseUrl, 'config');
    info.lanUrls.forEach((u) => push(u, 'lan'));
    push(info.origin, 'origin');
    return list;
  }, [info]);
  const baseUrl = override || (info ? info.baseUrl : trimSlash(window.location.origin));
  const kind: BaseUrlOption['kind'] =
    options.find((o) => o.url === baseUrl)?.kind || (info ? info.source : 'origin');
  return {
    info,
    loading: !info,
    baseUrl,
    kind,
    options,
    setBaseUrl: setOverride,
    /** QR trỏ tới localhost: điện thoại sẽ không mở được. */
    isLocal: isLocalUrl(baseUrl),
    isLan: isLanUrl(baseUrl)
  };
}
